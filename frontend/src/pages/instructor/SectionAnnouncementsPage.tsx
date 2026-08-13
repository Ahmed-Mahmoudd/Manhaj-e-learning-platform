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
import { InstructorInvalidSection, useInstructorSectionId } from '@/hooks/useInstructorSectionId';
import { useLocale } from '@/i18n/LocaleContext';
import { apiErrorMessage } from '@/utils/apiError';
import { formatAppDate } from '@/utils/formatAppDate';
import type { AnnouncementType } from '@/types/announcements';
import type { InstructorAnnouncement } from '@/types/instructor';
import { announcementTypeLabel } from '@/utils/announcementType';
import {
  announcementRowClass,
  announcementTypeBadgeClass,
  announcementUrgentBadgeClass,
} from '@/utils/announcementStyle';

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
    <div className="space-y-6">
      <BackLink to="/instructor">{t('backToInstructorSections')}</BackLink>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">{t('sectionAnnouncements')}</h1>
          <p className="mt-1 text-sm text-ink/60">{t('sectionAnnouncementsSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="bg-brass px-4 py-2 text-sm text-white transition hover:bg-brass-hover"
        >
          {showForm ? t('cancel') : t('newAnnouncement')}
        </button>
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
        <ul className="divide-y divide-ink/10 border border-ink/10 bg-white">
          {announcements.map((item) => (
            <AnnouncementRow key={item.id} sectionId={sid} item={item} />
          ))}
        </ul>
      </AsyncPanel>
    </div>
  );
}

function AnnouncementRow({
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
        apiErrorMessage(err, t('networkError'), t('serverError'), t),
      );
    },
  });

  return (
    <li className={`px-5 py-4 ${announcementRowClass(item.is_urgent)}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="min-w-0 flex-1 text-start"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-ink">{item.title}</span>
            {item.is_published ? (
              <span className="text-xs uppercase text-green-700">{t('published')}</span>
            ) : (
              <span className="text-xs uppercase text-ink/40">{t('draft')}</span>
            )}
          </div>
          <p className="mt-1 text-xs text-ink/50">
            <span className={`uppercase ${announcementTypeBadgeClass()}`}>
              {t(announcementTypeLabel(item.type))}
            </span>
            {item.is_urgent && (
              <>
                {' · '}
                <span className={`uppercase ${announcementUrgentBadgeClass()}`}>
                  {t('announcementUrgent')}
                </span>
              </>
            )}
            {item.is_published && item.published_at && (
              <> · {formatAppDate(item.published_at, locale)}</>
            )}
            {item.is_published && (
              <> · {t('readsCount', { count: item.reads_count })}</>
            )}
          </p>
        </button>
        {!item.is_published && (
          <button
            type="button"
            disabled={publishMutation.isPending}
            onClick={() => publishMutation.mutate()}
            className="text-sm text-brass underline disabled:opacity-50"
          >
            {publishMutation.isPending ? t('processing') : t('publishAnnouncement')}
          </button>
        )}
      </div>
      {publishError && (
        <p className="mt-2 text-xs text-brick" role="alert">
          {publishError}
        </p>
      )}
      {expanded && (
        <div className="mt-4 border-t border-ink/10 pt-4 whitespace-pre-wrap text-sm text-ink/80">
          {item.body}
        </div>
      )}
    </li>
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
      className="space-y-3 border border-ink/10 bg-white p-5"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <h2 className="text-sm font-medium text-ink">{t('newAnnouncement')}</h2>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('announcementTitlePlaceholder')}
        required
        className="w-full border border-ink/15 px-3 py-2 text-sm"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as AnnouncementType)}
        className="border border-ink/15 px-3 py-2 text-sm"
      >
        {ANNOUNCEMENT_TYPES.map((at) => (
          <option key={at} value={at}>
            {t(announcementTypeLabel(at))}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 text-sm text-ink/70">
        <input
          type="checkbox"
          checked={isUrgent}
          onChange={(e) => setIsUrgent(e.target.checked)}
        />
        {t('markAsUrgent')}
      </label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t('announcementBodyPlaceholder')}
        required
        rows={5}
        className="w-full border border-ink/15 px-3 py-2 text-sm"
      />
      <label className="flex items-center gap-2 text-sm text-ink/70">
        <input
          type="checkbox"
          checked={publishNow}
          onChange={(e) => setPublishNow(e.target.checked)}
        />
        {t('publishImmediately')}
      </label>
      {formError && (
        <p className="text-xs text-brick" role="alert">
          {formError}
        </p>
      )}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="bg-brass px-4 py-2 text-sm text-white disabled:opacity-60"
      >
        {mutation.isPending ? t('processing') : t('createAnnouncement')}
      </button>
    </form>
  );
}
