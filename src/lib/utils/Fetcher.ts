import * as fs from 'fs';
import fetch, { AbortError, Request, Response } from 'node-fetch';
import { pipeline } from 'stream/promises';
import { URL } from 'url';
import path from 'path';
import Logger, { LogLevel, commonLog } from './logging/Logger.js';
import { ensureDirSync } from 'fs-extra';
import { sleepBeforeExecute } from './Misc.js';
import contentDisposition from 'content-disposition';

export interface DownloadAttachmentParams {
  // Attachment src (URL)
  src: string;
  // Destination path
  dest: string;
  maxRetries: number,
  retryInterval: number,
  signal?: AbortSignal;
}

export interface StartDownloadOverrides {
  destFilePath?: string;
  tmpFilePath?: string;
}

export class FetcherError extends Error {

  url: string;
  fatal: boolean;

  constructor(message: string, url: string, fatal = false) {
    super(message);
    this.name = 'FetcherError';
    this.url = url;
    this.fatal = fatal;
  }
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.0.0';

export default class Fetcher {

  name = 'Fetcher';

  #logger?: Logger | null;
  #cookie?: string | null;

  constructor(logger?: Logger | null, cookie?: string | null) {
    this.#logger = logger;
    this.#cookie = cookie;
  }

  static async getInstance(logger?: Logger | null, cookie?: string | null) {
    return new Fetcher(logger, cookie);
  }

  async fetchHTML(args: {
    url: string,
    maxRetries: number,
    retryInterval: number,
    signal?: AbortSignal
  }, rt = 0): Promise<{html: string, lastURL: string}> {

    const { url, maxRetries, retryInterval, signal } = args;
    try {
      const res = await this.#fetchWithRedirect(url, 'GET', signal);
      return {
        html: await res.text(),
        lastURL: res.url
      };
    }
    catch (error) {
      if (error instanceof AbortError || (error instanceof FetcherError && error.fatal)) {
        throw error;
      }
      if (rt < maxRetries) {
        this.log('error', `Error fetching "${url}" - will retry: `, error);
        return sleepBeforeExecute(() => this.fetchHTML({ url, maxRetries, retryInterval, signal }, rt + 1), retryInterval);
      }
      const errMsg = error instanceof Error ? error.message : error;
      const retriedMsg = rt > 0 ? ` (retried ${rt} times)` : '';
      throw new FetcherError(`${errMsg}${retriedMsg}`, url);
    }
  }

  async fetchFilenameByHeaders(args: {
    url: string,
    maxRetries: number,
    retryInterval: number,
    signal?: AbortSignal
  }, rt = 0): Promise<string | null> {

    const { url, maxRetries, retryInterval, signal } = args;
    const urlObj = new URL(url);
    try {
      const res = await this.#fetchWithRedirect(url, 'HEAD', signal);
      const disposition = res.headers.get('content-disposition');
      if (disposition) {
        const parsedDisposition = contentDisposition.parse(disposition);
        const filename = parsedDisposition.parameters['filename'] || null;
        return filename;
      }
      return null;
    }
    catch (error) {
      if (error instanceof AbortError || (error instanceof FetcherError && error.fatal)) {
        throw error;
      }
      if (rt < maxRetries) {
        this.log('error', `Error fetching "${url}" (HEAD) - will retry: `, error);
        return sleepBeforeExecute(() => this.fetchFilenameByHeaders({ url, maxRetries, retryInterval, signal }, rt + 1), retryInterval);
      }
      const errMsg = error instanceof Error ? error.message : error;
      const retriedMsg = rt > 0 ? ` (retried ${rt} times)` : '';
      throw new FetcherError(`${errMsg}${retriedMsg}`, urlObj.toString());
    }
  }

  async downloadAttachment(params: DownloadAttachmentParams, rt = 0): Promise<void> {
    const { src, dest, maxRetries, retryInterval, signal } = params;
    const request = new Request(src, { method: 'GET' });
    this.#setHeaders(request);
    const res = await this.#fetchWithRedirect(src, 'GET', signal);
    try {
      if (this.#assertResponseOK(res, src)) {
        const destFilePath = path.resolve(dest);
        const { dir: destDir, base: destFilename } = path.parse(destFilePath);
        const tmpFilePath = path.resolve(destDir, `${destFilename}.part`);
        try {
          ensureDirSync(destDir);
          this.log('debug', `Download: "${src}" -> "${tmpFilePath}"`);
          await pipeline(
            res.body,
            fs.createWriteStream(tmpFilePath)
          );
          this.#commitDownload(tmpFilePath, destFilePath);
          return;
        }
        catch (error) {
          this.#cleanupDownload(tmpFilePath);
          throw error;
        }
      }
    }
    catch (error) {
      if (error instanceof AbortError || (error instanceof FetcherError && error.fatal)) {
        throw error;
      }
      if (rt < maxRetries) {
        this.log('error', `Error downloading attachment from  "${src}" - will retry: `, error);
        return sleepBeforeExecute(() => this.downloadAttachment(params, rt + 1), retryInterval);
      }
      const errMsg = error instanceof Error ? error.message : error;
      const retriedMsg = rt > 0 ? ` (retried ${rt} times)` : '';
      throw new FetcherError(`${errMsg}${retriedMsg}`, src);
    }

    return undefined as never;
  }

  async #fetchWithRedirect(url: string, method: 'GET' | 'HEAD', signal?: AbortSignal, useCookie = true): Promise<Response> {
    const request = new Request(url, { method });
    this.#setHeaders(request, useCookie);
    const res = await fetch(request, { signal, redirect: 'manual' });
    if (res.status >= 300 && res.status < 400) {
      const toURL = res.headers.get('Location');
      if (toURL) {
        this.log('debug', `HTTP Redirect: "${request.url}" -> "${toURL}"`);
        const redirectWithCookie = new URL(url).host === new URL(toURL).host;
        return this.#fetchWithRedirect(toURL, method, signal, redirectWithCookie);
      }
      // We should never arrive here!
      return fetch(request);
    }
    return res;
  }

  #commitDownload(tmpFilePath: string, destFilePath: string) {
    try {
      this.log('debug', `Commit: "${tmpFilePath}" -> "${destFilePath} (filesize: ${fs.lstatSync(tmpFilePath).size} bytes)`);
      fs.renameSync(tmpFilePath, destFilePath);
    }
    finally {
      this.#cleanupDownload(tmpFilePath);
    }
  }

  #cleanupDownload(tmpFilePath: string) {
    try {
      if (fs.existsSync(tmpFilePath)) {
        this.log('debug', `Cleanup "${tmpFilePath}"`);
        fs.unlinkSync(tmpFilePath);
      }
    }
    catch (error) {
      this.log('error', `Cleanup error "${tmpFilePath}":`, error);
    }
  }

  #setHeaders(request: Request, setCookie = true) {
    request.headers.set('User-Agent', USER_AGENT);
    if (this.#cookie && setCookie) {
      request.headers.set('Cookie', this.#cookie);
    }
  }

  #assertResponseOK(response: Response | null, originURL: string, requireBody: false): response is Response;
  #assertResponseOK(response: Response | null, originURL: string, requireBody?: true): response is Response & { body: NonNullable<Response['body']> };
  #assertResponseOK(response: Response | null, originURL: string, requireBody = true) {
    if (!response) {
      throw new FetcherError('No response', originURL);
    }
    if (!response.ok) {
      throw new FetcherError(`${response.status} - ${response.statusText}`, originURL);
    }
    if (requireBody && !response.body) {
      throw new FetcherError('Empty response body', originURL);
    }
    return true;
  }

  protected log(level: LogLevel, ...msg: Array<any>) {
    commonLog(this.#logger, level, this.name, ...msg);
  }
}
