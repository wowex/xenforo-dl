import { URL } from 'url';
import { DownloadTargetType } from '../XenForoDownloader.js';

export default class URLHelper {

  static getTargetTypeByURL(url: string): DownloadTargetType {
    let urlObj: URL;
    try {
      urlObj = new URL(url);
    }
    catch (error) {
      throw Error('Invalid URL');
    }

    const forum = this.parseForumURL(urlObj.toString());
    if (forum) {
      return 'forum';
    }

    const thread = this.parseThreadURL(urlObj.toString());
    if (thread) {
      return 'thread';
    }

    return 'unknown';
  }

  static parseForumURL(url?: string) {
    if (!url) {
      return null;
    }
    const regex = /\/forums\/(.+)\.(\d+)/g;
    const matches = regex.exec(url);
    if (matches && matches[2]) {
      return {
        slug: matches[1],
        id: Number(matches[2])
      };
    }
    return null;
  }

  static parseThreadURL(url?: string) {
    if (!url) {
      return null;
    }
    const regex = /\/threads\/(.+)\.(\d+)/g;
    const matches = regex.exec(url);
    if (matches && matches[2]) {
      return {
        slug: matches[1],
        id: Number(matches[2])
      };
    }
    return null;
  }

}
