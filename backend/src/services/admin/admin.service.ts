import { collections } from '../../database/connection';

export interface Admin {
  id: number;
  email: string;
  staffId: string;
  name: string;
  password: string;
  role: 'super-admin' | 'verification-officer' | 'support-admin' | 'finance-admin';
  twoFactorSecret?: string;
  twoFactorEnabled: boolean;
  approvedDevices: ApprovedDevice[];
  approvedIPs: string[];
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovedDevice {
  deviceId: string;
  deviceName: string;
  userAgent: string;
  approvedAt: string;
  expiresAt: string;
}

export interface AdminSession {
  id: number;
  adminId: number;
  sessionToken: string;
  ipAddress: string;
  userAgent: string;
  deviceId: string;
  loginAt: string;
  expiresAt: string;
  isActive: boolean;
}

export interface AuditLog {
  id: number;
  adminId: number;
  adminEmail: string;
  action: string;
  resource: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  status: 'success' | 'failure' | 'blocked';
}

export class AdminService {
  /**
   * Find admin by email
   */
  static async findByEmail(email: string): Promise<Admin | null> {
    return await collections.admins().findOne({ email: email.toLowerCase() }) as Admin | null;
  }

  /**
   * Find admin by staff ID
   */
  static async findByStaffId(staffId: string): Promise<Admin | null> {
    return await collections.admins().findOne({ staffId }) as Admin | null;
  }

  /**
   * Find admin by ID
   */
  static async findById(id: number): Promise<Admin | null> {
    return await collections.admins().findOne({ id }) as Admin | null;
  }

  /**
   * Create a new admin (Super Admin only)
   */
  static async createAdmin(data: {
    email: string;
    staffId: string;
    name: string;
    password: string;
    role: Admin['role'];
    twoFactorSecret?: string;
    approvedIPs?: string[];
  }): Promise<Admin> {
    const { getNextSequence } = await import('../../database/connection');
    const id = await getNextSequence('adminId');
    
    const admin: Admin = {
      id,
      email: data.email.toLowerCase(),
      staffId: data.staffId,
      name: data.name,
      password: data.password,
      role: data.role,
      twoFactorSecret: data.twoFactorSecret,
      twoFactorEnabled: false,
      approvedDevices: [],
      approvedIPs: data.approvedIPs || [],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await collections.admins().insertOne(admin);
    return admin;
  }

  /**
   * Enable 2FA for admin
   */
  static async enable2FA(adminId: number, secret: string): Promise<void> {
    await collections.admins().updateOne(
      { id: adminId },
      {
        $set: {
          twoFactorSecret: secret,
          twoFactorEnabled: true,
          updatedAt: new Date().toISOString(),
        },
      }
    );
  }

  /**
   * Add approved device
   */
  static async addApprovedDevice(
    adminId: number,
    device: ApprovedDevice
  ): Promise<void> {
    await collections.admins().updateOne(
      { id: adminId },
      {
        $push: { approvedDevices: device } as any,
        $set: { updatedAt: new Date().toISOString() },
      }
    );
  }

  /**
   * Update last login
   */
  static async updateLastLogin(adminId: number): Promise<void> {
    await collections.admins().updateOne(
      { id: adminId },
      {
        $set: {
          lastLogin: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }
    );
  }

  /**
   * Create admin session
   */
  static async createSession(
    adminId: number,
    sessionToken: string,
    ipAddress: string,
    userAgent: string,
    deviceId: string,
    rememberDevice: boolean = false
  ): Promise<AdminSession> {
    const { getNextSequence } = await import('../../database/connection');
    const id = await getNextSequence('adminSessionId');
    
    // Session expires in 30 minutes by default, 24 hours if remembered
    const expiresIn = rememberDevice ? 24 * 60 * 60 * 1000 : 30 * 60 * 1000;
    const expiresAt = new Date(Date.now() + expiresIn).toISOString();

    const session: AdminSession = {
      id,
      adminId,
      sessionToken,
      ipAddress,
      userAgent,
      deviceId,
      loginAt: new Date().toISOString(),
      expiresAt,
      isActive: true,
    };

    await collections.adminSessions().insertOne(session);
    return session;
  }

  /**
   * Find active session
   */
  static async findSession(sessionToken: string): Promise<AdminSession | null> {
    const session = await collections.adminSessions().findOne({
      sessionToken,
      isActive: true,
    }) as AdminSession | null;

    if (!session) return null;

    // Check if session expired
    if (new Date(session.expiresAt) < new Date()) {
      await this.deactivateSession(sessionToken);
      return null;
    }

    return session;
  }

  /**
   * Deactivate session (logout)
   */
  static async deactivateSession(sessionToken: string): Promise<void> {
    await collections.adminSessions().updateOne(
      { sessionToken },
      { $set: { isActive: false } }
    );
  }

  /**
   * Deactivate all sessions for admin
   */
  static async deactivateAllSessions(adminId: number): Promise<void> {
    await collections.adminSessions().updateMany(
      { adminId, isActive: true },
      { $set: { isActive: false } }
    );
  }

  /**
   * Log admin action for audit trail
   */
  static async logAction(
    adminId: number,
    adminEmail: string,
    action: string,
    resource: string,
    details: any,
    ipAddress: string,
    userAgent: string,
    status: AuditLog['status'] = 'success'
  ): Promise<void> {
    const { getNextSequence } = await import('../../database/connection');
    const id = await getNextSequence('auditLogId');

    const log: AuditLog = {
      id,
      adminId,
      adminEmail,
      action,
      resource,
      details,
      ipAddress,
      userAgent,
      timestamp: new Date().toISOString(),
      status,
    };

    await collections.auditLogs().insertOne(log);
    console.log(`📋 Audit Log: ${adminEmail} - ${action} on ${resource} - ${status}`);
  }

  /**
   * Get audit logs
   */
  static async getAuditLogs(
    filters: {
      adminId?: number;
      action?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    } = {}
  ): Promise<AuditLog[]> {
    const query: any = {};
    
    if (filters.adminId) query.adminId = filters.adminId;
    if (filters.action) query.action = filters.action;
    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) query.timestamp.$gte = filters.startDate;
      if (filters.endDate) query.timestamp.$lte = filters.endDate;
    }

    return await collections.auditLogs()
      .find(query)
      .sort({ timestamp: -1 })
      .limit(filters.limit || 100)
      .toArray() as unknown as AuditLog[];
  }

  /**
   * Check if IP is approved for admin
   */
  static async isIPApproved(adminId: number, ipAddress: string): Promise<boolean> {
    const admin = await this.findById(adminId);
    if (!admin) return false;

    // Super admin can login from anywhere
    if (admin.role === 'super-admin') return true;

    // Check if IP is in approved list
    return admin.approvedIPs.includes(ipAddress);
  }

  /**
   * Check if device is approved and not expired
   */
  static async isDeviceApproved(adminId: number, deviceId: string): Promise<boolean> {
    const admin = await this.findById(adminId);
    if (!admin) return false;

    const device = admin.approvedDevices.find(d => d.deviceId === deviceId);
    if (!device) return false;

    // Check if device approval expired
    return new Date(device.expiresAt) > new Date();
  }

  /**
   * Add approved IP for admin
   */
  static async addApprovedIP(adminId: number, ipAddress: string): Promise<void> {
    const admin = await this.findById(adminId);
    if (!admin) throw new Error('Admin not found');

    // Avoid duplicates
    if (!admin.approvedIPs.includes(ipAddress)) {
      await collections.admins().updateOne(
        { id: adminId },
        { 
          $addToSet: { approvedIPs: ipAddress },
          $set: { updatedAt: new Date().toISOString() }
        }
      );
    }
  }
}
