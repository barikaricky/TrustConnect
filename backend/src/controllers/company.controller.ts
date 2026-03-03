import { Request, Response } from 'express';
import { collections, getNextSequence, CompanyProfile } from '../database/connection';

/**
 * Company Controller
 * Handles company registration, profile management
 */
export class CompanyController {
  /**
   * POST /api/company/register
   * Create company profile after user registration
   */
  static async registerCompany(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const {
        companyName, rcNumber, companyType, industry, description,
        yearEstablished, numberOfEmployees, serviceCategories,
        tin, companyEmail, companyPhone, website,
        address, state, lga, location,
        bankName, accountNumber, accountName,
      } = req.body;

      // Validate required fields
      if (!companyName || !rcNumber || !companyType || !industry || !address || !state || !lga) {
        return res.status(400).json({
          success: false,
          message: 'Company name, RC number, type, industry, address, state, and LGA are required',
        });
      }

      // Check if company profile already exists for this user
      const existing = await collections.companyProfiles().findOne({ userId });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Company profile already exists for this user',
        });
      }

      const id = await getNextSequence('companyProfileId');

      const companyProfile: CompanyProfile = {
        id,
        userId,
        companyName,
        rcNumber,
        companyType,
        industry,
        description: description || '',
        yearEstablished: yearEstablished || undefined,
        numberOfEmployees: numberOfEmployees || undefined,
        serviceCategories: serviceCategories || [],
        tin: tin || undefined,
        companyEmail: companyEmail || undefined,
        companyPhone: companyPhone || undefined,
        website: website || undefined,
        address,
        state,
        lga,
        location: location || undefined,
        bankName: bankName || undefined,
        accountNumber: accountNumber || undefined,
        accountName: accountName || undefined,
        verificationStatus: 'pending',
        submittedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await collections.companyProfiles().insertOne(companyProfile);

      res.status(201).json({
        success: true,
        message: 'Company registered successfully. Verification is pending.',
        data: { companyId: id, companyProfile },
      });
    } catch (error: any) {
      console.error('Company registration error:', error);
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'A company with this RC number already exists',
        });
      }
      res.status(500).json({ success: false, message: 'Company registration failed' });
    }
  }

  /**
   * GET /api/company/profile
   * Get company profile for authenticated user
   */
  static async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const profile = await collections.companyProfiles().findOne({ userId });
      if (!profile) {
        return res.status(404).json({ success: false, message: 'Company profile not found' });
      }

      // Get company user info
      const user = await collections.users().findOne({ id: userId });

      res.json({
        success: true,
        data: {
          profile,
          user: user ? {
            id: user.id, name: user.name, phone: user.phone, email: user.email,
          } : null,
        },
      });
    } catch (error) {
      console.error('Get company profile error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch company profile' });
    }
  }

  /**
   * PUT /api/company/profile
   * Update company profile
   */
  static async updateProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const updates = req.body;
      // Remove fields that shouldn't be updated directly
      delete updates.id;
      delete updates.userId;
      delete updates.verificationStatus;
      delete updates.createdAt;

      updates.updatedAt = new Date().toISOString();

      const result = await collections.companyProfiles().updateOne(
        { userId },
        { $set: updates }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ success: false, message: 'Company profile not found' });
      }

      const updated = await collections.companyProfiles().findOne({ userId });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { profile: updated },
      });
    } catch (error) {
      console.error('Update company profile error:', error);
      res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
  }

  /**
   * GET /api/company/dashboard
   * Get dashboard stats for company
   */
  static async getDashboard(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const profile = await collections.companyProfiles().findOne({ userId });
      if (!profile) {
        return res.status(404).json({ success: false, message: 'Company profile not found' });
      }

      // Aggregate stats — bookings where this company is the artisan/provider
      const [totalBookings, activeBookings, completedBookings, earnings] = await Promise.all([
        collections.bookings().countDocuments({ artisanUserId: userId }),
        collections.bookings().countDocuments({ artisanUserId: userId, status: { $in: ['accepted', 'in-progress', 'on-the-way', 'funded'] } }),
        collections.bookings().countDocuments({ artisanUserId: userId, status: { $in: ['completed', 'released', 'job-done'] } }),
        collections.transactions().aggregate([
          { $match: { toUserId: userId, type: 'escrow_release', status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } },
        ]).toArray(),
      ]);

      // Reviews
      const reviewData = await collections.reviews().aggregate([
        { $match: { artisanId: userId } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]).toArray();

      res.json({
        success: true,
        data: {
          profile,
          stats: {
            totalBookings,
            activeBookings,
            completedBookings,
            totalEarnings: earnings[0]?.total || 0,
            averageRating: reviewData[0]?.avg || 0,
            totalReviews: reviewData[0]?.count || 0,
          },
        },
      });
    } catch (error) {
      console.error('Company dashboard error:', error);
      res.status(500).json({ success: false, message: 'Failed to load dashboard' });
    }
  }
}
