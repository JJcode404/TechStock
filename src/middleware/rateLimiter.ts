/**
 * Rate limiters. A generous global limiter protects the API broadly; a stricter
 * limiter guards authentication endpoints against brute-force attempts.
 */
import rateLimit, { type Options } from 'express-rate-limit';
import { env } from '../config/env.js';
import { HTTP_STATUS } from '../constants/index.js';

const baseOptions: Partial<Options> = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Too many requests, please try again later',
      errors: [{ code: 'RATE_LIMITED', message: 'Rate limit exceeded' }],
    });
  },
};

export const globalRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  skip: (req) => req.path.startsWith('/health') || req.path.startsWith('/metrics'),
});

export const authRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  skipSuccessfulRequests: true,
});
