import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface TokenPayload {
  userId: number;
  phone: string;
  role: 'customer' | 'artisan';
}

export class JWTService {
  static generateToken(payload: TokenPayload): string {
    // @ts-ignore - jsonwebtoken types are too strict
    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiry,
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
