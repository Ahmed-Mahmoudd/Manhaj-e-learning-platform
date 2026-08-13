import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createThread, discussionKeys, fetchSectionThreads } from '@/api/discussion';
import { AsyncPanel } from '@/components/AsyncPanel';
import { BackLink } from '@/components/BackLink';
import { InvalidParamState } from '@/components/InvalidParamState';
import { PaginationBar } from '@/components/PaginationBar';
import { ThreadBadges } from '@/components/ThreadBadges';
import { useLocale } from '@/i18n/LocaleContext';
import { apiErrorMessage } from '@/utils/apiError';
import { trimRequired } from '@/utils/formText';
import { parseRouteId } from '@/utils/routeParams';
import { replyCountLabel } from '@/utils/replyCountLabel';
import type { ThreadSummary, ThreadType } from '@/types/discussion';

export function DiscussThreadsPage() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const sid = parseRouteId(sectionId);
  const { t } = useLocale();
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [sid]);

  const { data, isLoading, error } = useQuery({
    queryKey: discussionKeys.threads(sid ?? 0, page),
    queryFn: () => fetchSectionThreads(sid!, page),
    enabled: sid !== null,
  });

  const threads = data?.data ?? [];

  if (sid === null) {
    return (
      <InvalidParamState
        message={t('invalidSectionId')}
        backTo="/student/discuss"
        backLabel={t('backToDiscussion')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <BackLink to="/student/discuss">{t('backToDiscussion')}</BackLink>

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

      {showForm && (
        <NewThreadForm
          sectionId={sid}
          onDone={() => {
            setShowForm(false);
            setPage(1);
          }}
        />
      )}

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
        <ThreadBadges thread={thread} />
        <h2 className="mt-1.5 font-medium text-ink">{thread.title}</h2>
        <p className="mt-1 text-xs text-ink/50">
          {thread.author?.name ?? '—'} · {replyCountLabel(thread.replies_count, t)}
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
    mutationFn: () => {
      const trimmedTitle = trimRequired(title);
      const trimmedBody = trimRequired(body);
      if (!trimmedTitle || !trimmedBody) {
        throw new Error(t('formRequiredFields'));
      }
      return createThread(sectionId, { title: trimmedTitle, body: trimmedBody, type });
    },
    onSuccess: () => {
      setFormError(null);
      setTitle('');
      setBody('');
      void queryClient.invalidateQueries({ queryKey: discussionKeys.all });
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
        const trimmedTitle = trimRequired(title);
        const trimmedBody = trimRequired(body);
        if (!trimmedTitle || !trimmedBody) {
          setFormError(t('formRequiredFields'));
          return;
        }
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
