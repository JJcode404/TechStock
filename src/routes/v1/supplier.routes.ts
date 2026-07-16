import { Router } from 'express';
import { supplierController } from '../../controllers/supplier.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { PERMISSIONS } from '../../constants/index.js';
import { idParamSchema, paginationQuerySchema } from '../../validators/common.validator.js';
import {
  createSupplierSchema,
  listSupplierQuerySchema,
  updateSupplierSchema,
} from '../../validators/supplier.validator.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  requirePermission(PERMISSIONS.SUPPLIER_MANAGE),
  validate({ query: listSupplierQuerySchema }),
  asyncHandler(supplierController.list),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.SUPPLIER_MANAGE),
  validate({ body: createSupplierSchema }),
  asyncHandler(supplierController.create),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.SUPPLIER_MANAGE),
  validate({ params: idParamSchema }),
  asyncHandler(supplierController.getById),
);

router.get(
  '/:id/purchase-history',
  requirePermission(PERMISSIONS.SUPPLIER_MANAGE),
  validate({ params: idParamSchema, query: paginationQuerySchema }),
  asyncHandler(supplierController.purchaseHistory),
);

router.get(
  '/:id/outstanding-balance',
  requirePermission(PERMISSIONS.SUPPLIER_MANAGE),
  validate({ params: idParamSchema }),
  asyncHandler(supplierController.outstandingBalance),
);

router.patch(
  '/:id',
  requirePermission(PERMISSIONS.SUPPLIER_MANAGE),
  validate({ params: idParamSchema, body: updateSupplierSchema }),
  asyncHandler(supplierController.update),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.SUPPLIER_MANAGE),
  validate({ params: idParamSchema }),
  asyncHandler(supplierController.remove),
);

export default router;
