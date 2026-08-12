import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import { createThread, discussionKeys, fetchSectionThreads } from '@/api/discussion';
import { AsyncPanel } from '@/components/AsyncPanel';
import { PaginationBar } from '@/components/PaginationBar';
import { useLocale } from '@/i18n/LocaleContext';
import type { ThreadSummary, ThreadType } from '@/types/discussion';
import { threadTypeLabel } from '@/utils/threadType';

export function DiscussThreadsPage() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const sid = Number(sectionId);
  const { t } = useLocale();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: discussionKeys.threads(sid, page),
    queryFn: () => fetchSectionThreads(sid, page),
    enabled: Number.isFinite(sid) && sid > 0,
  });

  const threads = data?.data ?? [];

  return (
    <div className="space-y-6">
      <Link to="/student/discuss" className="text-sm text-ink/50 transition hover:text-brass">
        ← {t('backToDiscussion')}
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-ink">{t('sectionForum')}</h1>
          <p className="mt-1 text-sm text-ink/60">{t('sectionForumSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="bg-brass px-4 py-2 text-sm text-white transition hover:bg-brass-hover"
        >
          {showForm ? t('cancel') : t('newThread')}
        </button>
      </header>

      {showForm && <NewThreadForm sectionId={sid} onDone={() => setShowForm(false)} />}

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
        to={`/student/discuss/sections/${sectionId}/threads/${thread.id}`}
        className="block px-5 py-4 transition hover:bg-paper/50"
      >
        <div className="flex flex-wrap items-start gap-2">
          {thread.is_pinned && (
            <span className="text-xs font-medium uppercase text-brass">{t('pinned')}</span>
          )}
          {thread.is_locked && (
            <span className="text-xs font-medium uppercase text-ink/45">{t('locked')}</span>
          )}
          {thread.is_resolved && (
            <span className="text-xs font-medium uppercase text-green-700">{t('resolved')}</span>
          )}
          <span className="text-xs uppercase text-ink/40">{t(threadTypeLabel(thread.type))}</span>
        </div>
        <h2 className="mt-1 font-medium text-ink">{thread.title}</h2>
        <p className="mt-1 text-xs text-ink/50">
          {thread.author?.name ?? '—'} · {t('replyCount', { count: thread.replies_count })}
        </p>
      </Link>
    </li>
  );
}

function NewThreadForm({ sectionId, onDone }: { sectionId: number; onDone: () => void }) {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<ThreadType>('question');
  const [formError, setFormError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => createThread(sectionId, { title, body, type }),
    onSuccess: () => {
      setFormError(null);
      setTitle('');
      setBody('');
      void queryClient.invalidateQueries({ queryKey: discussionKeys.all });
      onDone();
    },
    onError: (err: Error) => {
      setFormError(err instanceof ApiError ? err.serverMessage ?? err.message : t('networkError'));
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
      <h2 className="text-sm font-medium text-ink">{t('newThread')}</h2>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t('threadTitlePlaceholder')}
        required
        className="w-full border border-ink/15 px-3 py-2 text-sm"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as ThreadType)}
        className="border border-ink/15 px-3 py-2 text-sm"
      >
        <option value="question">{t('threadType_question')}</option>
        <option value="general">{t('threadType_general')}</option>
        <option value="resource">{t('threadType_resource')}</option>
      </select>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t('threadBodyPlaceholder')}
        required
        rows={4}
        className="w-full border border-ink/15 px-3 py-2 text-sm"
      />
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
        {mutation.isPending ? t('posting') : t('postThread')}
      </button>
    </form>
  );
}
