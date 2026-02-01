import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../../services/admin/admin.service';
import { JWTService } from '../../services/jwt.service';

/**
 * Admin authentication middleware
 * Verifies admin session token and checks permissions
 */

export interface AuthenticatedAdminRequest extends Request {
  admin?: {
    id: number;
    email: string;
    role: string;
    sessionToken: string;
  };
}

/**
 * Verify admin is authenticated
 */
export const requireAdminAuth = async (
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const sessionToken = req.headers['x-session-token'] as string;

    if (!authHeader || !sessionToken) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No authentication token provided',
      });
    }

    // Verify JWT token
    const token = authHeader.replace('Bearer ', '');
    const decoded = JWTService.verifyToken(token);

    if (!decoded || !decoded.adminId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid token',
      });
    }

    // Verify session is active
    const session = await AdminService.findSession(sessionToken);
    if (!session || session.adminId !== decoded.adminId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Session expired or invalid',
      });
    }

    // Get admin details
    const admin = await AdminService.findById(decoded.adminId);
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Admin account inactive',
      });
    }

    // Attach admin to request
    req.admin = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      sessionToken,
    };

    // Log the action
    await AdminService.logAction(
      admin.id,
      admin.email,
      req.method,
      req.path,
      { body: req.body, query: req.query },
      req.ip || 'unknown',
      req.headers['user-agent'] || 'unknown',
      'success'
    );

    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Authentication failed',
    });
  }
};

/**
 * Require specific admin role(s)
 */
export const requireRole = (...roles: string[]) => {
  return (req: AuthenticatedAdminRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Not authenticated',
      });
    }

    if (!roles.includes(req.admin.role)) {
      AdminService.logAction(
        req.admin.id,
        req.admin.email,
        req.method,
        req.path,
        { attemptedRole: req.admin.role, requiredRoles: roles },
        req.ip || 'unknown',
        req.headers['user-agent'] || 'unknown',
        'blocked'
      );

      return res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient permissions',
        requiredRoles: roles,
        yourRole: req.admin.role,
      });
    }

    next();
  };
};

/**
 * Require Super Admin role
 */
export const requireSuperAdmin = requireRole('super-admin');

/**
 * Require Finance Admin or Super Admin
 */
export const requireFinanceAccess = requireRole('finance-admin', 'super-admin');

/**
 * Require Verification Officer or Super Admin
 */
export const requireVerificationAccess = requireRole('verification-officer', 'super-admin');

/**
 * Require Support Admin or Super Admin
 */
export const requireSupportAccess = requireRole('support-admin', 'super-admin');
