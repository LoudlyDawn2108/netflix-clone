import {
  utilities as nestWinstonModuleUtilities,
  WinstonModuleOptions,
} from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import * as path from 'path';

// Define log directories
const logDir = path.resolve(process.cwd(), 'logs');

// Custom format for JSON logs
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.ms(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Create file transports for different log levels
const fileTransports = [
  new winston.transports.DailyRotateFile({
    filename: path.join(logDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    level: 'info',
    format: jsonFormat,
  }),
  new winston.transports.DailyRotateFile({
    filename: path.join(logDir, 'errors-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    level: 'error',
    format: jsonFormat,
  }),
];

// Console transport for local development
const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.ms(),
    nestWinstonModuleUtilities.format.nestLike('Streamflix-Auth', {
      prettyPrint: true,
      colors: true,
    }),
  ),
});

// Determine transports based on environment
const transports =
  process.env.NODE_ENV !== 'production'
    ? [consoleTransport]
    : [...fileTransports, consoleTransport];

// Create the Winston logger options
export const loggerConfig: WinstonModuleOptions = {
  levels: winston.config.npm.levels,
  level: process.env.LOG_LEVEL || 'info',
  transports,
  // Explicitly handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: jsonFormat,
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.timestamp(),
        nestWinstonModuleUtilities.format.nestLike('Streamflix-Auth', {
          prettyPrint: true,
          colors: true,
        }),
      ),
    }),
  ],
  // Exit on handled exceptions
  exitOnError: false,
};
