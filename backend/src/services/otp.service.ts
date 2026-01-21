import { collections, getNextSequence, OTPSession } from '../database/connection';

export class OTPService {
  static async generateOTP(phone: string): Promise<string> {
    const otp = '123456';
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const id = await getNextSequence('otpId');

    const session: OTPSession = {
      id,
      phone,
      otp,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    };

    await collections.otpSessions().insertOne(session);
    await this.cleanupExpiredOTPs();

    return otp;
  }

  static async verifyOTP(phone: string, otp: string): Promise<boolean> {
    const session = await collections.otpSessions().findOne({
      phone,
      otp,
      expiresAt: { $gt: new Date().toISOString() },
    });

    if (session) {
      await collections.otpSessions().deleteOne({ id: session.id });
      return true;
    }
    return false;
  }

  static async cleanupExpiredOTPs(): Promise<void> {
    await collections.otpSessions().deleteMany({
      expiresAt: { $lte: new Date().toISOString() },
    });
  }
}
