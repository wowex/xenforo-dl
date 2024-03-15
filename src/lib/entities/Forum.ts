import { ThreadLike } from './Thread.js';

export interface Forum extends ForumLike {
  id: number;
  subforums: ForumLike[];
  threads: ThreadLike[];
}

export interface ForumPage extends Forum {
  currentPage: number;
  totalPages: number;
  nextURL?: string;
}

export interface ForumLike {
  url: string;
  title: string;
}
