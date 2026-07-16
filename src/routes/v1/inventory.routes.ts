import { Router } from 'express';
import { inventoryController } from '../../controllers/inventory.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { PERMISSIONS } from '../../constants/index.js';
import {
  createAdjustmentSchema,
  listAdjustmentQuerySchema,
  listMovementQuerySchema,
} from '../../validators/inventory.validator.js';

const router = Router();
router.use(authenticate);

router.get(
  '/movements',
  requirePermission(PERMISSIONS.INVENTORY_READ),
  validate({ query: listMovementQuerySchema }),
  asyncHandler(inventoryController.listMovements),
);

router.get(
  '/adjustments',
  requirePermission(PERMISSIONS.INVENTORY_READ),
  validate({ query: listAdjustmentQuerySchema }),
  asyncHandler(inventoryController.listAdjustments),
);

router.post(
  '/adjustments',
  requirePermission(PERMISSIONS.INVENTORY_ADJUST),
  validate({ body: createAdjustmentSchema }),
  asyncHandler(inventoryController.createAdjustment),
);

router.get(
  '/stock-value',
  requirePermission(PERMISSIONS.INVENTORY_READ),
  asyncHandler(inventoryController.stockValue),
);

export default router;
