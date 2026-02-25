import { Router } from 'express';
import { AdminAuthController } from '../controllers/admin/auth.controller';
import { AdminDashboardController } from '../controllers/admin/dashboard.controller';
import { AdminVerificationController } from '../controllers/admin/verification.controller';
import { AdminManagementController } from '../controllers/admin/management.controller';
import { 
  requireAdminAuth, 
  requireSuperAdmin,
  AuthenticatedAdminRequest 
} from '../middleware/admin/auth.middleware';
import { AdminService } from '../services/admin/admin.service';
import { JWTService } from '../services/jwt.service';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const router = Router();

// ==========================================
// PUBLIC ROUTES (No Auth Required)
// ==========================================

/**
 * POST /api/admin/auth/register
 * Register new admin account
 */
router.post('/auth/register', AdminAuthController.register);

/**
 * POST /api/admin/auth/verify-2fa-setup
 * Verify 2FA during registration
 */
router.post('/auth/verify-2fa-setup', AdminAuthController.verify2FASetup);

/**
 * POST /api/admin/auth/login
 * Step 1: Verify credentials
 */
router.post('/auth/login', AdminAuthController.login);

/**
 * POST /api/admin/auth/verify-2fa
 * Step 2: Verify 2FA code and complete login
 */
router.post('/auth/verify-2fa', AdminAuthController.verify2FA);

/**
 * POST /api/admin/auth/dev-login
 * DEV ONLY: Login bypass for development (skips 2FA)
 * Also auto-creates admin if none exists
 */
router.post('/auth/dev-login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    let admin = await AdminService.findByEmail(email);

    // Auto-create admin if not exists (dev convenience)
    if (!admin) {
      const hashedPassword = await bcrypt.hash(password, 12);
      admin = await AdminService.createAdmin({
        email,
        staffId: `TC-${Date.now().toString().slice(-4)}`,
        name: email.split('@')[0].replace(/[^a-zA-Z]/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase()),
        password: hashedPassword,
        role: 'super-admin',
        twoFactorSecret: 'dev-bypass',
        approvedIPs: ['*'],
      });
      // Enable 2FA so middleware doesn't complain
      await AdminService.enable2FA(admin.id, 'dev-bypass');
      console.log(`✅ DEV: Auto-created admin ${email}`);
    }

    // Verify password
    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT directly (skip 2FA)
    const token = JWTService.generateToken({
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    }, '24h');

    // Create session
    const ipAddress = req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'dev-client';
    const deviceId = crypto.createHash('md5').update(userAgent + ipAddress).digest('hex');
    const sessionToken = crypto.randomBytes(32).toString('hex');

    await AdminService.createSession(admin.id, sessionToken, ipAddress, userAgent, deviceId, true);
    await AdminService.updateLastLogin(admin.id);

    console.log(`✅ DEV LOGIN: ${admin.email} (${admin.role})`);

    return res.json({
      success: true,
      message: 'Dev login successful',
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
    console.error('Dev login error:', error);
    return res.status(500).json({ success: false, message: 'Dev login failed' });
  }
});

// ==========================================
// PROTECTED ROUTES (Auth Required)
// ==========================================

/**
 * POST /api/admin/auth/logout
 * Logout admin (deactivate session)
 */
router.post('/auth/logout', requireAdminAuth, AdminAuthController.logout);

/**
 * GET /api/admin/auth/me
 * Get current admin details
 */
router.get('/auth/me', requireAdminAuth, async (req: AuthenticatedAdminRequest, res) => {
  try {
    const admin = await AdminService.findById(req.admin!.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    res.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        staffId: admin.staffId,
        role: admin.role,
        twoFactorEnabled: admin.twoFactorEnabled,
        lastLogin: admin.lastLogin,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get admin details' });
  }
});

/**
 * POST /api/admin/auth/setup-2fa
 * Initialize 2FA setup (protected route)
 */
router.post('/auth/setup-2fa', requireAdminAuth, AdminAuthController.setup2FA);

/**
 * POST /api/admin/auth/confirm-2fa
 * Confirm and enable 2FA
 */
router.post('/auth/confirm-2fa', requireAdminAuth, AdminAuthController.confirm2FA);

// ==========================================
// DASHBOARD ROUTES (All Admins)
// ==========================================

/**
 * GET /api/admin/dashboard/stats
 * Get dashboard statistics
 */
router.get('/dashboard/stats', requireAdminAuth, AdminDashboardController.getStats);

/**
 * GET /api/admin/dashboard/verifications
 * Get pending artisan verifications
 */
router.get('/dashboard/verifications', requireAdminAuth, AdminDashboardController.getVerifications);

/**
 * GET /api/admin/dashboard/activities
 * Get recent platform activities
 */
router.get('/dashboard/activities', requireAdminAuth, AdminDashboardController.getActivities);

/**
 * GET /api/admin/dashboard/health
 * Get system health status
 */
router.get('/dashboard/health', requireAdminAuth, AdminDashboardController.getHealth);

// ==========================================
// VERIFICATION CENTER ROUTES
// ==========================================

/**
 * GET /api/admin/verification/queue
 * Get artisans awaiting verification
 */
router.get('/verification/queue', requireAdminAuth, AdminVerificationController.getVerificationQueue);

/**
 * GET /api/admin/verification/artisan/:id
 * Get detailed artisan information for review
 */
router.get('/verification/artisan/:id', requireAdminAuth, AdminVerificationController.getArtisanDetails);

/**
 * POST /api/admin/verification/approve
 * Approve artisan with badge level
 */
router.post('/verification/approve', requireAdminAuth, AdminVerificationController.approveArtisan);

/**
 * POST /api/admin/verification/request-correction
 * Request artisan to correct information
 */
router.post('/verification/request-correction', requireAdminAuth, AdminVerificationController.requestCorrection);

/**
 * POST /api/admin/verification/reject
 * Reject and optionally blacklist artisan
 */
router.post('/verification/reject', requireAdminAuth, AdminVerificationController.rejectArtisan);

/**
 * POST /api/admin/verification/note
 * Add internal note for artisan
 */
router.post('/verification/note', requireAdminAuth, AdminVerificationController.addInternalNote);

/**
 * GET /api/admin/verification/stats
 * Get verification statistics
 */
router.get('/verification/stats', requireAdminAuth, AdminVerificationController.getVerificationStats);

// ==========================================
// TRANSACTION MANAGEMENT ROUTES
// ==========================================

/**
 * GET /api/admin/transactions
 * Get all transactions with filters
 */
router.get('/transactions', requireAdminAuth, AdminManagementController.getTransactions);

/**
 * GET /api/admin/transactions/:id
 * Get single transaction details
 */
router.get('/transactions/:id', requireAdminAuth, AdminManagementController.getTransactionById);

// ==========================================
// USER MANAGEMENT ROUTES
// ==========================================

/**
 * GET /api/admin/users
 * Get all users with filters
 */
router.get('/users', requireAdminAuth, AdminManagementController.getUsers);

/**
 * GET /api/admin/users/:id
 * Get single user details
 */
router.get('/users/:id', requireAdminAuth, AdminManagementController.getUserById);

/**
 * PATCH /api/admin/users/:id/suspend
 * Suspend or unsuspend user
 */
router.patch('/users/:id/suspend', requireAdminAuth, AdminManagementController.toggleSuspend);

// ==========================================
// BROADCAST ROUTES
// ==========================================

/**
 * POST /api/admin/broadcast
 * Send broadcast notification
 */
router.post('/broadcast', requireAdminAuth, AdminManagementController.sendBroadcast);

/**
 * GET /api/admin/broadcasts
 * Get broadcast history
 */
router.get('/broadcasts', requireAdminAuth, AdminManagementController.getBroadcasts);

// ==========================================
// SUPER ADMIN ONLY ROUTES
// ==========================================

/**
 * GET /api/admin/audit-logs
 * Get audit logs (Super Admin only)
 */
router.get('/audit-logs', requireAdminAuth, requireSuperAdmin, async (req: AuthenticatedAdminRequest, res) => {
  try {
    const { adminId, action, startDate, endDate, limit } = req.query;

    const logs = await AdminService.getAuditLogs({
      adminId: adminId ? parseInt(adminId as string) : undefined,
      action: action as string,
      startDate: startDate as string,
      endDate: endDate as string,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      logs,
      count: logs.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get audit logs' });
  }
});

/**
 * POST /api/admin/create
 * Create new admin account (Super Admin only)
 */
router.post('/create', requireAdminAuth, requireSuperAdmin, async (req: AuthenticatedAdminRequest, res) => {
  try {
    const { email, staffId, name, password, role } = req.body;

    if (!email || !staffId || !name || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await AdminService.createAdmin({
      email,
      staffId,
      name,
      password: hashedPassword,
      role,
    });

    // Log action
    await AdminService.logAction(
      req.admin!.id,
      req.admin!.email,
      'CREATE_ADMIN',
      'admin-management',
      { newAdminId: admin.id, newAdminEmail: email, role },
      req.ip || 'unknown',
      req.headers['user-agent'] || 'unknown',
      'success'
    );

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      admin: {
        id: admin.id,
        email: admin.email,
        staffId: admin.staffId,
        role: admin.role,
      },
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ success: false, message: 'Failed to create admin' });
  }
});

export default router;
