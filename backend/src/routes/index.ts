import { Router } from 'express';
import authRoutes from './auth.routes';
import artisanRoutes from './artisan.routes';
import customerRoutes from './customer.routes';

const router = Router();

// API routes
router.use('/auth', authRoutes);
router.use('/artisan', artisanRoutes);
router.use('/customer', customerRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
