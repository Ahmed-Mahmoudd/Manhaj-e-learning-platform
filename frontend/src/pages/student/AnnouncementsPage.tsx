import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  announcementKeys,
  fetchAnnouncements,
  markAnnouncementRead,
} from '@/api/announcements';
import { AsyncPanel } from '@/components/AsyncPanel';
import { useLocale } from '@/i18n/LocaleContext';
import type { AnnouncementSummary } from '@/types/announcements';
import { announcementTypeLabel } from '@/utils/announcementType';
import { apiErrorMessage } from '@/utils/apiError';
import { formatAppDate } from '@/utils/formatAppDate';

export function AnnouncementsPage() {
  const { t } = useLocale();
  const { data, isLoading, error } = useQuery({
    queryKey: announcementKeys.list(),
    queryFn: fetchAnnouncements,
  });

  const announcements = data?.announcements ?? [];
  const unreadCount = data?.unread_count ?? 0;
  const hasUnreadUrgent = announcements.some((a) => !a.is_read && a.is_urgent);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('announcements')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('announcementsSubtitle')}</p>
        </div>
        {unreadCount > 0 && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold text-white shadow-xs ${
              hasUnreadUrgent ? 'bg-rose-600 animate-pulse' : 'bg-amber-600'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            {t('unreadCount', { count: unreadCount })}
          </span>
        )}
      </header>

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && announcements.length === 0}
        emptyMessage={t('noAnnouncements')}
      >
        <div className="space-y-4">
          {announcements.map((item) => (
            <AnnouncementCard key={item.id} item={item} />
          ))}
        </div>
      </AsyncPanel>
    </div>
  );
}

function AnnouncementCard({ item }: { item: AnnouncementSummary }) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

  const readMutation = useMutation({
    mutationFn: () => markAnnouncementRead(item.id),
    onMutate: async () => {
      setReadError(null);
      await queryClient.cancelQueries({ queryKey: announcementKeys.list() });
      const previous = queryClient.getQueryData<Awaited<ReturnType<typeof fetchAnnouncements>>>(
        announcementKeys.list(),
      );
      if (previous) {
        queryClient.setQueryData(announcementKeys.list(), {
          ...previous,
          unread_count: Math.max(0, previous.unread_count - (item.is_read ? 0 : 1)),
          announcements: previous.announcements.map((a) =>
            a.id === item.id ? { ...a, is_read: true } : a,
          ),
        });
      }
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(announcementKeys.list(), context.previous);
      }
      setReadError(apiErrorMessage(err, t('networkError'), t('serverError'), t));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: announcementKeys.list() });
    },
  });

  const open = () => {
    setExpanded(true);
    if (!item.is_read && !readMutation.isPending) {
      readMutation.mutate();
    }
  };

  return (
    <div
      className={`rounded-2xl border bg-white p-6 shadow-xs transition-all ${
        item.is_urgent
          ? 'border-rose-300 bg-rose-50/20'
          : !item.is_read
            ? 'border-amber-400/80 bg-amber-50/15'
            : 'border-slate-200/90'
      }`}
    >
      <button
        type="button"
        onClick={() => (expanded ? setExpanded(false) : open())}
        className="w-full text-start cursor-pointer"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {!item.is_read && (
                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" aria-hidden />
              )}
              <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                {t(announcementTypeLabel(item.type))}
              </span>
              {item.is_urgent && (
                <span className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                  ⚠️ {t('announcementUrgent')}
                </span>
              )}
              <span className="font-mono text-xs font-bold text-slate-400">
                {item.section.course_code}
              </span>
            </div>

            <h2 className="mt-2 text-base font-bold text-slate-900">{item.title}</h2>

            <p className="mt-1 text-xs text-slate-400">
              👤 {item.author.name}
              {item.published_at && (
                <>
                  {' • 🗓️ '}
                  {formatAppDate(item.published_at, locale)}
                </>
              )}
            </p>
          </div>

          <span className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-400">
            {expanded ? '▲' : '▼'}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="mt-4 border-t border-slate-100 pt-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
          {item.body}
          {readError && (
            <p className="mt-3 text-xs text-rose-600" role="alert">
              ⚠️ {readError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
