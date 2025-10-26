import { EOL } from 'os';
import { ThreadMessage } from '../entities/Thread.js';

const MESSAGE_TEMPLATE_BASE =
`{message.separator}
{message.index} [/goto/post?id={message.id}] - {message.publishedAt}
by {message.author}
{message.separator}

{message.body}`;

const MESSAGE_TEMPLATE_WITH_QUOTES =
`{message.separator}
{message.index} [/goto/post?id={message.id}] - {message.publishedAt}
by {message.author}
{message.separator}

{message.body}

Quotes{message.quotes}`;

const MESSAGE_TEMPLATE_WITH_ATTACHMENTS =
`${MESSAGE_TEMPLATE_BASE}

**Attachments**
{message.attachments}


`;

const MESSAGE_TEMPLATE_WITHOUT_ATTACHMENTS =
`${MESSAGE_TEMPLATE_BASE}


`;

export default class MessageTemplate {

  static #getSeparator(message: ThreadMessage) {
    const s1 = `${message.index} [/goto/post?id=${message.id}] - ${message.publishedAt}`;
    const s2 = `by ${message.author}`;
    return '-'.repeat(Math.max(s1.length, s2.length));
  }

  static format(message: ThreadMessage) {
    const attachments = message.attachments
      .map((attachment, i) => `${i}: ${attachment.filename}`)
      .join(EOL);
    // choose base template depending on presence of quotes and attachments
    const hasQuotes = Array.isArray((message as any).quoteMessages) && (message as any).quoteMessages.length > 0;
    let template = MESSAGE_TEMPLATE_BASE;
    if (hasQuotes) {
      template = attachments ? MESSAGE_TEMPLATE_WITH_ATTACHMENTS.replace('{message.body}', MESSAGE_TEMPLATE_WITH_QUOTES.split('{message.body}')[1]) : MESSAGE_TEMPLATE_WITH_QUOTES;
    }
    else {
      template = attachments ? MESSAGE_TEMPLATE_WITH_ATTACHMENTS : MESSAGE_TEMPLATE_WITHOUT_ATTACHMENTS;
    }
    return template
      .replaceAll('{message.separator}', this.#getSeparator(message))
      .replaceAll('{message.index}', String(message.index))
      .replaceAll('{message.id}', String(message.id))
      .replaceAll('{message.author}', message.author || '[unknown]')
      .replaceAll('{message.publishedAt}', message.publishedAt || '')
      .replaceAll('{message.body}', message.body || '')
      .replaceAll('{message.quotes}', (() => {
        const q = (message as any).quoteMessages as number[] | undefined;
        if (!q || q.length === 0) return '';
        return q.map((id) => `[/goto/post?id=${id}]`).join(' ');
      })())
      .replaceAll('{message.attachments}', attachments);
  }
}
