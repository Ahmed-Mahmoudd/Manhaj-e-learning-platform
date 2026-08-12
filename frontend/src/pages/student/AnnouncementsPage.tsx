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

export function AnnouncementsPage() {
  const { t } = useLocale();
  const { data, isLoading, error } = useQuery({
    queryKey: announcementKeys.list(),
    queryFn: fetchAnnouncements,
  });

  const announcements = data?.announcements ?? [];
  const unreadCount = data?.unread_count ?? 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{t('announcements')}</h1>
          <p className="mt-1 text-sm text-ink/60">{t('announcementsSubtitle')}</p>
        </div>
        {unreadCount > 0 && (
          <span className="rounded-full bg-brass px-3 py-1 text-xs font-medium text-white">
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
        <ul className="divide-y divide-ink/10 border border-ink/10 bg-white">
          {announcements.map((item) => (
            <AnnouncementRow key={item.id} item={item} />
          ))}
        </ul>
      </AsyncPanel>
    </div>
  );
}

function AnnouncementRow({ item }: { item: AnnouncementSummary }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const readMutation = useMutation({
    mutationFn: () => markAnnouncementRead(item.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: announcementKeys.list() });
    },
  });

  const open = () => {
    setExpanded(true);
    if (!item.is_read && !readMutation.isPending) {
      readMutation.mutate();
    }
  };

  return (
    <li className={`px-5 py-4 ${!item.is_read ? 'bg-brass/5' : ''}`}>
      <button
        type="button"
        onClick={() => (expanded ? setExpanded(false) : open())}
        className="w-full text-start"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {!item.is_read && (
                <span className="h-2 w-2 shrink-0 rounded-full bg-brass" aria-hidden />
              )}
              <span className="font-mono text-xs uppercase text-ink/45">
                {t(announcementTypeLabel(item.type))}
              </span>
              <span className="text-xs text-ink/40">{item.section.course_code}</span>
            </div>
            <h2 className="mt-1 text-base font-medium text-ink">{item.title}</h2>
            <p className="mt-1 text-xs text-ink/50">
              {item.author.name}
              {item.published_at && (
                <>
                  {' · '}
                  {formatDate(item.published_at)}
                </>
              )}
            </p>
          </div>
          <span className="text-xs text-ink/40">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>
      {expanded && (
        <div className="mt-4 border-t border-ink/10 pt-4 text-sm leading-relaxed text-ink/80 whitespace-pre-wrap">
          {item.body}
        </div>
      )}
    </li>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}
