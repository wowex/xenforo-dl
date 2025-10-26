import { EOL } from 'os';
import { ThreadMessage } from '../entities/Thread.js';

const MESSAGE_TEMPLATE_BASE =
`{message.separator}
{message.index} [/goto/post?id={message.id}] - {message.publishedAt}
by {message.author}
{message.separator}

{message.body}`;

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
    const template = attachments ? MESSAGE_TEMPLATE_WITH_ATTACHMENTS : MESSAGE_TEMPLATE_WITHOUT_ATTACHMENTS;
    return template
      .replaceAll('{message.separator}', this.#getSeparator(message))
      .replaceAll('{message.index}', String(message.index))
      .replaceAll('{message.id}', String(message.id))
      .replaceAll('{message.author}', message.author || '[unknown]')
      .replaceAll('{message.publishedAt}', message.publishedAt || '')
      .replaceAll('{message.body}', message.body || '')
      .replaceAll('{message.attachments}', attachments);
  }
}
