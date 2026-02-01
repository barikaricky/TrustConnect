import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AdminService } from '../../services/admin/admin.service';
import { TwoFactorService } from '../../services/admin/twoFactor.service';
import { JWTService } from '../../services/jwt.service';

/**
 * Admin Authentication Controller
 * High-security login with 2FA and device tracking
 */

export class AdminAuthController {
  /**
   * POST /api/admin/auth/register
   * Register a new admin account
   */
  static async register(req: Request, res: Response) {
    try {
      const { email, staffId, name, password, role } = req.body;

      // Validate input
      if (!email || !staffId || !name || !password || !role) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required',
        });
      }

      // Validate email domain
      if (!email.endsWith('@trustconnect.com')) {
        return res.status(400).json({
          success: false,
          message: 'Email must be a @trustconnect.com address',
        });
      }

      // Check if admin already exists
      const existingAdmin = await AdminService.findByEmail(email);
      if (existingAdmin) {
        return res.status(409).json({
          success: false,
          message: 'Admin with this email already exists',
        });
      }

      // Check if staff ID already exists
      const existingStaffId = await AdminService.findByStaffId(staffId);
      if (existingStaffId) {
        return res.status(409).json({
          success: false,
          message: 'Staff ID already in use',
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Generate 2FA secret
      const { secret, otpauth_url } = TwoFactorService.generateSecret(email);

      // Generate QR code
      const qrCode = await TwoFactorService.generateQRCode(otpauth_url);

      // Get registration IP address
      const registrationIP = req.ip || req.socket.remoteAddress || '127.0.0.1';

      // Create admin account with registration IP pre-approved
      await AdminService.createAdmin({
        email,
        staffId,
        name,
        password: hashedPassword,
        role,
        twoFactorSecret: secret,
        approvedIPs: [registrationIP], // Auto-approve registration IP
      });

      console.log(`✅ Admin ${email} registered with auto-approved IP: ${registrationIP}`);

      return res.status(201).json({
        success: true,
        message: 'Admin account created. Please setup 2FA.',
        qrCode,
        secret,
      });
    } catch (error) {
      console.error('Admin registration error:', error);
      return res.status(500).json({
        success: false,
        message: 'Registration failed',
      });
    }
  }

  /**
   * POST /api/admin/auth/verify-2fa-setup
   * Verify and complete 2FA setup during registration
   */
  static async verify2FASetup(req: Request, res: Response) {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({
          success: false,
          message: 'Email and verification code are required',
        });
      }

      // Find admin
      const admin = await AdminService.findByEmail(email);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found',
        });
      }

      if (!admin.twoFactorSecret) {
        return res.status(400).json({
          success: false,
          message: '2FA not initialized',
        });
      }

      // Verify code
      const isValid = TwoFactorService.verifyToken(admin.twoFactorSecret, code);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid verification code',
        });
      }

      // Enable 2FA for admin
      await AdminService.enable2FA(admin.id, admin.twoFactorSecret);

      return res.status(200).json({
        success: true,
        message: 'Registration completed successfully. You can now login.',
      });
    } catch (error) {
      console.error('2FA setup verification error:', error);
      return res.status(500).json({
        success: false,
        message: '2FA verification failed',
      });
    }
  }

  /**
   * POST /api/admin/auth/login
   * Step 1: Verify credentials
   */
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
      }

      // Find admin
      const admin = await AdminService.findByEmail(email);
      if (!admin) {
        // Log failed attempt
        await AdminService.logAction(
          0,
          email,
          'LOGIN_ATTEMPT',
          'admin-auth',
          { reason: 'User not found' },
          ipAddress,
          userAgent,
          'failure'
        );

        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Check if admin is active
      if (!admin.isActive) {
        await AdminService.logAction(
          admin.id,
          admin.email,
          'LOGIN_ATTEMPT',
          'admin-auth',
          { reason: 'Account inactive' },
          ipAddress,
          userAgent,
          'blocked'
        );

        return res.status(403).json({
          success: false,
          message: 'Account is inactive. Contact system administrator.',
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, admin.password);
      if (!isPasswordValid) {
        await AdminService.logAction(
          admin.id,
          admin.email,
          'LOGIN_ATTEMPT',
          'admin-auth',
          { reason: 'Invalid password' },
          ipAddress,
          userAgent,
          'failure'
        );

        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      // Check IP restrictions (for non-super-admins)
      const deviceId = crypto.createHash('md5').update(userAgent + ipAddress).digest('hex');
      let isIPApproved = await AdminService.isIPApproved(admin.id, ipAddress);
      const isDeviceApproved = await AdminService.isDeviceApproved(admin.id, deviceId);

      // Auto-approve first login IP if no IPs are approved yet (for newly registered admins)
      if (!isIPApproved && admin.approvedIPs.length === 0 && admin.role !== 'super-admin') {
        await AdminService.addApprovedIP(admin.id, ipAddress);
        isIPApproved = true;
        console.log(`✅ Auto-approved first login IP for ${admin.email}: ${ipAddress}`);
      }

      if (!isIPApproved && admin.role !== 'super-admin') {
        // Send alert to super admin
        console.warn(`⚠️ SECURITY ALERT: Admin ${admin.email} attempted login from unapproved IP: ${ipAddress}`);
        
        await AdminService.logAction(
          admin.id,
          admin.email,
          'LOGIN_ATTEMPT',
          'admin-auth',
          { 
            reason: 'Unapproved IP address',
            ipAddress,
            deviceId,
          },
          ipAddress,
          userAgent,
          'blocked'
        );

        return res.status(403).json({
          success: false,
          message: 'Login blocked: Unapproved location. An alert has been sent to the system administrator.',
          requiresApproval: true,
        });
      }

      // Generate temporary token for 2FA step
      const tempToken = crypto.randomBytes(32).toString('hex');

      // Store temp token in memory or Redis (for production)
      // For now, we'll include it in a JWT with short expiry
      const twoFactorToken = JWTService.generateToken(
        {
          adminId: admin.id,
          email: admin.email,
          tempToken,
          step: '2fa-pending',
        },
        '5m' // 5 minutes to complete 2FA
      );

      await AdminService.logAction(
        admin.id,
        admin.email,
        'LOGIN_CREDENTIALS_VERIFIED',
        'admin-auth',
        { ipAddress, deviceId },
        ipAddress,
        userAgent,
        'success'
      );

      // Return response requiring 2FA
      return res.status(200).json({
        success: true,
        message: '2FA verification required',
        requires2FA: admin.twoFactorEnabled,
        twoFactorToken,
        deviceApproved: isDeviceApproved,
      });
    } catch (error) {
      console.error('Admin login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Login failed',
      });
    }
  }

  /**
   * POST /api/admin/auth/verify-2fa
   * Step 2: Verify 2FA code
   */
  static async verify2FA(req: Request, res: Response) {
    try {
      const { twoFactorToken, code, rememberDevice } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';

      if (!twoFactorToken || !code) {
        return res.status(400).json({
          success: false,
          message: '2FA token and code are required',
        });
      }

      // Verify temp token
      const decoded = JWTService.verifyToken(twoFactorToken);
      if (!decoded || decoded.step !== '2fa-pending' || !decoded.adminId) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired 2FA token',
        });
      }

      // Get admin
      const admin = await AdminService.findById(decoded.adminId!);
      if (!admin || !admin.twoFactorEnabled || !admin.twoFactorSecret) {
        return res.status(401).json({
          success: false,
          message: 'Invalid authentication state',
        });
      }

      // Verify 2FA code
      const isCodeValid = TwoFactorService.verifyToken(admin.twoFactorSecret, code);
      if (!isCodeValid) {
        await AdminService.logAction(
          admin.id,
          admin.email,
          '2FA_VERIFICATION',
          'admin-auth',
          { reason: 'Invalid 2FA code' },
          ipAddress,
          userAgent,
          'failure'
        );

        return res.status(401).json({
          success: false,
          message: 'Invalid 2FA code',
        });
      }

      // Generate final JWT token
      const token = JWTService.generateToken({
        adminId: admin.id,
        email: admin.email,
        role: admin.role,
      }, '8h'); // 8-hour session

      // Create session
      const deviceId = crypto.createHash('md5').update(userAgent + ipAddress).digest('hex');
      const sessionToken = crypto.randomBytes(32).toString('hex');
      
      await AdminService.createSession(
        admin.id,
        sessionToken,
        ipAddress,
        userAgent,
        deviceId,
        rememberDevice
      );

      // Update last login
      await AdminService.updateLastLogin(admin.id);

      // If remember device, add to approved devices
      if (rememberDevice) {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        await AdminService.addApprovedDevice(admin.id, {
          deviceId,
          deviceName: userAgent.split(' ')[0] || 'Unknown Device',
          userAgent,
          approvedAt: new Date().toISOString(),
          expiresAt,
        });
      }

      await AdminService.logAction(
        admin.id,
        admin.email,
        'LOGIN_SUCCESS',
        'admin-auth',
        { ipAddress, deviceId, rememberDevice },
        ipAddress,
        userAgent,
        'success'
      );

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        sessionToken,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          staffId: admin.staffId,
        },
      });
    } catch (error) {
      console.error('2FA verification error:', error);
      return res.status(500).json({
        success: false,
        message: '2FA verification failed',
      });
    }
  }

  /**
   * POST /api/admin/auth/setup-2fa
   * Setup 2FA for admin account
   */
  static async setup2FA(req: Request, res: Response) {
    try {
      const { adminId } = req.body;

      const admin = await AdminService.findById(adminId);
      if (!admin) {
        return res.status(404).json({
          success: false,
          message: 'Admin not found',
        });
      }

      // Generate 2FA secret
      const { secret, otpauth_url } = TwoFactorService.generateSecret(admin.email);

      // Generate QR code
      const qrCode = await TwoFactorService.generateQRCode(otpauth_url);

      // Generate backup codes
      const backupCodes = TwoFactorService.generateBackupCodes();

      return res.status(200).json({
        success: true,
        message: '2FA setup initiated',
        secret,
        qrCode,
        backupCodes,
      });
    } catch (error) {
      console.error('2FA setup error:', error);
      return res.status(500).json({
        success: false,
        message: '2FA setup failed',
      });
    }
  }

  /**
   * POST /api/admin/auth/confirm-2fa
   * Confirm 2FA setup
   */
  static async confirm2FA(req: Request, res: Response) {
    try {
      const { adminId, secret, code } = req.body;

      if (!adminId || !secret || !code) {
        return res.status(400).json({
          success: false,
          message: 'Admin ID, secret, and verification code are required',
        });
      }

      // Verify code
      const isValid = TwoFactorService.verifyToken(secret, code);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid verification code',
        });
      }

      // Enable 2FA for admin
      await AdminService.enable2FA(adminId, secret);

      return res.status(200).json({
        success: true,
        message: '2FA enabled successfully',
      });
    } catch (error) {
      console.error('2FA confirmation error:', error);
      return res.status(500).json({
        success: false,
        message: '2FA confirmation failed',
      });
    }
  }

  /**
   * POST /api/admin/auth/logout
   * Logout admin
   */
  static async logout(req: Request, res: Response) {
    try {
      const sessionToken = req.headers['x-session-token'] as string;

      if (sessionToken) {
        await AdminService.deactivateSession(sessionToken);
      }

      return res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({
        success: false,
        message: 'Logout failed',
      });
    }
  }
}
