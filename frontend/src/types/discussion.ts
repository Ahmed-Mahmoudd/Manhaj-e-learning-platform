export type ThreadType = 'general' | 'question' | 'resource';

export interface ThreadAuthor {
  id: number;
  name: string;
}

export interface ThreadSummary {
  id: number;
  title: string;
  type: ThreadType;
  is_pinned: boolean;
  is_locked: boolean;
  is_resolved: boolean;
  replies_count: number;
  last_activity_at: string | null;
  created_at: string | null;
  author: ThreadAuthor | null;
}

export interface ThreadDetail extends ThreadSummary {
  body: string;
}

export interface DiscussionPost {
  id: number;
  body: string;
  upvotes_count: number;
  is_instructor_answer: boolean;
  has_voted: boolean;
  is_deleted: boolean;
  is_edited: boolean;
  is_own: boolean;
  created_at: string | null;
  author: ThreadAuthor | null;
  replies?: DiscussionPost[];
}

export interface ThreadsResponse {
  data: ThreadSummary[];
  meta: {
    total: number;
    current_page: number;
    last_page: number;
  };
}

export interface ThreadViewResponse {
  thread: ThreadDetail;
  posts: DiscussionPost[];
}

export interface VoteResponse {
  voted: boolean;
  upvotes_count: number;
}
