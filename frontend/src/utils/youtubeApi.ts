let youtubeApiPromise: Promise<void> | null = null;

export function loadYouTubeIframeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve) => {
    const finish = () => resolve();

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      finish();
    };

    if (window.YT?.Player) {
      finish();
      return;
    }

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return youtubeApiPromise;
}

export type YouTubePlayerInstance = {
  getCurrentTime(): number;
  getDuration(): number;
  getPlaybackRate(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  destroy(): void;
};

type YouTubePlayerOptions = {
  videoId: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: { target: YouTubePlayerInstance }) => void;
    onStateChange?: (event: { data: number; target: YouTubePlayerInstance }) => void;
  };
};

type YouTubePlayerConstructor = new (
  elementId: string,
  options: YouTubePlayerOptions,
) => YouTubePlayerInstance;

declare global {
  interface Window {
    YT?: {
      Player: YouTubePlayerConstructor;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

/** Minimum seconds_spent before seeking on load (avoid seek-to-zero flicker). */
export const YOUTUBE_RESUME_THRESHOLD_SECONDS = 3;

/** Poll getCurrentTime while PLAYING; YouTube has no timeupdate event. */
export const YOUTUBE_POLL_INTERVAL_MS = 2_000;
