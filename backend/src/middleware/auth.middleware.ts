import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../services/jwt.service';

/**
 * Authentication middleware
 * Validates JWT token and attaches user info to request
 */

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    const payload = JWTService.verifyToken(token);
    (req as any).user = payload;
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
}
