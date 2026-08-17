import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addThreadPost,
  deleteThreadPost,
  discussionKeys,
  fetchThread,
  togglePostVote,
  updateThreadPost,
} from '@/api/discussion';
import { AsyncPanel } from '@/components/AsyncPanel';
import { BackLink } from '@/components/BackLink';
import { InvalidParamState } from '@/components/InvalidParamState';
import { useLocale } from '@/i18n/LocaleContext';
import { apiErrorMessage } from '@/utils/apiError';
import { trimRequired } from '@/utils/formText';
import { parseRouteId } from '@/utils/routeParams';
import type { DiscussionPost } from '@/types/discussion';
import { threadTypeLabel } from '@/utils/threadType';

/**
 * A deleted post with no replies is hidden entirely (nothing to preserve).
 * A deleted post that has replies is kept as a "[deleted]" placeholder so
 * the replies underneath don't lose their parent.
 */
function visiblePosts(posts: DiscussionPost[]): DiscussionPost[] {
  return posts.filter((p) => !p.is_deleted || (p.replies?.length ?? 0) > 0);
}

export function DiscussThreadPage() {
  const { sectionId, threadId } = useParams<{ sectionId: string; threadId: string }>();
  const sid = parseRouteId(sectionId);
  const tid = parseRouteId(threadId);
  const { t } = useLocale();
  const [reply, setReply] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: discussionKeys.thread(tid ?? 0),
    queryFn: () => fetchThread(tid!),
    enabled: tid !== null,
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
      void queryClient.invalidateQueries({ queryKey: discussionKeys.thread(tid!) });
      void queryClient.invalidateQueries({ queryKey: discussionKeys.all });
    },
    onError: (err: Error) => {
      setReplyError(apiErrorMessage(err, t('networkError'), t('serverError')));
    },
  });

  const thread = data?.thread;

  if (sid === null) {
    return (
      <InvalidParamState
        message={t('invalidSectionId')}
        backTo="/student/discuss"
        backLabel={t('backToDiscussion')}
      />
    );
  }

  if (tid === null) {
    return (
      <InvalidParamState
        message={t('threadNotFound')}
        backTo={`/student/discuss/sections/${sid}`}
        backLabel={t('backToThreads')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <BackLink to={`/student/discuss/sections/${sid}`}>{t('backToThreads')}</BackLink>

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
              {visiblePosts(data?.posts ?? []).length === 0 ? (
                <p className="text-sm text-ink/50">{t('noReplies')}</p>
              ) : (
                visiblePosts(data?.posts ?? []).map((post) => (
                  <PostCard key={post.id} post={post} threadId={tid} locked={thread.is_locked} />
                ))
              )}
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
  const [voteError, setVoteError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(post.body);
  const [editError, setEditError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const voteMutation = useMutation({
    mutationFn: () => togglePostVote(post.id),
    onSuccess: () => {
      setVoteError(null);
      void queryClient.invalidateQueries({ queryKey: discussionKeys.thread(threadId) });
    },
    onError: (err: Error) => {
      setVoteError(apiErrorMessage(err, t('networkError'), t('serverError'), t));
    },
  });

  const editMutation = useMutation({
    mutationFn: () => {
      const trimmed = trimRequired(editBody);
      if (!trimmed) throw new Error(t('formRequiredFields'));
      return updateThreadPost(post.id, trimmed);
    },
    onSuccess: () => {
      setEditError(null);
      setIsEditing(false);
      void queryClient.invalidateQueries({ queryKey: discussionKeys.thread(threadId) });
    },
    onError: (err: Error) => {
      setEditError(apiErrorMessage(err, t('networkError'), t('serverError'), t));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteThreadPost(post.id),
    onSuccess: () => {
      setDeleteError(null);
      void queryClient.invalidateQueries({ queryKey: discussionKeys.thread(threadId) });
      void queryClient.invalidateQueries({ queryKey: discussionKeys.all });
    },
    onError: (err: Error) => {
      setDeleteError(apiErrorMessage(err, t('networkError'), t('serverError'), t));
    },
  });

  if (post.is_deleted) {
    return (
      <div className="border border-ink/10 bg-white px-5 py-4">
        <p className="text-sm italic text-ink/40">{t('deletedPostBody')}</p>
        {visiblePosts(post.replies ?? []).map((reply) => (
          <PostCard key={reply.id} post={reply} threadId={threadId} locked={locked} />
        ))}
      </div>
    );
  }

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
          <div className="text-end">
            <button
              type="button"
              disabled={voteMutation.isPending}
              onClick={() => voteMutation.mutate()}
              className={`text-xs font-mono ${post.has_voted ? 'text-brass' : 'text-ink/45'}`}
            >
              ▲ {post.upvotes_count}
            </button>
            {voteError && (
              <p className="mt-1 text-[10px] text-brick" role="alert">
                {voteError}
              </p>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="mt-2 space-y-2">
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            rows={3}
            className="w-full border border-ink/15 px-3 py-2 text-sm"
          />
          {editError && (
            <p className="text-xs text-brick" role="alert">
              {editError}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={editMutation.isPending}
              onClick={() => editMutation.mutate()}
              className="bg-brass px-3 py-1.5 text-xs text-white disabled:opacity-60"
            >
              {t('saveEdit')}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditBody(post.body);
                setEditError(null);
              }}
              className="px-3 py-1.5 text-xs text-ink/60"
            >
              {t('cancelEdit')}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 whitespace-pre-wrap text-sm text-ink/85">
          {post.body}
          {post.is_edited && <span className="ms-2 text-xs text-ink/35">{t('editedLabel')}</span>}
        </p>
      )}

      {post.is_own && !isEditing && (
        <div className="mt-2 flex gap-3">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-xs text-ink/50 underline"
          >
            {t('editPost')}
          </button>
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (window.confirm(t('confirmDeletePost'))) {
                deleteMutation.mutate();
              }
            }}
            className="text-xs text-brick underline disabled:opacity-60"
          >
            {t('deletePost')}
          </button>
        </div>
      )}
      {deleteError && (
        <p className="mt-1 text-[10px] text-brick" role="alert">
          {deleteError}
        </p>
      )}

      {visiblePosts(post.replies ?? []).map((reply) => (
        <div key={reply.id} className="mt-3 ms-4 border-s border-ink/15 ps-4">
          <PostCard post={reply} threadId={threadId} locked={locked} />
        </div>
      ))}
    </div>
  );
}
