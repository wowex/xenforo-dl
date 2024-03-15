export interface Thread extends ThreadLike {
  id: number;
  breadcrumbs: {
    url: string;
    title: string;
  }[];
  messages: ThreadMessage[];
}

export interface ThreadMessage {
  id: number;
  index: string;
  author?: string;
  publishedAt?: string;
  body?: string;
  attachments: ThreadMessageAttachment[];
}

export interface ThreadMessageAttachment {
  id: number;
  index: number;
  url: string;
  filename?: string;
}

export interface ThreadPage extends Thread {
  currentPage: number;
  totalPages: number;
  nextURL?: string;
}

export interface ThreadLike {
  url: string;
  title: string;
}
