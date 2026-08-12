import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import {
  addThreadPost,
  discussionKeys,
  fetchThread,
  togglePostVote,
} from '@/api/discussion';
import { AsyncPanel } from '@/components/AsyncPanel';
import { useLocale } from '@/i18n/LocaleContext';
import type { DiscussionPost } from '@/types/discussion';
import { threadTypeLabel } from '@/utils/threadType';

export function DiscussThreadPage() {
  const { sectionId, threadId } = useParams<{ sectionId: string; threadId: string }>();
  const sid = Number(sectionId);
  const tid = Number(threadId);
  const { t } = useLocale();
  const [reply, setReply] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: discussionKeys.thread(tid),
    queryFn: () => fetchThread(tid),
    enabled: Number.isFinite(tid) && tid > 0,
  });

  const replyMutation = useMutation({
    mutationFn: () => addThreadPost(tid, { body: reply }),
    onSuccess: () => {
      setReply('');
      setReplyError(null);
      void queryClient.invalidateQueries({ queryKey: discussionKeys.thread(tid) });
      void queryClient.invalidateQueries({ queryKey: discussionKeys.all });
    },
    onError: (err: Error) => {
      setReplyError(
        err instanceof ApiError ? err.serverMessage ?? err.message : t('networkError'),
      );
    },
  });

  const thread = data?.thread;

  return (
    <div className="space-y-6">
      <Link
        to={`/student/discuss/sections/${sid}`}
        className="text-sm text-ink/50 transition hover:text-brass"
      >
        ← {t('backToThreads')}
      </Link>

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && !thread}
        emptyMessage={t('threadNotFound')}
      >
        {thread && (
          <>
            <article className="border border-ink/10 bg-white px-5 py-5">
              <div className="flex flex-wrap gap-2 text-xs uppercase text-ink/45">
                {thread.is_pinned && <span className="text-brass">{t('pinned')}</span>}
                {thread.is_locked && <span>{t('locked')}</span>}
                {thread.is_resolved && <span className="text-green-700">{t('resolved')}</span>}
                <span>{t(threadTypeLabel(thread.type))}</span>
              </div>
              <h1 className="mt-2 text-xl font-semibold text-ink">{thread.title}</h1>
              <p className="mt-1 text-xs text-ink/50">{thread.author?.name}</p>
              <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink/85">
                {thread.body}
              </div>
            </article>

            <section className="space-y-4">
              <h2 className="text-sm font-medium text-ink/70">{t('replies')}</h2>
              {(data?.posts ?? []).map((post) => (
                <PostCard key={post.id} post={post} threadId={tid} locked={thread.is_locked} />
              ))}
            </section>

            {!thread.is_locked ? (
              <form
                className="space-y-3 border border-ink/10 bg-white p-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  replyMutation.mutate();
                }}
              >
                <label className="block text-sm font-medium text-ink">{t('yourReply')}</label>
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  required
                  rows={3}
                  className="w-full border border-ink/15 px-3 py-2 text-sm"
                />
                {replyError && (
                  <p className="text-xs text-brick" role="alert">
                    {replyError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={replyMutation.isPending}
                  className="bg-brass px-4 py-2 text-sm text-white disabled:opacity-60"
                >
                  {replyMutation.isPending ? t('posting') : t('postReply')}
                </button>
              </form>
            ) : (
              <p className="text-sm text-ink/50">{t('threadLockedHint')}</p>
            )}
          </>
        )}
      </AsyncPanel>
    </div>
  );
}

function PostCard({
  post,
  threadId,
  locked,
}: {
  post: DiscussionPost;
  threadId: number;
  locked: boolean;
}) {
  const { t } = useLocale();
  const queryClient = useQueryClient();

  const voteMutation = useMutation({
    mutationFn: () => togglePostVote(post.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: discussionKeys.thread(threadId) });
    },
  });

  return (
    <div
      className={`border border-ink/10 bg-white px-5 py-4 ${
        post.is_instructor_answer ? 'border-s-4 border-s-green-600' : ''
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">{post.author?.name ?? '—'}</p>
          {post.is_instructor_answer && (
            <p className="text-xs font-medium text-green-700">{t('instructorAnswer')}</p>
          )}
        </div>
        {!locked && (
          <button
            type="button"
            disabled={voteMutation.isPending}
            onClick={() => voteMutation.mutate()}
            className={`text-xs font-mono ${post.has_voted ? 'text-brass' : 'text-ink/45'}`}
          >
            ▲ {post.upvotes_count}
          </button>
        )}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-ink/85">{post.body}</p>
      {post.replies?.map((reply) => (
        <div key={reply.id} className="mt-3 ms-4 border-s border-ink/15 ps-4">
          <p className="text-xs font-medium text-ink/70">{reply.author?.name}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink/80">{reply.body}</p>
        </div>
      ))}
    </div>
  );
}
