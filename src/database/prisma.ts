/**
 * PrismaClient singleton.
 *
 * A single instance is shared across the process. In development we cache it on
 * `globalThis` so hot-reload (tsx watch) doesn't exhaust the connection pool by
 * spawning a new client on every reload.
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const logLevels: Prisma.LogLevel[] = env.isProduction
  ? ['warn', 'error']
  : ['warn', 'error'];

const createPrismaClient = (): PrismaClient =>
  new PrismaClient({
    log: logLevels.map((level) => ({ emit: 'event', level })),
  });

type GlobalWithPrisma = typeof globalThis & { __techstockPrisma?: PrismaClient };
const globalForPrisma = globalThis as GlobalWithPrisma;

export const prisma = globalForPrisma.__techstockPrisma ?? createPrismaClient();

if (!env.isProduction) {
  globalForPrisma.__techstockPrisma = prisma;
}

// Pipe Prisma's internal logs through Pino.
prisma.$on('warn' as never, (e: Prisma.LogEvent) => logger.warn({ prisma: e }, 'Prisma warning'));
prisma.$on('error' as never, (e: Prisma.LogEvent) =>
  logger.error({ prisma: e }, 'Prisma error'),
);

export const connectDatabase = async (): Promise<void> => {
  await prisma.$connect();
  logger.info('✅ Database connected');
};

export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
  logger.info('🔌 Database disconnected');
};
