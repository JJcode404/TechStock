import { Router } from 'express';
import { customerController } from '../../controllers/customer.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { PERMISSIONS } from '../../constants/index.js';
import { idParamSchema, paginationQuerySchema } from '../../validators/common.validator.js';
import {
  adjustLoyaltySchema,
  createCustomerSchema,
  listCustomerQuerySchema,
  updateCustomerSchema,
} from '../../validators/customer.validator.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  requirePermission(PERMISSIONS.CUSTOMER_MANAGE),
  validate({ query: listCustomerQuerySchema }),
  asyncHandler(customerController.list),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.CUSTOMER_MANAGE),
  validate({ body: createCustomerSchema }),
  asyncHandler(customerController.create),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.CUSTOMER_MANAGE),
  validate({ params: idParamSchema }),
  asyncHandler(customerController.getById),
);

router.get(
  '/:id/purchase-history',
  requirePermission(PERMISSIONS.CUSTOMER_MANAGE),
  validate({ params: idParamSchema, query: paginationQuerySchema }),
  asyncHandler(customerController.purchaseHistory),
);

router.get(
  '/:id/outstanding-balance',
  requirePermission(PERMISSIONS.CUSTOMER_MANAGE),
  validate({ params: idParamSchema }),
  asyncHandler(customerController.outstandingBalance),
);

router.post(
  '/:id/loyalty',
  requirePermission(PERMISSIONS.CUSTOMER_MANAGE),
  validate({ params: idParamSchema, body: adjustLoyaltySchema }),
  asyncHandler(customerController.adjustLoyalty),
);

router.patch(
  '/:id',
  requirePermission(PERMISSIONS.CUSTOMER_MANAGE),
  validate({ params: idParamSchema, body: updateCustomerSchema }),
  asyncHandler(customerController.update),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.CUSTOMER_MANAGE),
  validate({ params: idParamSchema }),
  asyncHandler(customerController.remove),
);

export default router;
