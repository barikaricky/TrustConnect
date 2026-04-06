import { Router } from 'express';
import { ReferralController } from '../controllers/referral.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Get the logged-in user's referral code (auth required)
router.get('/my-code', authMiddleware, ReferralController.getMyCode);

// Validate a referral code (public — used before registration)
router.get('/validate/:code', ReferralController.validateCode);

export default router;
