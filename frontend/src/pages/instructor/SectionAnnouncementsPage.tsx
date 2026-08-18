import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSectionAnnouncement,
  fetchSectionAnnouncements,
  instructorKeys,
  publishAnnouncement,
} from '@/api/instructor';
import { AsyncPanel } from '@/components/AsyncPanel';
import { BackLink } from '@/components/BackLink';
import { SectionActionLinks } from '@/components/instructor/SectionActionLinks';
import { InstructorInvalidSection, useInstructorSectionId } from '@/hooks/useInstructorSectionId';
import { useLocale } from '@/i18n/LocaleContext';
import { apiErrorMessage } from '@/utils/apiError';
import { formatAppDate } from '@/utils/formatAppDate';
import type { AnnouncementType } from '@/types/announcements';
import type { InstructorAnnouncement } from '@/types/instructor';
import { announcementTypeLabel } from '@/utils/announcementType';

const ANNOUNCEMENT_TYPES: AnnouncementType[] = ['general', 'assignment', 'exam'];

export function SectionAnnouncementsPage() {
  const sid = useInstructorSectionId();
  const { t } = useLocale();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: instructorKeys.announcements(sid ?? 0),
    queryFn: () => fetchSectionAnnouncements(sid!),
    enabled: sid !== null,
  });

  const announcements = data?.announcements ?? [];

  if (sid === null) return <InstructorInvalidSection />;

  return (
    <div className="space-y-8">
      <BackLink to="/instructor">{t('backToInstructorSections')}</BackLink>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-ink">{t('sectionAnnouncements')}</h1>
            <p className="mt-1 text-sm text-ink/60">{t('sectionAnnouncementsSubtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 rounded bg-brass px-4 py-2 text-sm font-medium text-white shadow-xs transition hover:bg-brass-hover"
          >
            {showForm ? t('cancel') : `+ ${t('newAnnouncement')}`}
          </button>
        </div>
        <SectionActionLinks sectionId={sid} />
      </header>

      {showForm && (
        <NewAnnouncementForm sectionId={sid} onDone={() => setShowForm(false)} />
      )}

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && announcements.length === 0}
        emptyMessage={t('noSectionAnnouncements')}
      >
        <div className="space-y-3">
          {announcements.map((item) => (
            <AnnouncementCard key={item.id} sectionId={sid} item={item} />
          ))}
        </div>
      </AsyncPanel>
    </div>
  );
}

function AnnouncementCard({
  item,
  sectionId,
}: {
  item: InstructorAnnouncement;
  sectionId: number;
}) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const publishMutation = useMutation({
    mutationFn: () => publishAnnouncement(item.id),
    onSuccess: () => {
      setPublishError(null);
      void queryClient.invalidateQueries({ queryKey: instructorKeys.announcements(sectionId) });
    },
    onError: (err: Error) => {
      setPublishError(
        apiErrorMessage(err, t('networkError'), t('serverError')),
      );
    },
  });

  return (
    <div
      className={`rounded-lg border bg-white p-5 shadow-xs transition-all ${
        item.is_urgent ? 'border-amber-300 bg-amber-50/20' : 'border-ink/10 hover:border-brass/30'
      }`}
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="min-w-0 flex-1 text-start space-y-2 cursor-pointer"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-ink">{item.title}</span>

            {/* Type badge */}
            <span className="inline-flex items-center rounded border border-ink/10 bg-paper px-2 py-0.5 text-xs font-medium text-ink/70">
              {t(announcementTypeLabel(item.type))}
            </span>

            {/* Urgent Badge */}
            {item.is_urgent && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                ⚠️ {t('announcementUrgent')}
              </span>
            )}

            {/* Status badge */}
            {item.is_published ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {t('published')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                {t('draft')}
              </span>
            )}
          </div>

          <p className="text-xs text-ink/50 flex flex-wrap items-center gap-2">
            {item.is_published && item.published_at && (
              <span>{formatAppDate(item.published_at, locale)}</span>
            )}
            {item.is_published && (
              <>
                <span>•</span>
                <span>{t('readsCount', { count: item.reads_count })}</span>
              </>
            )}
            <span>•</span>
            <span className="text-brass underline text-xs font-medium">
              {expanded ? t('hideStats') : t('viewStats')}
            </span>
          </p>
        </button>

        {!item.is_published && (
          <div className="shrink-0 pt-1">
            <button
              type="button"
              disabled={publishMutation.isPending}
              onClick={() => publishMutation.mutate()}
              className="rounded bg-brass/10 border border-brass/20 px-3 py-1.5 text-xs font-semibold text-brass transition hover:bg-brass hover:text-white disabled:opacity-50"
            >
              {publishMutation.isPending ? t('processing') : t('publishAnnouncement')}
            </button>
          </div>
        )}
      </div>

      {publishError && (
        <p className="mt-2 text-xs text-brick" role="alert">
          {publishError}
        </p>
      )}

      {expanded && (
        <div className="mt-4 rounded border border-ink/5 bg-paper/40 p-4 whitespace-pre-wrap text-sm text-ink/80">
          {item.body}
        </div>
      )}
    </div>
  );
}

function NewAnnouncementForm({
  sectionId,
  onDone,
}: {
  sectionId: number;
  onDone: () => void;
}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<AnnouncementType>('general');
  const [isUrgent, setIsUrgent] = useState(false);
  const [publishNow, setPublishNow] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createSectionAnnouncement(sectionId, {
        title,
        body,
        type,
        is_urgent: isUrgent,
        publish_now: publishNow,
      }),
    onSuccess: () => {
      setFormError(null);
      setTitle('');
      setBody('');
      void queryClient.invalidateQueries({ queryKey: instructorKeys.announcements(sectionId) });
      onDone();
    },
    onError: (err: Error) => {
      setFormError(apiErrorMessage(err, t('networkError'), t('serverError')));
    },
  });

  return (
    <form
      className="space-y-4 rounded-lg border border-brass/30 bg-white p-6 shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="border-b border-ink/10 pb-3">
        <h2 className="text-base font-semibold text-ink">{t('newAnnouncement')}</h2>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-ink/70 mb-1">{t('announcementTitlePlaceholder')}</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('announcementTitlePlaceholder')}
            required
            className="w-full rounded border border-ink/15 bg-paper/30 px-3.5 py-2 text-sm text-ink transition focus:border-brass focus:bg-white focus:outline-none focus:ring-1 focus:ring-brass"
          />
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="min-w-[10rem]">
            <label className="block text-xs font-medium text-ink/70 mb-1">{t('termType')}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AnnouncementType)}
              className="w-full rounded border border-ink/15 bg-paper/30 px-3 py-2 text-sm text-ink transition focus:border-brass focus:bg-white focus:outline-none focus:ring-1 focus:ring-brass"
            >
              {ANNOUNCEMENT_TYPES.map((at) => (
                <option key={at} value={at}>
                  {t(announcementTypeLabel(at))}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink/70 pt-5 cursor-pointer">
            <input
              type="checkbox"
              checked={isUrgent}
              onChange={(e) => setIsUrgent(e.target.checked)}
              className="accent-brass"
            />
            {t('markAsUrgent')}
          </label>

          <label className="flex items-center gap-2 text-sm text-ink/70 pt-5 cursor-pointer">
            <input
              type="checkbox"
              checked={publishNow}
              onChange={(e) => setPublishNow(e.target.checked)}
              className="accent-brass"
            />
            {t('publishImmediately')}
          </label>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink/70 mb-1">{t('announcementBodyPlaceholder')}</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('announcementBodyPlaceholder')}
            required
            rows={4}
            className="w-full rounded border border-ink/15 bg-paper/30 px-3.5 py-2 text-sm text-ink transition focus:border-brass focus:bg-white focus:outline-none focus:ring-1 focus:ring-brass"
          />
        </div>
      </div>

      {formError && (
        <p className="text-xs text-brick" role="alert">
          {formError}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded bg-brass px-4 py-2 text-sm font-medium text-white shadow-xs transition hover:bg-brass-hover disabled:opacity-60"
        >
          {mutation.isPending ? t('processing') : t('createAnnouncement')}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded border border-ink/15 px-4 py-2 text-sm text-ink/70 transition hover:bg-paper"
        >
          {t('cancel')}
        </button>
      </div>
    </form>
  );
}
