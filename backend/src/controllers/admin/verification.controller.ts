import { Request, Response } from 'express';
import { getDB } from '../../database/connection';

/**
 * Admin Verification Controller
 * Handles artisan verification and vetting processes
 */

export class AdminVerificationController {
  /**
   * GET /api/admin/verification/queue
   * Get all artisans awaiting verification
   */
  static async getVerificationQueue(req: Request, res: Response) {
    try {
      const db = getDB();
      const { trade, lga, status, priority } = req.query;

      // Build filter query
      const filter: any = {
        verificationStatus: status || 'pending'
      };

      if (trade) {
        filter.$or = [
          { primarySkill: { $regex: trade, $options: 'i' } },
          { skillCategory: { $regex: trade, $options: 'i' } }
        ];
      }

      if (lga) {
        filter.workshopAddress = { $regex: lga, $options: 'i' };
      }

      // Get artisan profiles
      const artisans = await db.collection('artisanProfiles')
        .find(filter)
        .sort({ submittedAt: -1 })
        .toArray();

      // Enrich with user data
      const enrichedArtisans = await Promise.all(
        artisans.map(async (profile: any) => {
          const user = await db.collection('users').findOne({ id: profile.userId });
          
          // Determine priority
          let priorityTag = 'normal';
          const highDemandAreas = ['lekki', 'abuja', 'vi', 'ikoyi', 'banana island'];
          const location = profile.workshopAddress?.toLowerCase() || '';
          
          if (highDemandAreas.some(area => location.includes(area))) {
            priorityTag = 'urgent';
          }
          
          if (profile.verificationStatus === 'rejected' && profile.submittedAt) {
            priorityTag = 'resubmission';
          }

          return {
            id: profile.id,
            userId: profile.userId,
            name: profile.fullName || user?.name,
            phone: user?.phone,
            trade: profile.primarySkill || profile.skillCategory,
            location: profile.workshopAddress,
            submittedAt: profile.submittedAt || profile.createdAt,
            profilePhoto: profile.profilePhotoUrl,
            idType: profile.idType,
            idNumber: profile.idNumber,
            priorityTag,
            yearsExperience: profile.yearsExperience,
            verificationStatus: profile.verificationStatus
          };
        })
      );

      // Apply priority filter if specified
      const filteredArtisans = priority 
        ? enrichedArtisans.filter(a => a.priorityTag === priority)
        : enrichedArtisans;

      res.json({
        success: true,
        count: filteredArtisans.length,
        artisans: filteredArtisans
      });
    } catch (error) {
      console.error('Get verification queue error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch verification queue'
      });
    }
  }

  /**
   * GET /api/admin/verification/artisan/:id
   * Get detailed artisan information for review
   */
  static async getArtisanDetails(req: Request, res: Response) {
    try {
      const db = getDB();
      const { id } = req.params;
      const artisanId = Array.isArray(id) ? id[0] : id;

      const profile = await db.collection('artisanProfiles').findOne({ id: parseInt(artisanId) });
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Artisan not found'
        });
      }

      const user = await db.collection('users').findOne({ id: profile.userId });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if bank account name matches NIN name
      const bankNameMatch = profile.accountName && profile.fullName
        ? profile.accountName.toLowerCase().trim() === profile.fullName.toLowerCase().trim()
        : false;

      // Get verification history
      const history = await db.collection('verificationHistory')
        .find({ artisanProfileId: profile.id })
        .sort({ createdAt: -1 })
        .toArray();

      // Get internal notes
      const notes = await db.collection('adminNotes')
        .find({ artisanProfileId: profile.id })
        .sort({ createdAt: -1 })
        .toArray();

      const detailedInfo = {
        id: profile.id,
        userId: profile.userId,
        
        // Personal Info
        fullName: profile.fullName || user.name,
        phone: user.phone,
        email: user.email,
        
        // Identity Verification
        idType: profile.idType,
        idNumber: profile.idNumber,
        governmentIdUrl: profile.governmentIdUrl,
        profilePhotoUrl: profile.profilePhotoUrl,
        faceMatchScore: profile.faceMatchScore || null,
        ninVerified: profile.ninVerified || false,
        
        // Professional Info
        primarySkill: profile.primarySkill,
        skillCategory: profile.skillCategory,
        yearsExperience: profile.yearsExperience,
        workshopAddress: profile.workshopAddress,
        portfolioPhotos: profile.portfolioPhotos || [],
        
        // Financial Info
        bankName: profile.bankName,
        accountNumber: profile.accountNumber,
        accountName: profile.accountName,
        bankNameMatch,
        
        // Verification Status
        verificationStatus: profile.verificationStatus,
        adminNotes: profile.adminNotes,
        submittedAt: profile.submittedAt,
        verifiedAt: profile.verifiedAt,
        rejectedAt: profile.rejectedAt,
        
        // Audit Trail
        history,
        internalNotes: notes,
        
        // Trust & Union Info
        trustAccepted: profile.trustAccepted,
        unionId: profile.unionId,
        unionChairman: profile.unionChairman
      };

      res.json({
        success: true,
        artisan: detailedInfo
      });
    } catch (error) {
      console.error('Get artisan details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch artisan details'
      });
    }
  }

  /**
   * POST /api/admin/verification/approve
   * Approve artisan with badge level
   */
  static async approveArtisan(req: Request, res: Response) {
    try {
      const db = getDB();
      const { artisanId, badgeLevel, adminId, adminEmail, notes } = req.body;

      if (!artisanId || !badgeLevel || !adminId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      const profile = await db.collection('artisanProfiles').findOne({ id: artisanId });
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Artisan not found'
        });
      }

      // Update artisan profile
      await db.collection('artisanProfiles').updateOne(
        { id: artisanId },
        {
          $set: {
            verificationStatus: 'verified',
            badgeLevel: badgeLevel,
            verifiedAt: new Date().toISOString(),
            verifiedBy: adminId,
            adminNotes: notes || profile.adminNotes,
            updatedAt: new Date().toISOString()
          }
        }
      );

      // Update user status
      await db.collection('users').updateOne(
        { id: profile.userId },
        {
          $set: {
            verified: true,
            updatedAt: new Date().toISOString()
          }
        }
      );

      // Log verification history
      const { getNextSequence } = await import('../../database/connection');
      const historyId = await getNextSequence('historyId');
      
      await db.collection('verificationHistory').insertOne({
        id: historyId,
        artisanProfileId: artisanId,
        previousStatus: profile.verificationStatus,
        newStatus: 'verified',
        changedBy: adminEmail,
        adminId: adminId,
        badgeLevel: badgeLevel,
        reason: notes || 'Approved after verification',
        createdAt: new Date().toISOString()
      });

      // Log admin action
      await db.collection('auditLogs').insertOne({
        id: await getNextSequence('auditLogId'),
        adminId: adminId,
        adminEmail: adminEmail,
        action: 'ARTISAN_APPROVED',
        resource: 'artisan-verification',
        resourceId: artisanId,
        details: {
          artisanId,
          badgeLevel,
          notes
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        status: 'success',
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Artisan approved successfully',
        badgeLevel
      });
    } catch (error) {
      console.error('Approve artisan error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve artisan'
      });
    }
  }

  /**
   * POST /api/admin/verification/request-correction
   * Request artisan to correct information
   */
  static async requestCorrection(req: Request, res: Response) {
    try {
      const db = getDB();
      const { artisanId, reason, adminId, adminEmail } = req.body;

      if (!artisanId || !reason || !adminId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      const profile = await db.collection('artisanProfiles').findOne({ id: artisanId });
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Artisan not found'
        });
      }

      // Update artisan profile
      await db.collection('artisanProfiles').updateOne(
        { id: artisanId },
        {
          $set: {
            verificationStatus: 'correction_required',
            adminNotes: reason,
            updatedAt: new Date().toISOString()
          }
        }
      );

      // Log verification history
      const { getNextSequence } = await import('../../database/connection');
      const historyId = await getNextSequence('historyId');
      
      await db.collection('verificationHistory').insertOne({
        id: historyId,
        artisanProfileId: artisanId,
        previousStatus: profile.verificationStatus,
        newStatus: 'correction_required',
        changedBy: adminEmail,
        adminId: adminId,
        reason: reason,
        createdAt: new Date().toISOString()
      });

      // Log admin action
      await db.collection('auditLogs').insertOne({
        id: await getNextSequence('auditLogId'),
        adminId: adminId,
        adminEmail: adminEmail,
        action: 'ARTISAN_CORRECTION_REQUESTED',
        resource: 'artisan-verification',
        resourceId: artisanId,
        details: {
          artisanId,
          reason
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        status: 'success',
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Correction request sent to artisan'
      });
    } catch (error) {
      console.error('Request correction error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to request correction'
      });
    }
  }

  /**
   * POST /api/admin/verification/reject
   * Reject and blacklist artisan
   */
  static async rejectArtisan(req: Request, res: Response) {
    try {
      const db = getDB();
      const { artisanId, reason, adminId, adminEmail, blacklist } = req.body;

      if (!artisanId || !reason || !adminId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      const profile = await db.collection('artisanProfiles').findOne({ id: artisanId });
      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Artisan not found'
        });
      }

      const user = await db.collection('users').findOne({ id: profile.userId });

      // Update artisan profile
      await db.collection('artisanProfiles').updateOne(
        { id: artisanId },
        {
          $set: {
            verificationStatus: 'rejected',
            rejectedAt: new Date().toISOString(),
            rejectedBy: adminId,
            adminNotes: reason,
            updatedAt: new Date().toISOString()
          }
        }
      );

      // If blacklist is true, add to blacklist
      if (blacklist && user) {
        const { getNextSequence } = await import('../../database/connection');
        await db.collection('blacklist').insertOne({
          id: await getNextSequence('blacklistId'),
          phone: user.phone,
          idNumber: profile.idNumber,
          reason: reason,
          blacklistedBy: adminId,
          blacklistedAt: new Date().toISOString()
        });
      }

      // Log verification history
      const { getNextSequence } = await import('../../database/connection');
      const historyId = await getNextSequence('historyId');
      
      await db.collection('verificationHistory').insertOne({
        id: historyId,
        artisanProfileId: artisanId,
        previousStatus: profile.verificationStatus,
        newStatus: 'rejected',
        changedBy: adminEmail,
        adminId: adminId,
        reason: reason,
        blacklisted: blacklist || false,
        createdAt: new Date().toISOString()
      });

      // Log admin action
      await db.collection('auditLogs').insertOne({
        id: await getNextSequence('auditLogId'),
        adminId: adminId,
        adminEmail: adminEmail,
        action: blacklist ? 'ARTISAN_REJECTED_AND_BLACKLISTED' : 'ARTISAN_REJECTED',
        resource: 'artisan-verification',
        resourceId: artisanId,
        details: {
          artisanId,
          reason,
          blacklist: blacklist || false
        },
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        status: 'success',
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: blacklist ? 'Artisan rejected and blacklisted' : 'Artisan rejected'
      });
    } catch (error) {
      console.error('Reject artisan error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reject artisan'
      });
    }
  }

  /**
   * POST /api/admin/verification/note
   * Add internal note for artisan
   */
  static async addInternalNote(req: Request, res: Response) {
    try {
      const db = getDB();
      const { artisanId, note, adminId, adminName } = req.body;

      if (!artisanId || !note || !adminId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields'
        });
      }

      const { getNextSequence } = await import('../../database/connection');
      const noteId = await getNextSequence('noteId');

      await db.collection('adminNotes').insertOne({
        id: noteId,
        artisanProfileId: artisanId,
        note: note,
        adminId: adminId,
        adminName: adminName,
        createdAt: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Note added successfully'
      });
    } catch (error) {
      console.error('Add note error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add note'
      });
    }
  }

  /**
   * GET /api/admin/verification/stats
   * Get verification statistics
   */
  static async getVerificationStats(req: Request, res: Response) {
    try {
      const db = getDB();
      const { adminId, period } = req.query;

      // Calculate date range
      const now = new Date();
      let startDate = new Date();
      
      if (period === 'today') {
        startDate.setHours(0, 0, 0, 0);
      } else if (period === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      }

      const dateFilter = { createdAt: { $gte: startDate.toISOString() } };

      // Get counts
      const pending = await db.collection('artisanProfiles').countDocuments({
        verificationStatus: 'pending'
      });

      const verified = await db.collection('artisanProfiles').countDocuments({
        verificationStatus: 'verified',
        ...dateFilter
      });

      const rejected = await db.collection('artisanProfiles').countDocuments({
        verificationStatus: 'rejected',
        ...dateFilter
      });

      const correctionRequired = await db.collection('artisanProfiles').countDocuments({
        verificationStatus: 'correction_required'
      });

      // Admin-specific stats
      let adminStats = null;
      if (adminId) {
        const adminVerifications = await db.collection('verificationHistory')
          .find({
            adminId: parseInt(adminId as string),
            ...dateFilter
          })
          .toArray();

        adminStats = {
          totalVerifications: adminVerifications.length,
          approved: adminVerifications.filter(v => v.newStatus === 'verified').length,
          rejected: adminVerifications.filter(v => v.newStatus === 'rejected').length,
          correctionRequests: adminVerifications.filter(v => v.newStatus === 'correction_required').length
        };
      }

      res.json({
        success: true,
        stats: {
          pending,
          verified,
          rejected,
          correctionRequired,
          adminStats
        }
      });
    } catch (error) {
      console.error('Get verification stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics'
      });
    }
  }
}
