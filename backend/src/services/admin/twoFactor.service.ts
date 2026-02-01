import speakeasy from 'speakeasy';
import qrcode from 'qrcode';

/**
 * Two-Factor Authentication Service
 * Uses TOTP (Time-based One-Time Password) with Google Authenticator
 */

export class TwoFactorService {
  /**
   * Generate a new 2FA secret for an admin
   */
  static generateSecret(adminEmail: string): {
    secret: string;
    otpauth_url: string;
  } {
    const secret = speakeasy.generateSecret({
      name: `TrustConnect Admin (${adminEmail})`,
      issuer: 'TrustConnect',
      length: 32,
    });

    return {
      secret: secret.base32,
      otpauth_url: secret.otpauth_url!,
    };
  }

  /**
   * Generate QR code for Google Authenticator setup
   */
  static async generateQRCode(otpauth_url: string): Promise<string> {
    try {
      const qrCodeDataURL = await qrcode.toDataURL(otpauth_url);
      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify a 2FA token
   */
  static verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps before/after for clock drift
    });
  }

  /**
   * Generate a backup code (for emergency access)
   */
  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }
}
