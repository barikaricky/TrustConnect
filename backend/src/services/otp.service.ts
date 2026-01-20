import { config } from '../config';
import pool from '../database/connection';

/**
 * OTP Service - MVP Implementation with Mocked OTP
 * 
 * ⚠️ TEMPORARY: For MVP, all OTPs are mocked with the same value
 * This will be replaced with real SMS integration (Twilio/Termii) in production
 */

export class OTPService {
  /**
   * Generate OTP for a phone number
   * MVP: Returns mocked OTP value for all numbers
   */
  static async generateOTP(phone: string): Promise<string> {
    const otp = config.otp.mockValue; // Mock OTP for MVP
    const expiresAt = new Date(Date.now() + config.otp.expiryMinutes * 60 * 1000);
    
    // Store OTP in database
    await pool.query(
      `INSERT INTO otp_sessions (phone, otp, expires_at) 
       VALUES ($1, $2, $3)`,
      [phone, otp, expiresAt]
    );
    
    console.log(`📱 OTP generated for ${phone}: ${otp} (MOCKED)`);
    
    return otp;
  }
  
  /**
   * Verify OTP for a phone number
   */
  static async verifyOTP(phone: string, otp: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT * FROM otp_sessions 
       WHERE phone = $1 AND otp = $2 AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [phone, otp]
    );
    
    if (result.rows.length === 0) {
      return false;
    }
    
    // Delete used OTP
    await pool.query(
      `DELETE FROM otp_sessions WHERE phone = $1`,
      [phone]
    );
    
    return true;
  }
  
  /**
   * Clean up expired OTPs
   */
  static async cleanupExpiredOTPs(): Promise<void> {
    await pool.query(`DELETE FROM otp_sessions WHERE expires_at < NOW()`);
  }
}
