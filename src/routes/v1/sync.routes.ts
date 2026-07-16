import { Router } from 'express';
import { syncController } from '../../controllers/sync.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { authorize, requirePermission } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { PERMISSIONS, ROLES } from '../../constants/index.js';
import { pullQuerySchema, pushBodySchema } from '../../validators/sync.validator.js';

const router = Router();
router.use(authenticate);

router.get('/pull', validate({ query: pullQuerySchema }), asyncHandler(syncController.pull));
router.post('/push', validate({ body: pushBodySchema }), asyncHandler(syncController.push));

// Backups are administrative and potentially expensive — Admin + permission.
router.post(
  '/backup',
  authorize(ROLES.ADMIN),
  requirePermission(PERMISSIONS.BACKUP_RUN),
  asyncHandler(syncController.createBackup),
);
router.get(
  '/backup',
  authorize(ROLES.ADMIN),
  requirePermission(PERMISSIONS.BACKUP_RUN),
  asyncHandler(syncController.listBackups),
);

export default router;
