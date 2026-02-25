import { collections, getNextSequence, OTPSession } from '../database/connection';

export class OTPService {
  static async generateOTP(phone: string): Promise<string> {
    const otp = '1234';
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const id = await getNextSequence('otpId');

    // Remove any existing OTP for this phone first
    await collections.otpSessions().deleteMany({ phone });

    const session: OTPSession = {
      id,
      phone,
      otp,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    };

    await collections.otpSessions().insertOne(session);
    console.log(`📱 OTP generated for ${phone}: ${otp} (expires: ${expiresAt.toISOString()})`);

    return otp;
  }

  static async verifyOTP(phone: string, otp: string): Promise<boolean> {
    // In dev mode, always accept 1234 for any phone
    if (otp === '1234') {
      console.log(`✅ OTP verified (dev mode) for ${phone}`);
      // Clean up any sessions for this phone
      await collections.otpSessions().deleteMany({ phone });
      return true;
    }

    // Production verification: check the DB session
    const session = await collections.otpSessions().findOne({ phone, otp });

    if (session) {
      // Check expiry manually (more reliable than string comparison)
      const expiresAt = new Date(session.expiresAt);
      if (expiresAt > new Date()) {
        await collections.otpSessions().deleteOne({ id: session.id });
        console.log(`✅ OTP verified from DB for ${phone}`);
        return true;
      } else {
        console.log(`❌ OTP expired for ${phone}`);
        await collections.otpSessions().deleteOne({ id: session.id });
        return false;
      }
    }

    console.log(`❌ OTP not found for ${phone} with code ${otp}`);
    return false;
  }

  static async cleanupExpiredOTPs(): Promise<void> {
    const now = new Date().toISOString();
    await collections.otpSessions().deleteMany({
      expiresAt: { $lte: now },
    });
  }
}
