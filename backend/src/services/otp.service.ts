import db from '../database/connection';
import { OTPSession } from '../database/connection';

export class OTPService {
  static async generateOTP(phone: string): Promise<string> {
    const otp = '123456';
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const otpId = db.get('_meta.nextOtpId').value();

    const session: OTPSession = {
      id: otpId,
      phone,
      otp,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    };

    db.get('otpSessions').push(session).write();
    db.set('_meta.nextOtpId', otpId + 1).write();
    this.cleanupExpiredOTPs();

    return otp;
  }

  static async verifyOTP(phone: string, otp: string): Promise<boolean> {
    const session = db.get('otpSessions')
      .find((s: OTPSession) => s.phone === phone && s.otp === otp && new Date(s.expiresAt) > new Date())
      .value();

    if (session) {
      db.get('otpSessions').remove({ id: session.id }).write();
      return true;
    }
    return false;
  }

  static cleanupExpiredOTPs(): void {
    const now = new Date();
    db.get('otpSessions')
      .remove((s: OTPSession) => new Date(s.expiresAt) <= now)
      .write();
  }
}
