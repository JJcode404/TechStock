/**
 * Centralized Pino logger.
 *
 * - Pretty-printed and human-readable in development.
 * - Structured JSON in production (ready for log shippers / aggregators).
 * - Redacts sensitive fields so secrets never reach the logs.
 */
import { pino, type LoggerOptions } from 'pino';
import { env } from './env.js';

const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.currentPassword',
  'req.body.newPassword',
  'req.body.refreshToken',
  'password',
  'passwordHash',
  'refreshToken',
  'accessToken',
  '*.password',
  '*.passwordHash',
];

const options: LoggerOptions = {
  level: env.LOG_LEVEL,
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]',
  },
  base: {
    service: 'techstock-backend',
    env: env.NODE_ENV,
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

const transport =
  env.LOG_PRETTY && !env.isProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname,service,env',
        },
      }
    : undefined;

export const logger = transport ? pino({ ...options, transport }) : pino(options);

/** Create a child logger bound to a specific module/context. */
export const createLogger = (context: string) => logger.child({ context });
