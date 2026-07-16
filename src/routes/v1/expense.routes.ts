import { Router } from 'express';
import { expenseController } from '../../controllers/expense.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { PERMISSIONS } from '../../constants/index.js';
import { idParamSchema } from '../../validators/common.validator.js';
import {
  createExpenseSchema,
  listExpenseQuerySchema,
  updateExpenseSchema,
} from '../../validators/expense.validator.js';

const router = Router();
router.use(authenticate);

// Expenses feed profit reporting; gate behind the reporting permission.
router.get(
  '/',
  requirePermission(PERMISSIONS.REPORT_VIEW),
  validate({ query: listExpenseQuerySchema }),
  asyncHandler(expenseController.list),
);

router.post(
  '/',
  requirePermission(PERMISSIONS.REPORT_VIEW),
  validate({ body: createExpenseSchema }),
  asyncHandler(expenseController.create),
);

router.get(
  '/:id',
  requirePermission(PERMISSIONS.REPORT_VIEW),
  validate({ params: idParamSchema }),
  asyncHandler(expenseController.getById),
);

router.patch(
  '/:id',
  requirePermission(PERMISSIONS.REPORT_VIEW),
  validate({ params: idParamSchema, body: updateExpenseSchema }),
  asyncHandler(expenseController.update),
);

router.delete(
  '/:id',
  requirePermission(PERMISSIONS.REPORT_VIEW),
  validate({ params: idParamSchema }),
  asyncHandler(expenseController.remove),
);

export default router;
