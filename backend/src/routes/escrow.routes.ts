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
  handleRequestRevision,
  handleMilestoneRelease,
  downloadQuotePdf,
  getDisputeSummary,
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

// Artisan marks job as done (with work proof photos)
router.post('/job-done', authMiddleware, markJobDone);

// Customer confirms & releases funds (full or milestone)
router.post('/confirm-release', authMiddleware, confirmAndRelease);

// Customer requests revision (sends job back to in-progress)
router.post('/revision', authMiddleware, handleRequestRevision);

// Customer releases a specific milestone payment
router.post('/milestone-release', authMiddleware, handleMilestoneRelease);

// Download quote PDF — no auth required; secured via securityHash query param
router.get('/quote-pdf/:quoteId', downloadQuotePdf);

// Get escrow status for a booking
router.get('/status/:bookingId', authMiddleware, getEscrowStatus);

// AI-generated dispute summary for admin
router.get('/dispute-summary/:bookingId', authMiddleware, getDisputeSummary);

export default router;
