import { Request, Response } from 'express';
import { collections } from '../database/connection';

const REFERRAL_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateUniqueCode(): string {
  let code = 'TC';
  for (let i = 0; i < 6; i++) {
    code += REFERRAL_CHARS[Math.floor(Math.random() * REFERRAL_CHARS.length)];
  }
  return code;
}

async function ensureUniqueCode(): Promise<string> {
  let attempts = 0;
  while (attempts < 20) {
    const code = generateUniqueCode();
    const existing = await collections.users().findOne({ referralCode: code });
    if (!existing) return code;
    attempts++;
  }
  // Fallback with timestamp suffix
  return 'TC' + Date.now().toString(36).toUpperCase().slice(-6);
}

export class ReferralController {
  /**
   * GET /api/referral/my-code
   * Returns the logged-in user's referral code (generates one if missing)
   */
  static async getMyCode(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const user = await collections.users().findOne({ id: userId });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      let code = user.referralCode;
      if (!code) {
        code = await ensureUniqueCode();
        await collections.users().updateOne(
          { id: userId },
          { $set: { referralCode: code, updatedAt: new Date().toISOString() } }
        );
      }

      res.json({
        success: true,
        code,
        link: `https://trustconnect.ng/invite/${code}`,
      });
    } catch (error: any) {
      console.error('getMyCode error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to get referral code' });
    }
  }

  /**
   * GET /api/referral/validate/:code
   * Validates a referral code and returns the referrer's name
   */
  static async validateCode(req: Request, res: Response) {
    try {
      const { code } = req.params;
      const codeStr = Array.isArray(code) ? code[0] : code;
      if (!codeStr) {
        return res.status(400).json({ success: false, message: 'Code is required' });
      }

      const referrer = await collections.users().findOne({ referralCode: codeStr.toUpperCase() });
      if (!referrer) {
        return res.status(404).json({ success: false, message: 'Invalid referral code' });
      }

      res.json({
        success: true,
        referrerName: referrer.name,
        message: `You were invited by ${referrer.name}! You'll both get 10% off your first job.`,
      });
    } catch (error: any) {
      console.error('validateCode error:', error);
      res.status(500).json({ success: false, message: error.message || 'Validation failed' });
    }
  }
}

// Export the code generator so auth.controller.ts can use it at registration
export { ensureUniqueCode };
