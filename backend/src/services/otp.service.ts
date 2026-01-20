import { db, OTPSession, Database } from '../database/connection';

export class OTPService {
  static async generateOTP(phone: string): Promise<string> {
    const otp = '123456';
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    db.read();
    const data = db.data as Database;
    const session: OTPSession = {
      id: data._meta.nextOtpId++,
      phone,
      otp,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    };

    data.otpSessions.push(session);
    db.write();
    this.cleanupExpiredOTPs();

    return otp;
  }

  static async verifyOTP(phone: string, otp: string): Promise<boolean> {
    db.read();
    const data = db.data as Database;
    const session = data.otpSessions.find(
      (s: OTPSession) => s.phone === phone && s.otp === otp && new Date(s.expiresAt) > new Date()
    );

    if (session) {
      data.otpSessions = data.otpSessions.filter((s: OTPSession) => s.id !== session.id);
      db.write();
      return true;
    }
    return false;
  }

  static cleanupExpiredOTPs(): void {
    db.read();
    const data = db.data as Database;
    data.otpSessions = data.otpSessions.filter((s: OTPSession) => new Date(s.expiresAt) > new Date());
    db.write();
  }
}
