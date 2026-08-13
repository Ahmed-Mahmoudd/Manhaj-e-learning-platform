import { apiRequest } from '@/api/client';
import type {
  DiscussionPost,
  ThreadSummary,
  ThreadType,
  ThreadViewResponse,
  ThreadsResponse,
  VoteResponse,
} from '@/types/discussion';

export function fetchSectionThreads(sectionId: number, page = 1) {
  return apiRequest<ThreadsResponse>(
    `/discuss/sections/${sectionId}/threads?page=${page}`,
  );
}

export function fetchThread(threadId: number) {
  return apiRequest<ThreadViewResponse>(`/discuss/threads/${threadId}`);
}

export function createThread(
  sectionId: number,
  payload: { title: string; body: string; type: ThreadType },
) {
  return apiRequest<{ thread: ThreadSummary }>(`/discuss/sections/${sectionId}/threads`, {
    method: 'POST',
    body: payload,
  });
}

export function addThreadPost(
  threadId: number,
  payload: { body: string; parent_post_id?: number },
) {
  return apiRequest<{ post: DiscussionPost }>(`/discuss/threads/${threadId}/posts`, {
    method: 'POST',
    body: payload,
  });
}

export function togglePostVote(postId: number) {
  return apiRequest<VoteResponse>(`/discuss/posts/${postId}/vote`, { method: 'POST' });
}

export function toggleThreadPin(threadId: number) {
  return apiRequest<{ is_pinned: boolean }>(`/discuss/threads/${threadId}/pin`, {
    method: 'POST',
  });
}

export function toggleThreadLock(threadId: number) {
  return apiRequest<{ is_locked: boolean }>(`/discuss/threads/${threadId}/lock`, {
    method: 'POST',
  });
}

export function markPostAsAnswer(postId: number) {
  return apiRequest<{ is_instructor_answer: boolean; thread_resolved: boolean }>(
    `/discuss/posts/${postId}/answer`,
    { method: 'POST' },
  );
}

export const discussionKeys = {
  all: ['discuss'] as const,
  threads: (sectionId: number, page: number) =>
    [...discussionKeys.all, 'threads', sectionId, page] as const,
  thread: (threadId: number) => [...discussionKeys.all, 'thread', threadId] as const,
};
