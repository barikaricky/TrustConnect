import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';

export interface TokenPayload {
  userId: number;
  phone: string;
  role: 'customer' | 'artisan';
}

export class JWTService {
  static generateToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: config.jwt.expiry,
    };
    return jwt.sign(payload, config.jwt.secret, options);
  }
  
  static verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, config.jwt.secret) as TokenPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
}
