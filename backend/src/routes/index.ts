import { Router } from 'express';
import authRoutes from './auth.routes';
import artisanRoutes from './artisan.routes';
import customerRoutes from './customer.routes';
import adminRoutes from './admin.routes';
import bookingRoutes from './booking.routes';
import chatRoutes from './chat.routes';
import quoteRoutes from './quote.routes';
import escrowRoutes from './escrow.routes';
import disputeRoutes from './dispute.routes';
import walletRoutes from './wallet.routes';
import verificationRoutes from './verification.routes';
import paymentRoutes from './payment.routes';
import notificationRoutes from './notification.routes';
import reviewRoutes from './review.routes';
import companyRoutes from './company.routes';
import settingsRoutes from './settings.routes';
import referralRoutes from './referral.routes';
import reelRoutes from './reel.routes';

const router = Router();

// API routes
router.use('/auth', authRoutes);
router.use('/referral', referralRoutes);
router.use('/artisan', artisanRoutes);
router.use('/customer', customerRoutes);
router.use('/company', companyRoutes);
router.use('/admin', adminRoutes);
router.use('/booking', bookingRoutes);
router.use('/chat', chatRoutes);
router.use('/quote', quoteRoutes);
router.use('/escrow', escrowRoutes);
router.use('/dispute', disputeRoutes);
router.use('/wallet', walletRoutes);
router.use('/verification', verificationRoutes);
router.use('/payment', paymentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reviews', reviewRoutes);
router.use('/settings', settingsRoutes);
router.use('/reels', reelRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
