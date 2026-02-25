import { Request, Response } from 'express';
import { getDB } from '../../database/connection';

/**
 * Admin Management Controller
 * Handles transactions, user management, and broadcast for admin dashboard
 */
export class AdminManagementController {
  // ==========================================
  // TRANSACTION LOGS
  // ==========================================

  /**
   * GET /api/admin/transactions
   * Get all transactions with filters and pagination
   */
  static async getTransactions(req: Request, res: Response) {
    try {
      const db = getDB();
      const {
        type,
        status,
        search,
        startDate,
        endDate,
        page = '1',
        limit = '20',
      } = req.query;

      const filter: any = {};

      if (type && type !== 'all') {
        filter.type = type;
      }
      if (status && status !== 'all') {
        filter.status = status;
      }
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = startDate as string;
        if (endDate) filter.createdAt.$lte = endDate as string;
      }
      if (search) {
        filter.$or = [
          { id: { $regex: search as string, $options: 'i' } },
          { reference: { $regex: search as string, $options: 'i' } },
          { customerId: { $regex: search as string, $options: 'i' } },
          { artisanId: { $regex: search as string, $options: 'i' } },
        ];
      }

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const skip = (pageNum - 1) * limitNum;

      const [transactions, total] = await Promise.all([
        db.collection('transactions')
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .toArray(),
        db.collection('transactions').countDocuments(filter),
      ]);

      // Enrich with user names
      const enriched = await Promise.all(
        transactions.map(async (txn: any) => {
          const customer = txn.customerId
            ? await db.collection('users').findOne({ id: txn.customerId })
            : null;
          const artisan = txn.artisanId
            ? await db.collection('users').findOne({ id: txn.artisanId })
            : null;

          return {
            ...txn,
            customerName: customer?.name || 'Unknown',
            artisanName: artisan?.name || 'Unknown',
          };
        })
      );

      // Get summary stats
      const stats = await db.collection('transactions').aggregate([
        {
          $group: {
            _id: null,
            totalVolume: { $sum: '$amount' },
            totalEscrow: {
              $sum: {
                $cond: [{ $eq: ['$status', 'held_in_escrow'] }, '$amount', 0],
              },
            },
            totalReleased: {
              $sum: {
                $cond: [{ $eq: ['$status', 'released'] }, '$amount', 0],
              },
            },
            totalRefunded: {
              $sum: {
                $cond: [{ $eq: ['$status', 'refunded'] }, '$amount', 0],
              },
            },
            count: { $sum: 1 },
          },
        },
      ]).toArray();

      res.json({
        success: true,
        transactions: enriched,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
        summary: stats[0] || {
          totalVolume: 0,
          totalEscrow: 0,
          totalReleased: 0,
          totalRefunded: 0,
          count: 0,
        },
      });
    } catch (error) {
      console.error('Get transactions error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
    }
  }

  /**
   * GET /api/admin/transactions/:id
   * Get single transaction details
   */
  static async getTransactionById(req: Request, res: Response) {
    try {
      const db = getDB();
      const { id } = req.params;

      const transaction = await db.collection('transactions').findOne({
        $or: [{ id }, { reference: id }],
      });

      if (!transaction) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }

      const customer = transaction.customerId
        ? await db.collection('users').findOne({ id: transaction.customerId })
        : null;
      const artisan = transaction.artisanId
        ? await db.collection('users').findOne({ id: transaction.artisanId })
        : null;

      res.json({
        success: true,
        transaction: {
          ...transaction,
          customerName: customer?.name || 'Unknown',
          artisanName: artisan?.name || 'Unknown',
        },
      });
    } catch (error) {
      console.error('Get transaction by ID error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch transaction' });
    }
  }

  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  /**
   * GET /api/admin/users
   * Get all users with filters and pagination
   */
  static async getUsers(req: Request, res: Response) {
    try {
      const db = getDB();
      const {
        role,
        status,
        search,
        page = '1',
        limit = '20',
      } = req.query;

      const filter: any = {};

      if (role && role !== 'all') {
        filter.role = role;
      }
      if (status === 'verified') {
        filter.verified = true;
      } else if (status === 'unverified') {
        filter.verified = false;
      } else if (status === 'suspended') {
        filter.suspended = true;
      }
      if (search) {
        filter.$or = [
          { name: { $regex: search as string, $options: 'i' } },
          { phone: { $regex: search as string, $options: 'i' } },
          { email: { $regex: search as string, $options: 'i' } },
        ];
      }

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const skip = (pageNum - 1) * limitNum;

      const [users, total] = await Promise.all([
        db.collection('users')
          .find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .toArray(),
        db.collection('users').countDocuments(filter),
      ]);

      // Enrich artisans with profile data
      const enriched = await Promise.all(
        users.map(async (user: any) => {
          let artisanProfile = null;
          if (user.role === 'artisan') {
            artisanProfile = await db.collection('artisanProfiles').findOne({ userId: user.id });
          }
          return {
            id: user.id,
            name: user.name,
            phone: user.phone,
            email: user.email || null,
            role: user.role,
            verified: user.verified || false,
            suspended: user.suspended || false,
            createdAt: user.createdAt,
            avatar: user.avatar || null,
            walletBalance: user.walletBalance || 0,
            artisanProfile: artisanProfile
              ? {
                  trade: artisanProfile.primarySkill || artisanProfile.skillCategory,
                  verificationStatus: artisanProfile.verificationStatus,
                  yearsExperience: artisanProfile.yearsExperience,
                }
              : null,
          };
        })
      );

      // Get user stats
      const [totalUsers, totalArtisans, totalCustomers, suspendedUsers] = await Promise.all([
        db.collection('users').countDocuments({}),
        db.collection('users').countDocuments({ role: 'artisan' }),
        db.collection('users').countDocuments({ role: 'customer' }),
        db.collection('users').countDocuments({ suspended: true }),
      ]);

      res.json({
        success: true,
        users: enriched,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
        stats: {
          totalUsers,
          totalArtisans,
          totalCustomers,
          suspendedUsers,
        },
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
  }

  /**
   * GET /api/admin/users/:id
   * Get single user details
   */
  static async getUserById(req: Request, res: Response) {
    try {
      const db = getDB();
      const { id } = req.params;

      const user = await db.collection('users').findOne({ id });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      let artisanProfile = null;
      if (user.role === 'artisan') {
        artisanProfile = await db.collection('artisanProfiles').findOne({ userId: user.id });
      }

      // Get user's bookings count
      const bookingsCount = await db.collection('bookings').countDocuments({
        $or: [{ customerId: id }, { artisanId: id }],
      });

      // Get user's transaction count and total
      const txnStats = await db.collection('transactions').aggregate([
        {
          $match: {
            $or: [{ customerId: id }, { artisanId: id }],
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]).toArray();

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email || null,
          role: user.role,
          verified: user.verified || false,
          suspended: user.suspended || false,
          createdAt: user.createdAt,
          avatar: user.avatar || null,
          walletBalance: user.walletBalance || 0,
          escrowAmount: user.escrowAmount || 0,
          artisanProfile,
          stats: {
            bookings: bookingsCount,
            transactions: txnStats[0]?.count || 0,
            totalTransactionValue: txnStats[0]?.total || 0,
          },
        },
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch user' });
    }
  }

  /**
   * PATCH /api/admin/users/:id/suspend
   * Suspend or unsuspend a user
   */
  static async toggleSuspend(req: Request, res: Response) {
    try {
      const db = getDB();
      const { id } = req.params;
      const { suspended, reason } = req.body;

      const user = await db.collection('users').findOne({ id });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      await db.collection('users').updateOne(
        { id },
        {
          $set: {
            suspended: !!suspended,
            suspendedAt: suspended ? new Date().toISOString() : null,
            suspensionReason: suspended ? reason || 'Admin action' : null,
          },
        }
      );

      console.log(`${suspended ? '🚫' : '✅'} User ${user.name} (${id}) ${suspended ? 'suspended' : 'unsuspended'}`);

      res.json({
        success: true,
        message: `User ${suspended ? 'suspended' : 'unsuspended'} successfully`,
      });
    } catch (error) {
      console.error('Toggle suspend error:', error);
      res.status(500).json({ success: false, message: 'Failed to update user status' });
    }
  }

  // ==========================================
  // BROADCAST / NOTIFICATIONS
  // ==========================================

  /**
   * POST /api/admin/broadcast
   * Send broadcast notification to users
   */
  static async sendBroadcast(req: Request, res: Response) {
    try {
      const db = getDB();
      const { title, message, target, targetRole } = req.body;

      if (!title || !message) {
        return res.status(400).json({
          success: false,
          message: 'Title and message are required',
        });
      }

      // Determine target audience
      const filter: any = {};
      if (target === 'artisans') {
        filter.role = 'artisan';
      } else if (target === 'customers') {
        filter.role = 'customer';
      }
      // 'all' users = no filter

      const targetCount = await db.collection('users').countDocuments(filter);

      // Store broadcast record
      const broadcast = {
        id: `broadcast-${Date.now()}`,
        title,
        message,
        target: target || 'all',
        targetCount,
        sentBy: (req as any).admin?.email || 'admin',
        sentAt: new Date().toISOString(),
        status: 'sent',
      };

      await db.collection('broadcasts').insertOne(broadcast);

      // In production: send push notifications via FCM/APNs here
      console.log(`📢 Broadcast sent: "${title}" to ${targetCount} ${target || 'all'} users`);

      res.json({
        success: true,
        message: `Broadcast sent to ${targetCount} users`,
        broadcast,
      });
    } catch (error) {
      console.error('Send broadcast error:', error);
      res.status(500).json({ success: false, message: 'Failed to send broadcast' });
    }
  }

  /**
   * GET /api/admin/broadcasts
   * Get broadcast history
   */
  static async getBroadcasts(req: Request, res: Response) {
    try {
      const db = getDB();
      const { page = '1', limit = '20' } = req.query;

      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 20;
      const skip = (pageNum - 1) * limitNum;

      const [broadcasts, total] = await Promise.all([
        db.collection('broadcasts')
          .find({})
          .sort({ sentAt: -1 })
          .skip(skip)
          .limit(limitNum)
          .toArray(),
        db.collection('broadcasts').countDocuments({}),
      ]);

      res.json({
        success: true,
        broadcasts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('Get broadcasts error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch broadcasts' });
    }
  }
}
