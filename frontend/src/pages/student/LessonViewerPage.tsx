import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import {
  fetchSectionLessons,
  studentKeys,
  updateLessonProgress,
} from '@/api/student';
import { AsyncPanel } from '@/components/AsyncPanel';
import { ProgressBar } from '@/components/ProgressBar';
import { useLocale } from '@/i18n/LocaleContext';
import { lessonTypeLabel } from '@/utils/lessonType';
import type { LessonSummary } from '@/types/student';

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

function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
    }
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
  } catch {
    return null;
  }
  return null;
}

export function LessonViewerPage() {
  const { sectionId, lessonId } = useParams<{ sectionId: string; lessonId: string }>();
  const sid = Number(sectionId);
  const lid = Number(lessonId);
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: studentKeys.sectionLessons(sid),
    queryFn: () => fetchSectionLessons(sid),
    enabled: Number.isFinite(sid) && sid > 0,
  });

  const lesson = useMemo(
    () => findLesson(data?.modules, lid),
    [data?.modules, lid],
  );

  const progressMutation = useMutation({
    mutationFn: (payload: { progress_pct: number; seconds_spent?: number }) =>
      updateLessonProgress(lid, payload),
    onSuccess: () => {
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: studentKeys.sectionLessons(sid) });
      queryClient.invalidateQueries({ queryKey: studentKeys.courses() });
    },
    onError: (err: Error) => {
      setSaveError(
        err instanceof ApiError ? err.serverMessage ?? err.message : t('networkError'),
      );
    },
  });

  const saveProgress = useCallback(
    (progress_pct: number, seconds_spent?: number) => {
      progressMutation.mutate({ progress_pct, seconds_spent });
    },
    [progressMutation],
  );

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
                  <ProgressBar value={lesson.progress?.progress_pct ?? 0} size="sm" />
                </div>
              </header>

              <div className="px-5 py-6">
                <LessonContent lesson={lesson} onProgress={saveProgress} />
              </div>

              <footer className="flex flex-wrap items-center gap-3 border-t border-ink/10 px-5 py-4">
                <button
                  type="button"
                  disabled={progressMutation.isPending}
                  onClick={() => saveProgress(100, lesson.progress?.seconds_spent ?? 0)}
                  className="bg-brass px-4 py-2 text-sm text-white transition hover:bg-brass-hover disabled:opacity-60"
                >
                  {progressMutation.isPending ? t('saving') : t('markComplete')}
                </button>
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
  onProgress,
}: {
  lesson: LessonSummary;
  onProgress: (pct: number, seconds?: number) => void;
}) {
  const { t } = useLocale();

  switch (lesson.type) {
    case 'video': {
      const embed = lesson.url ? youtubeEmbedUrl(lesson.url) : null;
      return embed ? (
        <VideoPlayer
          embedUrl={embed}
          duration={lesson.duration_seconds}
          initialSeconds={lesson.progress?.seconds_spent ?? 0}
          initialPct={lesson.progress?.progress_pct ?? 0}
          onProgress={onProgress}
        />
      ) : (
        <p className="text-sm text-ink/60">
          {lesson.url ? (
            <a href={lesson.url} target="_blank" rel="noreferrer" className="text-brass underline">
              {t('openExternal')}
            </a>
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
              href={`/storage/${lesson.file_path}`}
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

function VideoPlayer({
  embedUrl,
  duration,
  initialSeconds,
  initialPct,
  onProgress,
}: {
  embedUrl: string;
  duration: number | null;
  initialSeconds: number;
  initialPct: number;
  onProgress: (pct: number, seconds?: number) => void;
}) {
  const lastSave = useRef(0);
  const secondsRef = useRef(initialSeconds);

  useEffect(() => {
    const interval = setInterval(() => {
      secondsRef.current += 5;
      const total = duration ?? 600;
      const pct = Math.min(100, Math.round((secondsRef.current / total) * 100));
      if (Date.now() - lastSave.current > 15000) {
        lastSave.current = Date.now();
        onProgress(Math.max(initialPct, pct), secondsRef.current);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [duration, initialPct, onProgress]);

  return (
    <div className="aspect-video w-full bg-ink/5">
      <iframe
        src={embedUrl}
        title="Lesson video"
        className="h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
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
