import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type MutableRefObject,
} from 'react';
import { resolveVideoSource } from '@/utils/videoSource';
import {
  loadYouTubeIframeApi,
  YOUTUBE_POLL_INTERVAL_MS,
  YOUTUBE_RESUME_THRESHOLD_SECONDS,
  type YouTubePlayerInstance,
} from '@/utils/youtubeApi';

export interface VideoProgressPayload {
  /** Current playback position in seconds (floor). */
  seconds_spent: number;
  progress_pct: number;
}

export interface LessonVideoPlayerHandle {
  /** Seek to end and save 100% progress. */
  markComplete: () => void;
  /** Resume position tracking after a progress reset. */
  unlockTracking: () => void;
}

interface LessonVideoPlayerProps {
  lessonId: number;
  videoUrl: string;
  duration: number | null;
  /** Last saved playback position from the server — used to resume. */
  initialPositionSeconds: number;
  onProgress: (payload: VideoProgressPayload) => void;
}

function positionToPct(currentTime: number, durationSeconds: number | null): number {
  if (!durationSeconds || durationSeconds <= 0) return 0;
  return Math.min(100, Math.round((Math.max(0, currentTime) / durationSeconds) * 100));
}

/** Progress = current position ÷ duration. Updates on play, seek, and pause. */
function usePositionProgress(
  lessonId: number,
  fallbackDuration: number | null,
  onProgress: (payload: VideoProgressPayload) => void,
  saveIntervalMs: number,
) {
  const onProgressRef = useRef(onProgress);
  const durationRef = useRef(fallbackDuration);
  const lastSaveRef = useRef(0);
  const lastSampleRef = useRef<number | null>(null);
  const lockedAtCompleteRef = useRef(false);

  onProgressRef.current = onProgress;
  durationRef.current = fallbackDuration;

  const reportPositionRef = useRef(
    (currentTime: number, durationOverride?: number, forceSave = false) => {
      if (lockedAtCompleteRef.current) return;
      const duration = durationOverride ?? durationRef.current;
      if (durationOverride && durationOverride > 0) {
        durationRef.current = durationOverride;
      }

      const position = Math.floor(Math.max(0, currentTime));
      const pct = positionToPct(currentTime, duration);

      const jumped =
        lastSampleRef.current !== null &&
        Math.abs(currentTime - lastSampleRef.current) > 2;
      lastSampleRef.current = currentTime;

      const due =
        forceSave || jumped || Date.now() - lastSaveRef.current >= saveIntervalMs;

      if (due) {
        lastSaveRef.current = Date.now();
        onProgressRef.current({ seconds_spent: position, progress_pct: pct });
      }
    },
  );

  reportPositionRef.current = (currentTime, durationOverride, forceSave = false) => {
    if (lockedAtCompleteRef.current) return;
    const duration = durationOverride ?? durationRef.current;
    if (durationOverride && durationOverride > 0) {
      durationRef.current = durationOverride;
    }

    const position = Math.floor(Math.max(0, currentTime));
    const pct = positionToPct(currentTime, duration);

    const jumped =
      lastSampleRef.current !== null &&
      Math.abs(currentTime - lastSampleRef.current) > 2;
    lastSampleRef.current = currentTime;

    const due =
      forceSave || jumped || Date.now() - lastSaveRef.current >= saveIntervalMs;

    if (due) {
      lastSaveRef.current = Date.now();
      onProgressRef.current({ seconds_spent: position, progress_pct: pct });
    }
  };

  const flushRef = useRef((currentTime: number, durationOverride?: number) => {
    if (lockedAtCompleteRef.current) return;
    const duration = durationOverride ?? durationRef.current;
    const position = Math.floor(Math.max(0, currentTime));
    onProgressRef.current({
      seconds_spent: position,
      progress_pct: positionToPct(currentTime, duration),
    });
  });

  flushRef.current = (currentTime, durationOverride) => {
    if (lockedAtCompleteRef.current) return;
    const duration = durationOverride ?? durationRef.current;
    const position = Math.floor(Math.max(0, currentTime));
    onProgressRef.current({
      seconds_spent: position,
      progress_pct: positionToPct(currentTime, duration),
    });
  };

  const markCompleteRef = useRef((currentTime: number, durationOverride?: number) => {
    const duration = durationOverride ?? durationRef.current;
    const end = duration && duration > 0 ? duration : currentTime;
    onProgressRef.current({
      seconds_spent: Math.floor(end),
      progress_pct: 100,
    });
  });

  markCompleteRef.current = (currentTime, durationOverride) => {
    lockedAtCompleteRef.current = true;
    const duration = durationOverride ?? durationRef.current;
    const end = duration && duration > 0 ? duration : Math.max(0, currentTime);
    onProgressRef.current({
      seconds_spent: Math.floor(end),
      progress_pct: 100,
    });
  };

  const unlockTrackingRef = useRef(() => {
    lockedAtCompleteRef.current = false;
  });

  unlockTrackingRef.current = () => {
    lockedAtCompleteRef.current = false;
  };

  useEffect(() => {
    lastSaveRef.current = 0;
    lastSampleRef.current = null;
    lockedAtCompleteRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  return { reportPositionRef, flushRef, durationRef, markCompleteRef, unlockTrackingRef, lockedAtCompleteRef };
}

export const LessonVideoPlayer = forwardRef<LessonVideoPlayerHandle, LessonVideoPlayerProps>(
  function LessonVideoPlayer(
    { lessonId, videoUrl, duration, initialPositionSeconds, onProgress },
    ref,
  ) {
    const source = resolveVideoSource(videoUrl);
    const completeActionRef = useRef<(() => void) | null>(null);

    const saveIntervalMs =
      source?.kind === 'youtube' ? YOUTUBE_POLL_INTERVAL_MS : 2_000;

    const { reportPositionRef, flushRef, durationRef, markCompleteRef, unlockTrackingRef } =
      usePositionProgress(lessonId, duration, onProgress, saveIntervalMs);

    useImperativeHandle(ref, () => ({
      markComplete: () => {
        if (completeActionRef.current) {
          completeActionRef.current();
          return;
        }
        markCompleteRef.current(0, duration ?? undefined);
      },
      unlockTracking: () => {
        unlockTrackingRef.current();
      },
    }));

    if (!source) return null;

    if (source.kind === 'html5') {
      return (
        <Html5Player
          src={source.src}
          duration={duration}
          resumeSeconds={initialPositionSeconds}
          reportPositionRef={reportPositionRef}
          flushRef={flushRef}
          markCompleteRef={markCompleteRef}
          completeActionRef={completeActionRef}
        />
      );
    }

    return (
      <YouTubeIframePlayer
        lessonId={lessonId}
        videoId={source.videoId}
        resumeSeconds={initialPositionSeconds}
        reportPositionRef={reportPositionRef}
        flushRef={flushRef}
        durationRef={durationRef}
        markCompleteRef={markCompleteRef}
        completeActionRef={completeActionRef}
      />
    );
  },
);

function Html5Player({
  src,
  duration,
  resumeSeconds,
  reportPositionRef,
  flushRef,
  markCompleteRef,
  completeActionRef,
}: {
  src: string;
  duration: number | null;
  resumeSeconds: number;
  reportPositionRef: MutableRefObject<
    (t: number, durationOverride?: number, forceSave?: boolean) => void
  >;
  flushRef: MutableRefObject<(t: number, durationOverride?: number) => void>;
  markCompleteRef: MutableRefObject<(t: number, durationOverride?: number) => void>;
  completeActionRef: MutableRefObject<(() => void) | null>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const resumeSecondsRef = useRef(resumeSeconds);
  resumeSecondsRef.current = resumeSeconds;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const effectiveDuration = () =>
      Number.isFinite(video.duration) && video.duration > 0
        ? video.duration
        : duration ?? null;

    completeActionRef.current = () => {
      const d = effectiveDuration();
      markCompleteRef.current(d ?? video.currentTime, d ?? undefined);
      if (d && Number.isFinite(d)) {
        video.currentTime = d;
      }
    };

    const sample = (force = false) => {
      reportPositionRef.current(video.currentTime, effectiveDuration() ?? undefined, force);
    };

    const onPause = () => {
      sample(true);
      flushRef.current(video.currentTime, effectiveDuration() ?? undefined);
    };

    const seekToResume = () => {
      const pos = resumeSecondsRef.current;
      if (pos > YOUTUBE_RESUME_THRESHOLD_SECONDS && Number.isFinite(video.duration)) {
        video.currentTime = Math.min(pos, video.duration);
      }
    };

    video.addEventListener('timeupdate', () => sample(false));
    video.addEventListener('seeked', () => sample(true));
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onPause);
    video.addEventListener('loadedmetadata', seekToResume);

    if (video.readyState >= 1) seekToResume();

    return () => {
      completeActionRef.current = null;
      flushRef.current(video.currentTime, effectiveDuration() ?? undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  return (
    <div className="aspect-video w-full bg-ink/5">
      <video
        ref={videoRef}
        src={src}
        controls
        className="h-full w-full"
        preload="metadata"
        {...(duration ? { 'aria-label': `Video lesson, ${duration} seconds` } : {})}
      />
    </div>
  );
}

function YouTubeIframePlayer({
  lessonId,
  videoId,
  resumeSeconds,
  reportPositionRef,
  flushRef,
  durationRef,
  markCompleteRef,
  completeActionRef,
}: {
  lessonId: number;
  videoId: string;
  resumeSeconds: number;
  reportPositionRef: MutableRefObject<
    (t: number, durationOverride?: number, forceSave?: boolean) => void
  >;
  flushRef: MutableRefObject<(t: number, durationOverride?: number) => void>;
  durationRef: MutableRefObject<number | null>;
  markCompleteRef: MutableRefObject<(t: number, durationOverride?: number) => void>;
  completeActionRef: MutableRefObject<(() => void) | null>;
}) {
  const containerId = `yt-player-${lessonId}`;
  const playerRef = useRef<YouTubePlayerInstance | null>(null);
  const pollRef = useRef<number | null>(null);
  const hasSeekedRef = useRef(false);
  const playerStateRef = useRef<number | null>(null);
  const resumeSecondsRef = useRef(resumeSeconds);
  resumeSecondsRef.current = resumeSeconds;

  const clearPoll = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const sample = (forceSave = false) => {
    const player = playerRef.current;
    if (!player) return;
    const embedDuration = player.getDuration();
    const dur = embedDuration > 0 ? embedDuration : durationRef.current ?? undefined;
    let current = player.getCurrentTime();
    const YT = window.YT;
    if (dur && dur > 0 && current < 2 && playerStateRef.current === YT?.PlayerState.ENDED) {
      current = dur;
    }
    reportPositionRef.current(current, dur, forceSave);
  };

  const startPoll = () => {
    clearPoll();
    sample(false);
    pollRef.current = window.setInterval(() => sample(false), YOUTUBE_POLL_INTERVAL_MS);
  };

  useEffect(() => {
    let cancelled = false;

    completeActionRef.current = () => {
      clearPoll();
      const player = playerRef.current;
      if (!player) {
        markCompleteRef.current(0, durationRef.current ?? undefined);
        return;
      }
      const embedDuration = player.getDuration();
      const dur = embedDuration > 0 ? embedDuration : durationRef.current ?? undefined;
      const endTime =
        dur && dur > 0
          ? dur
          : player.getCurrentTime() > 0
            ? player.getCurrentTime()
            : durationRef.current ?? 0;
      markCompleteRef.current(endTime, dur);
      if (dur && dur > 0) {
        player.seekTo(dur, true);
      }
    };

    loadYouTubeIframeApi().then(() => {
      if (cancelled || !window.YT?.Player) return;

      hasSeekedRef.current = false;

      new window.YT.Player(containerId, {
        videoId,
        playerVars: {
          enablejsapi: 1,
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: ({ target }) => {
            playerRef.current = target;

            const embedDuration = target.getDuration();
            if (embedDuration > 0) {
              durationRef.current = embedDuration;
            }

            const pos = resumeSecondsRef.current;
            if (pos > YOUTUBE_RESUME_THRESHOLD_SECONDS && !hasSeekedRef.current) {
              hasSeekedRef.current = true;
              target.seekTo(pos, true);
            }

            startPoll();
          },
          onStateChange: ({ data }) => {
            playerStateRef.current = data;
            const YT = window.YT!;
            if (data === YT.PlayerState.PAUSED || data === YT.PlayerState.ENDED) {
              sample(true);
              const player = playerRef.current;
              if (player) {
                const embedDuration = player.getDuration();
                const dur = embedDuration > 0 ? embedDuration : durationRef.current ?? undefined;
                let current = player.getCurrentTime();
                if (dur && dur > 0 && current < 2 && data === YT.PlayerState.ENDED) {
                  current = dur;
                }
                flushRef.current(current, dur);
              }
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      completeActionRef.current = null;
      clearPoll();
      const player = playerRef.current;
      if (player) {
        const embedDuration = player.getDuration();
        flushRef.current(
          player.getCurrentTime(),
          embedDuration > 0 ? embedDuration : undefined,
        );
      }
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, videoId]);

  return (
    <div className="aspect-video w-full bg-ink/5">
      <div id={containerId} className="h-full w-full" title="Lesson video" />
    </div>
  );
}
