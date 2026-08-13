import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addThreadPost,
  discussionKeys,
  fetchThread,
  markPostAsAnswer,
  toggleThreadLock,
  toggleThreadPin,
} from '@/api/discussion';
import { AsyncPanel } from '@/components/AsyncPanel';
import { BackLink } from '@/components/BackLink';
import { InvalidParamState } from '@/components/InvalidParamState';
import { InstructorInvalidSection, useInstructorSectionId } from '@/hooks/useInstructorSectionId';
import { useLocale } from '@/i18n/LocaleContext';
import { apiErrorMessage } from '@/utils/apiError';
import { trimRequired } from '@/utils/formText';
import { parseRouteId } from '@/utils/routeParams';
import type { DiscussionPost } from '@/types/discussion';
import { threadTypeLabel } from '@/utils/threadType';

export function InstructorDiscussThreadPage() {
  const sid = useInstructorSectionId();
  const { threadId } = useParams<{ threadId: string }>();
  const tid = parseRouteId(threadId);
  const { t } = useLocale();
  const [reply, setReply] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const [moderationError, setModerationError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: discussionKeys.thread(tid ?? 0),
    queryFn: () => fetchThread(tid!),
    enabled: tid !== null,
  });

  const invalidate = () => {
    if (tid === null) return;
    void queryClient.invalidateQueries({ queryKey: discussionKeys.thread(tid) });
    void queryClient.invalidateQueries({ queryKey: discussionKeys.all });
  };

  const pinMutation = useMutation({
    mutationFn: () => toggleThreadPin(tid!),
    onSuccess: () => {
      setModerationError(null);
      invalidate();
    },
    onError: (err: Error) => {
      setModerationError(apiErrorMessage(err, t('networkError'), t('serverError'), t));
    },
  });

  const lockMutation = useMutation({
    mutationFn: () => toggleThreadLock(tid!),
    onSuccess: () => {
      setModerationError(null);
      invalidate();
    },
    onError: (err: Error) => {
      setModerationError(apiErrorMessage(err, t('networkError'), t('serverError'), t));
    },
  });

  const replyMutation = useMutation({
    mutationFn: () => {
      const trimmed = trimRequired(reply);
      if (!trimmed) throw new Error(t('formRequiredFields'));
      return addThreadPost(tid!, { body: trimmed });
    },
    onSuccess: () => {
      setReply('');
      setReplyError(null);
      invalidate();
    },
    onError: (err: Error) => {
      setReplyError(apiErrorMessage(err, t('networkError'), t('serverError')));
    },
  });

  const thread = data?.thread;

  if (sid === null) {
    return <InstructorInvalidSection />;
  }

  if (tid === null) {
    return (
      <InvalidParamState
        message={t('threadNotFound')}
        backTo={`/instructor/sections/${sid}/discuss`}
        backLabel={t('backToModerationThreads')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <BackLink to={`/instructor/sections/${sid}/discuss`}>{t('backToModerationThreads')}</BackLink>

      <AsyncPanel
        isLoading={isLoading}
        error={error}
        isEmpty={!isLoading && !error && !thread}
        emptyMessage={t('threadNotFound')}
      >
        {thread && (
          <>
            <article className="border border-ink/10 bg-white px-5 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap gap-2 text-xs uppercase text-ink/45">
                  {thread.is_pinned && <span className="text-brass">{t('pinned')}</span>}
                  {thread.is_locked && <span>{t('locked')}</span>}
                  {thread.is_resolved && <span className="text-green-700">{t('resolved')}</span>}
                  <span>{t(threadTypeLabel(thread.type))}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pinMutation.isPending}
                    onClick={() => pinMutation.mutate()}
                    className="border border-ink/20 px-3 py-1 text-xs text-ink/70 hover:border-brass hover:text-brass"
                  >
                    {thread.is_pinned ? t('unpinThread') : t('pinThread')}
                  </button>
                  <button
                    type="button"
                    disabled={lockMutation.isPending}
                    onClick={() => lockMutation.mutate()}
                    className="border border-ink/20 px-3 py-1 text-xs text-ink/70 hover:border-brass hover:text-brass"
                  >
                    {thread.is_locked ? t('unlockThread') : t('lockThread')}
                  </button>
                </div>
              </div>
              {moderationError && (
                <p className="mt-2 text-xs text-brick" role="alert">
                  {moderationError}
                </p>
              )}
              <h1 className="mt-2 text-xl font-semibold text-ink">{thread.title}</h1>
              <p className="mt-1 text-xs text-ink/50">{thread.author?.name}</p>
              <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink/85">
                {thread.body}
              </div>
            </article>

            <section className="space-y-4">
              <h2 className="text-sm font-medium text-ink/70">{t('replies')}</h2>
              {(data?.posts ?? []).map((post) => (
                <ModeratorPostCard
                  key={post.id}
                  post={post}
                  locked={thread.is_locked}
                  onUpdated={invalidate}
                />
              ))}
            </section>

            {!thread.is_locked ? (
              <form
                className="space-y-3 border border-ink/10 bg-white p-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!trimRequired(reply)) {
                    setReplyError(t('formRequiredFields'));
                    return;
                  }
                  replyMutation.mutate();
                }}
              >
                <label className="block text-sm font-medium text-ink">{t('instructorReply')}</label>
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

function ModeratorPostCard({
  post,
  locked,
  onUpdated,
}: {
  post: DiscussionPost;
  locked: boolean;
  onUpdated: () => void;
}) {
  const { t } = useLocale();
  const [answerError, setAnswerError] = useState<string | null>(null);

  const answerMutation = useMutation({
    mutationFn: () => markPostAsAnswer(post.id),
    onSuccess: () => {
      setAnswerError(null);
      onUpdated();
    },
    onError: (err: Error) => {
      setAnswerError(apiErrorMessage(err, t('networkError'), t('serverError'), t));
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
        {!locked && !post.is_instructor_answer && (
          <div className="text-end">
            <button
              type="button"
              disabled={answerMutation.isPending}
              onClick={() => answerMutation.mutate()}
              className="text-xs text-brass underline disabled:opacity-50"
            >
              {answerMutation.isPending ? t('processing') : t('markAsAnswer')}
            </button>
            {answerError && (
              <p className="mt-1 text-[10px] text-brick" role="alert">
                {answerError}
              </p>
            )}
          </div>
        )}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-ink/85">{post.body}</p>
      {post.replies?.map((reply) => (
        <NestedPost
          key={reply.id}
          post={reply}
          locked={locked}
          onUpdated={onUpdated}
        />
      ))}
    </div>
  );
}

function NestedPost({
  post,
  locked,
  onUpdated,
}: {
  post: DiscussionPost;
  locked: boolean;
  onUpdated: () => void;
}) {
  const { t } = useLocale();
  const [answerError, setAnswerError] = useState<string | null>(null);

  const answerMutation = useMutation({
    mutationFn: () => markPostAsAnswer(post.id),
    onSuccess: () => {
      setAnswerError(null);
      onUpdated();
    },
    onError: (err: Error) => {
      setAnswerError(apiErrorMessage(err, t('networkError'), t('serverError'), t));
    },
  });

  return (
    <div
      className={`mt-3 ms-4 border-s border-ink/15 ps-4 ${
        post.is_instructor_answer ? 'border-s-green-600' : ''
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-xs font-medium text-ink/70">{post.author?.name}</p>
        {!locked && !post.is_instructor_answer && (
          <div className="text-end">
            <button
              type="button"
              disabled={answerMutation.isPending}
              onClick={() => answerMutation.mutate()}
              className="text-xs text-brass underline disabled:opacity-50"
            >
              {t('markAsAnswer')}
            </button>
            {answerError && (
              <p className="mt-1 text-[10px] text-brick" role="alert">
                {answerError}
              </p>
            )}
          </div>
        )}
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm text-ink/80">{post.body}</p>
    </div>
  );
}
