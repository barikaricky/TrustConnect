import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';

const router = Router();

/**
 * POST /api/payment/verify-account
 * Body: { bankName: string, accountNumber: string }
 * Returns: { success: true, accountName: string }
 */
router.post('/verify-account', PaymentController.verifyBankAccount);

export default router;
