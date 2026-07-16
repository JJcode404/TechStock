import { Router } from 'express';
import { categoryController } from '../../controllers/category.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { PERMISSIONS } from '../../constants/index.js';
import { idParamSchema } from '../../validators/common.validator.js';
import {
  createCategorySchema,
  listCategoryQuerySchema,
  updateCategorySchema,
} from '../../validators/category.validator.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  requirePermission(PERMISSIONS.PRODUCT_READ),
  validate({ query: listCategoryQuerySchema }),
  asyncHandler(categoryController.list),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.PRODUCT_CREATE),
  validate({ body: createCategorySchema }),
  asyncHandler(categoryController.create),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCT_READ),
  validate({ params: idParamSchema }),
  asyncHandler(categoryController.getById),
);

router.patch(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCT_UPDATE),
  validate({ params: idParamSchema, body: updateCategorySchema }),
  asyncHandler(categoryController.update),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCT_DELETE),
  validate({ params: idParamSchema }),
  asyncHandler(categoryController.remove),
);

export default router;
