import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { storageFileUrl } from '@/api/config';
import {
  fetchSectionLessons,
  resetLessonProgress,
  studentKeys,
  updateLessonProgress,
} from '@/api/student';
import { AsyncPanel } from '@/components/AsyncPanel';
import { LessonVideoPlayer, type LessonVideoPlayerHandle } from '@/components/LessonVideoPlayer';
import { ProgressBar } from '@/components/ProgressBar';
import { useLocale } from '@/i18n/LocaleContext';
import { lessonTypeLabel } from '@/utils/lessonType';
import { resolveVideoSource } from '@/utils/videoSource';
import type { LessonSummary, SectionLessonsResponse } from '@/types/student';

function findLesson(
  modules: { lessons: LessonSummary[] }[] | undefined,
  lessonId: number,
): LessonSummary | undefined {
  if (!modules) return undefined;
  for (const mod of modules) {
    const found = mod.lessons.find((l) => l.id === lessonId);
    if (found) return found;
  }
  return undefined;
}

export function LessonViewerPage() {
  const { sectionId, lessonId } = useParams<{ sectionId: string; lessonId: string }>();
  const sid = Number(sectionId);
  const lid = Number(lessonId);
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [liveProgressPct, setLiveProgressPct] = useState<number | null>(null);
  const [playerResetKey, setPlayerResetKey] = useState(0);
  const videoPlayerRef = useRef<LessonVideoPlayerHandle>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: studentKeys.sectionLessons(sid),
    queryFn: () => fetchSectionLessons(sid),
    enabled: Number.isFinite(sid) && sid > 0,
  });

  const lesson = useMemo(
    () => findLesson(data?.modules, lid),
    [data?.modules, lid],
  );

  useEffect(() => {
    setLiveProgressPct(null);
    setPlayerResetKey(0);
  }, [lid]);

  const applyProgressToCache = useCallback(
    (response: {
      progress: {
        seconds_spent: number;
        progress_pct: number;
        completed_at: string | null;
      };
    }) => {
      queryClient.setQueryData<SectionLessonsResponse>(
        studentKeys.sectionLessons(sid),
        (old) => {
          if (!old) return old;
          return {
            modules: old.modules.map((mod) => ({
              ...mod,
              lessons: mod.lessons.map((l) =>
                l.id === lid
                  ? {
                      ...l,
                      progress: {
                        seconds_spent: response.progress.seconds_spent,
                        progress_pct: response.progress.progress_pct,
                        completed_at: response.progress.completed_at,
                        last_accessed: l.progress?.last_accessed ?? null,
                      },
                    }
                  : l,
              ),
            })),
          };
        },
      );
      void queryClient.invalidateQueries({ queryKey: studentKeys.courses() });
    },
    [queryClient, sid, lid],
  );

  const progressMutation = useMutation({
    mutationFn: (payload: { seconds_spent?: number; progress_pct?: number }) =>
      updateLessonProgress(lid, payload),
    onSuccess: (response) => {
      setSaveError(null);
      applyProgressToCache(response);
    },
    onError: (err: Error) => {
      setSaveError(
        err instanceof ApiError ? err.serverMessage ?? err.message : t('networkError'),
      );
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => resetLessonProgress(lid),
    onSuccess: (response) => {
      setSaveError(null);
      setLiveProgressPct(0);
      setPlayerResetKey((k) => k + 1);
      applyProgressToCache(response);
    },
    onError: (err: Error) => {
      setSaveError(
        err instanceof ApiError ? err.serverMessage ?? err.message : t('networkError'),
      );
    },
  });

  const mutateRef = useRef(progressMutation.mutate);
  mutateRef.current = progressMutation.mutate;

  const saveProgress = useCallback(
    (payload: { seconds_spent?: number; progress_pct?: number }) => {
      mutateRef.current(payload);
    },
    [],
  );

  const handleVideoProgress = useCallback(
    (payload: { seconds_spent?: number; progress_pct?: number }) => {
      if (payload.progress_pct !== undefined) {
        setLiveProgressPct(payload.progress_pct);
      }
      saveProgress(payload);
    },
    [saveProgress],
  );

  const isCompleteRef = useRef(false);
  isCompleteRef.current = (liveProgressPct ?? lesson?.progress?.progress_pct ?? 0) >= 100;

  const handleVideoProgressStable = useCallback(
    (payload: { seconds_spent?: number; progress_pct?: number }) => {
      if (
        isCompleteRef.current &&
        payload.progress_pct !== undefined &&
        payload.progress_pct < 100
      ) {
        return;
      }
      handleVideoProgress(payload);
    },
    [handleVideoProgress],
  );

  const videoProgressHandlerRef = useRef(handleVideoProgressStable);
  videoProgressHandlerRef.current = handleVideoProgressStable;

  const stableVideoProgress = useCallback(
    (payload: { seconds_spent?: number }) => {
      videoProgressHandlerRef.current(payload);
    },
    [],
  );

  const handleMarkComplete = useCallback(() => {
    if (lesson?.type === 'video') {
      setLiveProgressPct(100);
      isCompleteRef.current = true;
      videoPlayerRef.current?.markComplete();
      saveProgress({
        progress_pct: 100,
        ...(lesson.duration_seconds ? { seconds_spent: lesson.duration_seconds } : {}),
      });
      return;
    }
    saveProgress({ progress_pct: 100 });
  }, [lesson?.type, lesson?.duration_seconds, saveProgress]);

  const displayProgressPct =
    liveProgressPct ?? lesson?.progress?.progress_pct ?? 0;

  const isComplete = displayProgressPct >= 100;
  const isBusy = progressMutation.isPending || resetMutation.isPending;

  return (
    <div className="space-y-4">
      <Link
        to={`/student/sections/${sid}`}
        className="text-sm text-ink/50 transition hover:text-brass"
      >
        ← {t('backToLessons')}
      </Link>

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && !lesson}
        emptyMessage={t('lessonNotFound')}
      >
        {lesson && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
            <article className="border border-ink/10 bg-white">
              <header className="border-b border-ink/10 px-5 py-4">
                <p className="font-mono text-xs uppercase text-ink/40">
                  {t(lessonTypeLabel(lesson.type))}
                </p>
                <h1 className="mt-1 text-lg font-semibold text-ink">{lesson.title}</h1>
                <div className="mt-3 max-w-md">
                  <ProgressBar value={displayProgressPct} size="sm" />
                </div>
              </header>

              <div className="px-5 py-6">
                <LessonContent
                  lesson={lesson}
                  lessonId={lid}
                  playerResetKey={playerResetKey}
                  videoPlayerRef={videoPlayerRef}
                  onProgress={lesson.type === 'video' ? stableVideoProgress : saveProgress}
                />
              </div>

              <footer className="flex flex-wrap items-center gap-3 border-t border-ink/10 px-5 py-4">
                {!isComplete && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handleMarkComplete}
                    className="bg-brass px-4 py-2 text-sm text-white transition hover:bg-brass-hover disabled:opacity-60"
                  >
                    {progressMutation.isPending ? t('saving') : t('markComplete')}
                  </button>
                )}
                {isComplete && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => resetMutation.mutate()}
                    className="border border-ink/20 px-4 py-2 text-sm text-ink transition hover:border-brass hover:text-brass disabled:opacity-60"
                  >
                    {resetMutation.isPending ? t('resettingProgress') : t('resetProgress')}
                  </button>
                )}
                {saveError && (
                  <p className="text-xs text-brick" role="alert">
                    {saveError}
                  </p>
                )}
              </footer>
            </article>

            <aside className="hidden lg:block">
              <LessonSidebar modules={data?.modules ?? []} sectionId={sid} currentId={lid} />
            </aside>
          </div>
        )}
      </AsyncPanel>
    </div>
  );
}

function LessonContent({
  lesson,
  lessonId,
  playerResetKey,
  videoPlayerRef,
  onProgress,
}: {
  lesson: LessonSummary;
  lessonId: number;
  playerResetKey: number;
  videoPlayerRef: RefObject<LessonVideoPlayerHandle>;
  onProgress: (payload: { seconds_spent?: number; progress_pct?: number }) => void;
}) {
  const { t } = useLocale();

  switch (lesson.type) {
    case 'video': {
      const playable = lesson.url ? resolveVideoSource(lesson.url) : null;
      return playable && lesson.url ? (
        <LessonVideoPlayer
          ref={videoPlayerRef}
          key={`${lessonId}-${playerResetKey}`}
          lessonId={lessonId}
          videoUrl={lesson.url}
          duration={lesson.duration_seconds}
          initialPositionSeconds={lesson.progress?.seconds_spent ?? 0}
          onProgress={onProgress}
        />
      ) : (
        <p className="text-sm text-ink/60">
          {lesson.url ? (
            <>
              {t('unsupportedLessonType')}{' '}
              <a href={lesson.url} target="_blank" rel="noreferrer" className="text-brass underline">
                {t('openExternal')}
              </a>
            </>
          ) : (
            t('noVideoUrl')
          )}
        </p>
      );
    }
    case 'text':
      return lesson.body ? (
        <div
          className="prose prose-sm max-w-none text-ink/85 [&_h2]:text-ink [&_p]:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: lesson.body }}
        />
      ) : (
        <p className="text-sm text-ink/50">{t('noContent')}</p>
      );
    case 'pdf':
    case 'download':
      return (
        <div className="space-y-3">
          {lesson.file_path && (
            <a
              href={storageFileUrl(lesson.file_path)}
              target="_blank"
              rel="noreferrer"
              className="inline-block border border-ink/20 px-4 py-2 text-sm text-ink transition hover:border-brass hover:text-brass"
            >
              {t('openPdf')}
            </a>
          )}
          {lesson.url && (
            <a
              href={lesson.url}
              target="_blank"
              rel="noreferrer"
              className="block text-sm text-brass underline"
            >
              {t('openExternal')}
            </a>
          )}
          {!lesson.file_path && !lesson.url && (
            <p className="text-sm text-ink/50">{t('noContent')}</p>
          )}
        </div>
      );
    case 'link':
      return lesson.url ? (
        <div className="space-y-4">
          <p className="text-sm text-ink/60">{t('linkLessonHint')}</p>
          <a
            href={lesson.url}
            target="_blank"
            rel="noreferrer"
            className="inline-block bg-ink px-4 py-2 text-sm text-white transition hover:bg-ink/90"
          >
            {t('openLink')}
          </a>
        </div>
      ) : (
        <p className="text-sm text-ink/50">{t('noContent')}</p>
      );
    default:
      return <p className="text-sm text-ink/50">{t('unsupportedLessonType')}</p>;
  }
}

function LessonSidebar({
  modules,
  sectionId,
  currentId,
}: {
  modules: { id: number; title: string; lessons: LessonSummary[] }[];
  sectionId: number;
  currentId: number;
}) {
  const { t } = useLocale();

  return (
    <nav className="border border-ink/10 bg-white p-3 text-sm">
      <p className="mb-2 text-xs text-ink/45">{t('inThisSection')}</p>
      {modules.map((mod) => (
        <div key={mod.id} className="mb-3">
          <p className="truncate text-xs font-medium text-ink/55">{mod.title}</p>
          <ul className="mt-1 space-y-0.5">
            {mod.lessons.map((l) => (
              <li key={l.id}>
                <Link
                  to={`/student/sections/${sectionId}/lessons/${l.id}`}
                  className={`block truncate px-2 py-1 text-xs ${
                    l.id === currentId
                      ? 'bg-brass/15 font-medium text-ink'
                      : 'text-ink/55 hover:bg-paper'
                  }`}
                >
                  {l.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
