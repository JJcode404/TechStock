/**
 * v1 API router. Mounts every feature module under /api/v1.
 */
import { Router } from 'express';
import authRoutes from './auth.routes.js';
import healthRoutes from './health.routes.js';
import categoryRoutes from './category.routes.js';
import supplierRoutes from './supplier.routes.js';
import productRoutes from './product.routes.js';
import inventoryRoutes from './inventory.routes.js';
import saleRoutes from './sale.routes.js';
import purchaseRoutes from './purchase.routes.js';
import customerRoutes from './customer.routes.js';
import reportRoutes from './report.routes.js';
import expenseRoutes from './expense.routes.js';
import syncRoutes from './sync.routes.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'TechStock API v1',
    data: {
      version: '1.0.0',
      endpoints: [
        '/auth',
        '/products',
        '/categories',
        '/suppliers',
        '/customers',
        '/inventory',
        '/sales',
        '/purchase-orders',
        '/reports',
        '/expenses',
        '/sync',
        '/health',
      ],
    },
  });
});

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/sales', saleRoutes);
router.use('/purchase-orders', purchaseRoutes);
router.use('/customers', customerRoutes);
router.use('/reports', reportRoutes);
router.use('/expenses', expenseRoutes);
router.use('/sync', syncRoutes);
router.use('/health', healthRoutes);

export default router;
