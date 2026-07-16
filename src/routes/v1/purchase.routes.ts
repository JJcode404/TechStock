import { Router } from 'express';
import { purchaseController } from '../../controllers/purchase.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { PERMISSIONS } from '../../constants/index.js';
import { idParamSchema } from '../../validators/common.validator.js';
import {
  createPurchaseOrderSchema,
  listPurchaseOrderQuerySchema,
  receivePurchaseOrderSchema,
  updatePurchaseOrderSchema,
} from '../../validators/purchase.validator.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  requirePermission(PERMISSIONS.PURCHASE_READ),
  validate({ query: listPurchaseOrderQuerySchema }),
  asyncHandler(purchaseController.list),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.PURCHASE_CREATE),
  validate({ body: createPurchaseOrderSchema }),
  asyncHandler(purchaseController.create),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.PURCHASE_READ),
  validate({ params: idParamSchema }),
  asyncHandler(purchaseController.getById),
);

router.patch(
  '/:id',
  requirePermission(PERMISSIONS.PURCHASE_UPDATE),
  validate({ params: idParamSchema, body: updatePurchaseOrderSchema }),
  asyncHandler(purchaseController.update),
);

router.post(
  '/:id/receive',
  requirePermission(PERMISSIONS.PURCHASE_RECEIVE),
  validate({ params: idParamSchema, body: receivePurchaseOrderSchema }),
  asyncHandler(purchaseController.receive),
);

router.post(
  '/:id/cancel',
  requirePermission(PERMISSIONS.PURCHASE_UPDATE),
  validate({ params: idParamSchema }),
  asyncHandler(purchaseController.cancel),
);

export default router;
