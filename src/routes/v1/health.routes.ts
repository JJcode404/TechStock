import { Router } from 'express';
import { healthController } from '../../controllers/health.controller.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const router = Router();

router.get('/live', healthController.live);
router.get('/ready', asyncHandler(healthController.ready));
router.get('/metrics', asyncHandler(healthController.metrics));

export default router;
