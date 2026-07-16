import { Router } from 'express';
import { reportController } from '../../controllers/report.controller.js';
import { authenticate } from '../../middleware/authenticate.js';
import { requirePermission } from '../../middleware/authorize.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { PERMISSIONS } from '../../constants/index.js';
import {
  dateRangeQuerySchema,
  salesSummaryQuerySchema,
  topProductsQuerySchema,
} from '../../validators/report.validator.js';

const router = Router();
router.use(authenticate, requirePermission(PERMISSIONS.REPORT_VIEW));

router.get('/dashboard', asyncHandler(reportController.dashboard));
router.get('/sales/today', asyncHandler(reportController.todaySales));
router.get('/sales/monthly', asyncHandler(reportController.monthlySales));
router.get('/sales/recent', asyncHandler(reportController.recentSales));

router.get(
  '/sales/summary',
  validate({ query: salesSummaryQuerySchema }),
  asyncHandler(reportController.salesSummary),
);

router.get(
  '/products/top',
  validate({ query: topProductsQuerySchema }),
  asyncHandler(reportController.topProducts),
);

router.get(
  '/products/most-profitable',
  validate({ query: topProductsQuerySchema }),
  asyncHandler(reportController.mostProfitable),
);

router.get(
  '/profit',
  validate({ query: dateRangeQuerySchema }),
  asyncHandler(reportController.profitReport),
);

export default router;
