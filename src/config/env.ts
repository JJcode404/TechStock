/**
 * Environment configuration.
 *
 * All process.env access funnels through here. Values are validated with Zod
 * at startup so the application fails fast (before serving traffic) if the
 * environment is misconfigured — rather than throwing deep inside a request.
 */
import 'dotenv/config';
import { z } from 'zod';

const booleanFromString = z
  .string()
  .transform((value) => value.toLowerCase() === 'true')
  .pipe(z.boolean());

const csvToArray = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().startsWith('/').default('/api/v1'),

  DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a valid connection string' }),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_ISSUER: z.string().default('techstock'),
  JWT_AUDIENCE: z.string().default('techstock-clients'),

  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),

  CORS_ORIGINS: csvToArray.default('http://localhost:3000'),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
    .default('info'),
  LOG_PRETTY: booleanFromString.default('false'),

  UPLOAD_DIR: z.string().default('uploads'),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(5),

  BACKUP_DIR: z.string().default('backups'),

  DEFAULT_CURRENCY: z.string().length(3).default('KES'),
  DEFAULT_TAX_RATE: z.coerce.number().min(0).max(100).default(16),
  LOW_STOCK_ALERTS: booleanFromString.default('true'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  // Use console here intentionally: the logger itself depends on this config.
  // eslint-disable-next-line no-console
  console.error(`\n❌ Invalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

export const env = Object.freeze({
  ...parsed.data,
  isProduction: parsed.data.NODE_ENV === 'production',
  isDevelopment: parsed.data.NODE_ENV === 'development',
  isTest: parsed.data.NODE_ENV === 'test',
  maxUploadBytes: parsed.data.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
});

export type Env = typeof env;
