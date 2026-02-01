import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface TokenPayload {
  userId?: number;
  phone?: string;
  role?: string; // Can be 'customer' | 'artisan' | 'super-admin' | 'finance-admin' etc.
  adminId?: number;
  email?: string;
  tempToken?: string;
  step?: string;
  [key: string]: any; // Allow additional properties
}

export class JWTService {
  static generateToken(payload: TokenPayload, expiresIn?: string): string {
    // @ts-ignore - jsonwebtoken types are complex
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: expiresIn || config.jwt.expiry,
    });
  }
  
  static verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}
