
import { format, transports } from "winston";
import 'winston-daily-rotate-file';

import { existsSync, mkdirSync } from 'fs';

export const LOGGER_INFO = 'info';
export const LOGGER_ERROR = 'error';

const infoLogDir = `logs/${LOGGER_INFO}`;
const errorLogDir = `logs/${LOGGER_ERROR}`;

export const initLogDir = () => {
  if (!existsSync(infoLogDir)) mkdirSync(infoLogDir);
  if (!existsSync(errorLogDir)) mkdirSync(errorLogDir);
}

const printFormat = format.printf(({ level, message, timestamp }) => `Timestamp: ${timestamp}, Level: ${level}, Message: ${JSON.stringify(message)}`);

const ignoreErrorFormat = format((info) => {
  if (info.level === 'error') { return false; }
  return info;
});

export const winstonOptions = {
  levels: { error: 0, warn: 1, info: 2, debug: 3 },
  transports: [
    new transports.Console({
      format: format.combine(
        format.timestamp(),
        format.colorize(),
        format.prettyPrint(),
        format.simple(),
      ),
    }),
    new transports.DailyRotateFile({
      level: LOGGER_INFO, 
      datePattern: 'YYYY-MM-DD',
      filename: `logs/${LOGGER_INFO}/%DATE%.log`,
      maxFiles: 7,
      zippedArchive: true,
      format: format.combine(
        format.timestamp(),
        format.prettyPrint(),
        format.json(),
        printFormat,
        ignoreErrorFormat()
      )
    }),
    new transports.DailyRotateFile({
      level: LOGGER_ERROR, 
      datePattern: 'YYYY-MM-DD',
      filename: `logs/${LOGGER_ERROR}/%DATE%.log`,
      maxFiles: 7,
      zippedArchive: true,
      format: format.combine(
        format.timestamp(),
        format.prettyPrint(),
        format.json(),
        printFormat
      )
    }),
  ],
};