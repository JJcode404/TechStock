import { Router } from 'express';
import { saleController } from '../../controllers/sale.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { PERMISSIONS } from '../../constants/index.js';
import { idParamSchema } from '../../validators/common.validator.js';
import {
  cancelSaleSchema,
  createSaleSchema,
  listSaleQuerySchema,
  returnSaleSchema,
} from '../../validators/sale.validator.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  requirePermission(PERMISSIONS.SALE_READ),
  validate({ query: listSaleQuerySchema }),
  asyncHandler(saleController.list),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.SALE_CREATE),
  validate({ body: createSaleSchema }),
  asyncHandler(saleController.create),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.SALE_READ),
  validate({ params: idParamSchema }),
  asyncHandler(saleController.getById),
);

router.get(
  '/:id/receipt',
  requirePermission(PERMISSIONS.SALE_READ),
  validate({ params: idParamSchema }),
  asyncHandler(saleController.getReceipt),
);

router.post(
  '/:id/cancel',
  requirePermission(PERMISSIONS.SALE_CANCEL),
  validate({ params: idParamSchema, body: cancelSaleSchema }),
  asyncHandler(saleController.cancel),
);

router.post(
  '/:id/return',
  requirePermission(PERMISSIONS.SALE_RETURN),
  validate({ params: idParamSchema, body: returnSaleSchema }),
  asyncHandler(saleController.return),
);

export default router;
