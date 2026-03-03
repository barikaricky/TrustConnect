import { Request, Response } from 'express';
import { getDB } from '../../database/connection';
import { normalizeImageUrl } from '../../utils/imageUrl';

/**
 * Admin Dashboard Controller
 * Provides real-time stats and data for admin dashboard
 */

export class AdminDashboardController {
  /**
   * GET /api/admin/dashboard/stats
   * Get dashboard statistics
   */
  static async getStats(req: Request, res: Response) {
    try {
      const db = getDB();

      // Get total escrow value
      const escrowResult = await db.collection('transactions').aggregate([
        { $match: { status: 'held_in_escrow' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).toArray();
      const totalEscrowValue = escrowResult[0]?.total || 0;

      // Get yesterday's escrow value for comparison
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const yesterdayEscrowResult = await db.collection('transactions').aggregate([
        { 
          $match: { 
            status: 'held_in_escrow',
            createdAt: { $lt: yesterday.toISOString() }
          } 
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).toArray();
      const yesterdayEscrow = yesterdayEscrowResult[0]?.total || 1;
      const escrowChange = yesterdayEscrow > 0 
        ? ((totalEscrowValue - yesterdayEscrow) / yesterdayEscrow * 100).toFixed(1)
        : 0;

      // Count pending verifications
      const pendingVerifications = await db.collection('users').countDocuments({
        role: 'artisan',
        // Look for artisan profiles with pending verification
      });

      // For now, use artisan profiles collection
      const pendingVerificationsCount = await db.collection('artisanProfiles').countDocuments({
        verificationStatus: 'pending'
      });

      // Count active jobs
      const activeJobs = await db.collection('bookings').countDocuments({
        status: { $in: ['in_progress', 'accepted'] }
      });

      // Count open disputes
      const openDisputes = await db.collection('disputes').countDocuments({
        status: { $in: ['open', 'negotiating', 'escalated'] }
      });

      // Total users
      const totalUsers = await db.collection('users').countDocuments({});
      const totalArtisans = await db.collection('users').countDocuments({ role: 'artisan' });
      const totalCustomers = await db.collection('users').countDocuments({ role: 'customer' });

      // Revenue stats
      const revenueResult = await db.collection('transactions').aggregate([
        { $match: { type: 'commission', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).toArray();
      const totalRevenue = revenueResult[0]?.total || 0;

      // Total transaction volume
      const volumeResult = await db.collection('transactions').aggregate([
        { $match: { status: { $in: ['completed', 'held_in_escrow', 'released'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).toArray();
      const totalVolume = volumeResult[0]?.total || 0;

      // Verified artisans
      const verifiedArtisans = await db.collection('artisanProfiles').countDocuments({
        verificationStatus: 'verified'
      });

      res.json({
        success: true,
        stats: {
          totalEscrowValue,
          escrowChange: parseFloat(escrowChange as string),
          pendingVerifications: pendingVerificationsCount,
          activeJobs,
          openDisputes,
          totalUsers,
          totalArtisans,
          totalCustomers,
          verifiedArtisans,
          totalRevenue,
          totalVolume,
        }
      });
    } catch (error) {
      console.error('Get stats error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch dashboard stats' 
      });
    }
  }

  /**
   * GET /api/admin/dashboard/verifications
   * Get pending artisan verifications
   */
  static async getVerifications(req: Request, res: Response) {
    try {
      const db = getDB();

      // Get 5 most recent pending artisan profiles
      const pendingArtisans = await db.collection('artisanProfiles').find({
        verificationStatus: 'pending'
      })
      .sort({ submittedAt: -1 })
      .limit(5)
      .toArray();

      const verifications = await Promise.all(pendingArtisans.map(async (profile: any) => {
        // Get user details
        const user = await db.collection('users').findOne({ id: profile.userId });
        
        // Determine ID status
        let idStatus = 'Pending';
        if (profile.idType && profile.idNumber) {
          idStatus = `${profile.idType} Submitted`;
        }

        return {
          id: profile.id,
          name: profile.fullName || user?.name || 'Unknown',
          trade: profile.primarySkill || profile.skillCategory || 'Unspecified',
          idStatus,
          submissionTime: profile.submittedAt || profile.createdAt,
          profilePicture: normalizeImageUrl(profile.profilePhotoUrl, req) || normalizeImageUrl(user?.avatar, req)
        };
      }));

      res.json({
        success: true,
        verifications
      });
    } catch (error) {
      console.error('Get verifications error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch verifications' 
      });
    }
  }

  /**
   * GET /api/admin/dashboard/activities
   * Get recent platform activities
   */
  static async getActivities(req: Request, res: Response) {
    try {
      const db = getDB();
      const activities: any[] = [];

      // Get recent artisan registrations (last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recentRegistrations = await db.collection('users').find({
        role: 'artisan',
        createdAt: { $gte: oneDayAgo }
      })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();

      recentRegistrations.forEach((artisan: any) => {
        activities.push({
          id: `reg-${artisan.id}`,
          type: 'registration',
          message: `New Artisan registered: ${artisan.name}`,
          timestamp: artisan.createdAt
        });
      });

      // Get recent transactions
      const recentTransactions = await db.collection('transactions').find()
        .sort({ createdAt: -1 })
        .limit(3)
        .toArray();

      recentTransactions.forEach((transaction: any) => {
        if (transaction.status === 'completed') {
          activities.push({
            id: `txn-${transaction._id}`,
            type: 'payment',
            message: `Payment of ₦${transaction.amount?.toLocaleString()} released`,
            timestamp: transaction.createdAt || transaction.updatedAt
          });
        } else if (transaction.status === 'held_in_escrow') {
          activities.push({
            id: `txn-${transaction._id}`,
            type: 'payment',
            message: `Escrow of ₦${transaction.amount?.toLocaleString()} held`,
            timestamp: transaction.createdAt || transaction.updatedAt
          });
        }
      });

      // Get recent disputes
      const recentDisputes = await db.collection('disputes').find()
        .sort({ createdAt: -1 })
        .limit(2)
        .toArray();

      recentDisputes.forEach((dispute: any) => {
        activities.push({
          id: `dispute-${dispute._id}`,
          type: 'dispute',
          message: `New dispute filed: ${dispute.reason || 'Payment issue'}`,
          timestamp: dispute.createdAt
        });
      });

      // Sort all activities by timestamp (most recent first)
      activities.sort((a, b) => {
        const dateA = new Date(a.timestamp || 0).getTime();
        const dateB = new Date(b.timestamp || 0).getTime();
        return dateB - dateA;
      });

      res.json({
        success: true,
        activities: activities.slice(0, 10) // Limit to 10 most recent
      });
    } catch (error) {
      console.error('Get activities error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch activities' 
      });
    }
  }

  /**
   * GET /api/admin/dashboard/health
   * Get system health status
   */
  static async getHealth(req: Request, res: Response) {
    try {
      // Check Flutterwave status
      let flutterwaveStatus: 'operational' | 'degraded' | 'down' = 'down';
      const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY || process.env.FLW_SECRET_KEY;
      if (FLW_SECRET && FLW_SECRET !== 'sk_test_xxxxx') {
        flutterwaveStatus = 'operational';
      }

      // Check VerifyMe status
      let verifyMeStatus: 'operational' | 'degraded' | 'down' = 'down';
      const VERIFYME_KEY = process.env.VERIFYME_API_KEY;
      if (VERIFYME_KEY && VERIFYME_KEY.length > 5) {
        verifyMeStatus = 'operational';
      } else {
        verifyMeStatus = 'degraded'; // Manual fallback available
      }

      // MongoDB status
      let mongoStatus: 'operational' | 'degraded' | 'down' = 'operational';
      try {
        const db = getDB();
        await db.command({ ping: 1 });
      } catch {
        mongoStatus = 'down';
      }

      const now = new Date();
      const lastLogin = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });

      res.json({
        success: true,
        health: {
          flutterwave: flutterwaveStatus,
          verifyMe: verifyMeStatus,
          mongodb: mongoStatus,
          lastLogin
        }
      });
    } catch (error) {
      console.error('Get health error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch system health' 
      });
    }
  }
}
