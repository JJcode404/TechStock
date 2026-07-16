/**
 * Express application factory.
 *
 * Assembles global middleware, versioned routes, and the error-handling tail.
 * Kept free of process concerns (listening, signals) so it can be imported
 * directly by integration tests via supertest.
 */
import express, { type Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { env } from './config/env.js';
import { requestContext } from './middleware/requestContext.js';
import { requestLogger } from './middleware/requestLogger.js';
import { globalRateLimiter } from './middleware/rateLimiter.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import v1Routes from './routes/v1/index.js';
import { APP } from './constants/index.js';

export const createApp = (): Application => {
  const app = express();

  // Trust the first proxy (needed for correct req.ip behind load balancers).
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // --- Security & parsing ---
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS.includes('*') ? true : env.CORS_ORIGINS,
      credentials: true,
      exposedHeaders: ['x-request-id'],
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // --- Observability & context ---
  app.use(requestContext);
  app.use(requestLogger);

  // --- Rate limiting (global) ---
  app.use(globalRateLimiter);

  // --- Static uploads ---
  app.use('/uploads', express.static(env.UPLOAD_DIR, { maxAge: '7d', index: false }));

  // --- Root & versioned routes ---
  app.get('/', (_req, res) => {
    res.json({
      success: true,
      message: `${APP.NAME} API`,
      data: { name: APP.NAME, apiPrefix: env.API_PREFIX, docs: `${env.API_PREFIX}` },
    });
  });

  app.use(env.API_PREFIX, v1Routes);

  // --- Tail: 404 + centralized error handler (order matters) ---
  app.use(notFound);
  app.use(errorHandler);

  return app;
};
