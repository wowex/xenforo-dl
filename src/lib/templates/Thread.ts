import { Thread } from '../entities/Thread.js';

const THREAD_HEADER_TEMPLATE =
`===============================================================================
{thread.title}
{thread.url}
===============================================================================

`;

export default class ThreadHeaderTemplate {

  static format(thread: Thread) {
    return THREAD_HEADER_TEMPLATE
      .replaceAll('{thread.title}', thread.title)
      .replaceAll('{thread.url}', thread.url);
  }
}
