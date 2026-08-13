import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { discussionKeys, fetchSectionThreads } from '@/api/discussion';
import { AsyncPanel } from '@/components/AsyncPanel';
import { BackLink } from '@/components/BackLink';
import { PaginationBar } from '@/components/PaginationBar';
import { ThreadBadges } from '@/components/ThreadBadges';
import { InstructorInvalidSection, useInstructorSectionId } from '@/hooks/useInstructorSectionId';
import { useLocale } from '@/i18n/LocaleContext';
import { replyCountLabel } from '@/utils/replyCountLabel';
import type { ThreadSummary } from '@/types/discussion';

export function InstructorDiscussThreadsPage() {
  const sid = useInstructorSectionId();
  const { t } = useLocale();
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [sid]);

  const { data, isLoading, error } = useQuery({
    queryKey: discussionKeys.threads(sid ?? 0, page),
    queryFn: () => fetchSectionThreads(sid!, page),
    enabled: sid !== null,
  });

  const threads = data?.data ?? [];

  if (sid === null) return <InstructorInvalidSection />;

  return (
    <div className="space-y-6">
      <BackLink to="/instructor">{t('backToInstructorSections')}</BackLink>

      <header>
        <h1 className="text-xl font-semibold text-ink">{t('moderateDiscussion')}</h1>
        <p className="mt-1 text-sm text-ink/60">{t('moderateDiscussionSubtitle')}</p>
      </header>

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && threads.length === 0}
        emptyMessage={t('noThreads')}
      >
        <ul className="divide-y divide-ink/10 border border-ink/10 bg-white">
          {threads.map((thread) => (
            <ThreadRow key={thread.id} sectionId={sid} thread={thread} />
          ))}
        </ul>
        {data?.meta && (
          <PaginationBar
            currentPage={data.meta.current_page}
            lastPage={data.meta.last_page}
            onPageChange={setPage}
          />
        )}
      </AsyncPanel>
    </div>
  );
}

function ThreadRow({ sectionId, thread }: { sectionId: number; thread: ThreadSummary }) {
  const { t } = useLocale();

  return (
    <li>
      <Link
        to={`/instructor/sections/${sectionId}/discuss/threads/${thread.id}`}
        className="block px-5 py-4 transition hover:bg-paper/50"
      >
        <ThreadBadges thread={thread} />
        <h2 className="mt-1.5 font-medium text-ink">{thread.title}</h2>
        <p className="mt-1 text-xs text-ink/50">
          {thread.author?.name ?? '—'} · {replyCountLabel(thread.replies_count, t)}
        </p>
      </Link>
    </li>
  );
}
