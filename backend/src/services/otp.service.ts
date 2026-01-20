import { db, OTPSession } from '../database/connection';

export class OTPService {
  static async generateOTP(phone: string): Promise<string> {
    const otp = '123456';
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    
    await db.read();
    const session: OTPSession = {
      id: db.data!._meta.nextOtpId++,
      phone,
      otp,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    };
    
    db.data!.otpSessions.push(session);
    await db.write();
    await this.cleanupExpiredOTPs();
    
    return otp;
  }
  
  static async verifyOTP(phone: string, otp: string): Promise<boolean> {
    await db.read();
    const session = db.data!.otpSessions.find(
      s => s.phone === phone && s.otp === otp && new Date(s.expiresAt) > new Date()
    );
    
    if (session) {
      db.data!.otpSessions = db.data!.otpSessions.filter(s => s.id !== session.id);
      await db.write();
      return true;
    }
    return false;
  }
  
  static async cleanupExpiredOTPs(): Promise<void> {
    await db.read();
    db.data!.otpSessions = db.data!.otpSessions.filter(s => new Date(s.expiresAt) > new Date());
    await db.write();
  }
}
