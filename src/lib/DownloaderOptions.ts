import path from 'path';
import Logger from './utils/logging/Logger.js';
import { DeepRequired, pickDefined } from './utils/Misc.js';
import { DownloaderConfig } from './XenForoDownloader.js';

export interface DownloaderOptions {
  outDir?: string;
  dirStructure?: {
    site?: boolean;
    parentForumsAndSections?: 'all' | 'immediate' | 'none';
    thread?: boolean;
    attachments?: boolean;
  };
  request?: {
    maxRetries?: number;
    maxConcurrent?: number;
    minTime?: {
      page?: number;
      attachment?: number;
    };
    cookie?: string | null;
  };
  overwrite?: boolean;
  continue?: boolean;
  logger?: Logger | null;
}

const DEFAULT_DOWNLOADER_CONFIG: Pick<DeepRequired<DownloaderConfig>,
  'outDir' | 'dirStructure' | 'request' | 'overwrite' | 'continue'> = {

    outDir: process.cwd(),
    dirStructure: {
      site: true,
      parentForumsAndSections: 'all',
      thread: true,
      attachments: true
    },
    request: {
      maxRetries: 3,
      maxConcurrent: 10,
      minTime: {
        page: 500,
        attachment: 200
      },
      cookie: null
    },
    overwrite: false,
    continue: false
  };

export function getDownloaderConfig(url: string, options?: DownloaderOptions): DownloaderConfig {
  const defaults = DEFAULT_DOWNLOADER_CONFIG;
  return {
    outDir: options?.outDir ? path.resolve(options.outDir) : defaults.outDir,
    dirStructure: {
      site: pickDefined(options?.dirStructure?.site, defaults.dirStructure.site),
      parentForumsAndSections: pickDefined(options?.dirStructure?.parentForumsAndSections, defaults.dirStructure.parentForumsAndSections),
      thread: pickDefined(options?.dirStructure?.thread, defaults.dirStructure.thread),
      attachments: pickDefined(options?.dirStructure?.attachments, defaults.dirStructure.attachments)
    },
    request: {
      maxRetries: pickDefined(options?.request?.maxRetries, defaults.request.maxRetries),
      maxConcurrent: pickDefined(options?.request?.maxConcurrent, defaults.request.maxConcurrent),
      minTime: {
        page: pickDefined(options?.request?.minTime?.page, defaults.request.minTime.page),
        attachment: pickDefined(options?.request?.minTime?.attachment, defaults.request.minTime.attachment)
      },
      cookie: pickDefined(options?.request?.cookie, defaults.request.cookie)
    },
    overwrite: pickDefined(options?.overwrite, defaults.overwrite),
    continue: pickDefined(options?.continue, defaults.continue),
    targetURL: url
  };
}

export function getDefaultDownloaderOutDir() {
  return DEFAULT_DOWNLOADER_CONFIG.outDir;
}
