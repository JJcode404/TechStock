/**
 * Server entrypoint. Owns process lifecycle: DB connection, HTTP listener, and
 * graceful shutdown on SIGINT/SIGTERM plus safety nets for fatal errors.
 */
import type { Server } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDatabase, disconnectDatabase } from './database/prisma.js';

let server: Server | undefined;

const shutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received — shutting down gracefully`);
  const forceExit = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  try {
    if (server) await new Promise<void>((resolve) => server?.close(() => resolve()));
    await disconnectDatabase();
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, 'Error during shutdown');
    process.exit(1);
  }
};

const start = async (): Promise<void> => {
  await connectDatabase();
  const app = createApp();

  server = app.listen(env.PORT, () => {
    logger.info(`🚀 ${'TechStock'} API listening on port ${env.PORT} (${env.NODE_ENV})`);
    logger.info(`   Base URL: http://localhost:${env.PORT}${env.API_PREFIX}`);
  });
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught exception — exiting');
  process.exit(1);
});

start().catch((err) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
