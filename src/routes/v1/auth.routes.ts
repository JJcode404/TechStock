import { Router } from 'express';
import { authController } from '../../controllers/auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authRateLimiter } from '../../middleware/rateLimiter.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import {
  changePasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
} from '../../validators/auth.validator.js';

const router = Router();

router.post(
  '/register',
  authRateLimiter,
  validate({ body: registerSchema }),
  asyncHandler(authController.register),
);

router.post(
  '/login',
  authRateLimiter,
  validate({ body: loginSchema }),
  asyncHandler(authController.login),
);

router.post(
  '/refresh',
  authRateLimiter,
  validate({ body: refreshSchema }),
  asyncHandler(authController.refresh),
);

router.post(
  '/logout',
  authenticate,
  validate({ body: logoutSchema }),
  asyncHandler(authController.logout),
);

router.get('/me', authenticate, asyncHandler(authController.me));

router.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  asyncHandler(authController.changePassword),
);

export default router;
