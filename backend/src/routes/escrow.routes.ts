import { Router } from 'express';
import {
  fundEscrow,
  devSimulatePayment,
  flutterwaveWebhook,
  paystackWebhook,
  verifyPayment,
  markJobDone,
  confirmAndRelease,
  getEscrowStatus,
} from '../controllers/escrow.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Fund escrow (initialize payment)
router.post('/fund', authMiddleware, fundEscrow);

// DEV ONLY: Simulate payment
router.get('/dev-pay', devSimulatePayment);

// Webhooks (no auth - called by payment provider)
router.post('/webhook', flutterwaveWebhook);

// Verify payment status
router.post('/verify', authMiddleware, verifyPayment);

// Artisan marks job as done
router.post('/job-done', authMiddleware, markJobDone);

// Customer confirms & releases funds
router.post('/confirm-release', authMiddleware, confirmAndRelease);

// Get escrow status for a booking
router.get('/status/:bookingId', authMiddleware, getEscrowStatus);

export default router;
