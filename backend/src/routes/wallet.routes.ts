import { Router } from 'express';
import {
  getWalletBalance,
  getTransactionHistory,
  requestWithdrawal,
  fundWallet,
  verifyFunding,
} from '../controllers/wallet.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Get wallet balance
router.get('/balance/:userId', authMiddleware, getWalletBalance);

// Get transaction history
router.get('/transactions/:userId', authMiddleware, getTransactionHistory);

// Request withdrawal
router.post('/withdraw', authMiddleware, requestWithdrawal);

// Fund wallet (initialize Flutterwave payment)
router.post('/fund', authMiddleware, fundWallet);

// Verify wallet funding after payment
router.post('/verify-funding', authMiddleware, verifyFunding);

export default router;
