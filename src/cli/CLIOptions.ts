import { DownloaderOptions } from '../lib/DownloaderOptions.js';
import { pickDefined } from '../lib/utils/Misc.js';
import { LogLevel } from '../lib/utils/logging/Logger.js';
import CLIOptionValidator from './CLIOptionValidator.js';
import CommandLineParser from './CommandLineParser.js';

export interface CLIOptions extends Omit<DownloaderOptions, 'dirStructure' | 'logger'> {
  url: string;
  noPrompt: boolean;
  dirStructure: string;
  logging: {
    level: LogLevel;
    file?: string;
  };
  continue: boolean;
  exportJson?: string;
}

export interface CLIOptionParserEntry {
  key: string;
  value?: string;
}

export function getCLIOptions(): CLIOptions {
  const commandLineOptions = CommandLineParser.parse();

  const dirStructure = CLIOptionValidator.validateFlags(commandLineOptions.dirStructure, 's', 'pl', 'pi', 't', 'a', '-');

  const options: CLIOptions = {
    url: CLIOptionValidator.validateRequired(commandLineOptions.url, 'No target URL specified'),
    outDir: CLIOptionValidator.validateString(commandLineOptions.outDir),
    dirStructure: pickDefined(dirStructure, 'splta'),
    overwrite: CLIOptionValidator.validateBoolean(commandLineOptions.overwrite),
    request: {
      maxRetries: CLIOptionValidator.validateNumber(commandLineOptions?.request?.maxRetries),
      maxConcurrent: CLIOptionValidator.validateNumber(commandLineOptions?.request?.maxConcurrent),
      minTime: {
        page: CLIOptionValidator.validateNumber(commandLineOptions?.request?.minTime?.page),
        attachment: CLIOptionValidator.validateNumber(commandLineOptions?.request?.minTime?.attachment)
      },
      cookie: CLIOptionValidator.validateString(commandLineOptions?.request?.cookie) || null
    },
    noPrompt: CLIOptionValidator.validateBoolean(commandLineOptions.noPrompt) || false,
    logging: {
      level: CLIOptionValidator.validateString(commandLineOptions.logging?.level, 'info', 'debug', 'warn', 'error', 'none') || 'info',
      file: CLIOptionValidator.validateString(commandLineOptions.logging?.file)
    },
    continue: CLIOptionValidator.validateBoolean(commandLineOptions.continue) || false
    ,
    exportJson: CLIOptionValidator.validateString(commandLineOptions.exportJson)
  };

  return options;
}
