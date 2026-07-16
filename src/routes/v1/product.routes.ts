import { Router } from 'express';
import { productController } from '../../controllers/product.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { uploadImage } from '../../middleware/upload.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { PERMISSIONS } from '../../constants/index.js';
import { idParamSchema } from '../../validators/common.validator.js';
import {
  addImageSchema,
  createProductSchema,
  listProductQuerySchema,
  updateProductSchema,
} from '../../validators/product.validator.js';

const router = Router();
router.use(authenticate);

router.get(
  '/',
  requirePermission(PERMISSIONS.PRODUCT_READ),
  validate({ query: listProductQuerySchema }),
  asyncHandler(productController.list),
);

router.get('/low-stock', requirePermission(PERMISSIONS.INVENTORY_READ), asyncHandler(productController.lowStock));
router.get('/out-of-stock', requirePermission(PERMISSIONS.INVENTORY_READ), asyncHandler(productController.outOfStock));

router.get(
  '/barcode/:barcode',
  requirePermission(PERMISSIONS.PRODUCT_READ),
  asyncHandler(productController.getByBarcode),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.PRODUCT_CREATE),
  validate({ body: createProductSchema }),
  asyncHandler(productController.create),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCT_READ),
  validate({ params: idParamSchema }),
  asyncHandler(productController.getById),
);

router.patch(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCT_UPDATE),
  validate({ params: idParamSchema, body: updateProductSchema }),
  asyncHandler(productController.update),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.PRODUCT_DELETE),
  validate({ params: idParamSchema }),
  asyncHandler(productController.remove),
);

router.post(
  '/:id/images',
  requirePermission(PERMISSIONS.PRODUCT_UPDATE),
  validate({ params: idParamSchema }),
  uploadImage.single('image'),
  validate({ body: addImageSchema }),
  asyncHandler(productController.uploadImage),
);

router.delete(
  '/:id/images/:imageId',
  requirePermission(PERMISSIONS.PRODUCT_UPDATE),
  asyncHandler(productController.removeImage),
);

export default router;
