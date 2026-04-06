import { Request, Response } from 'express';
import { collections, getNextSequence, CompanyProfile } from '../database/connection';
import { notifyUser } from './notification.controller';

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

      // Save bank details as a payment method on the user so settings/payment-methods shows it
      if (bankName && accountNumber && accountName) {
        await collections.users().updateOne(
          { id: userId },
          {
            $set: {
              paymentMethods: [{
                id: Date.now().toString(),
                type: 'bank',
                bankName,
                accountNumber,
                accountName,
                isDefault: true,
              }],
            },
          }
        );
      }

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

  /**
   * GET /api/company/hired-workers
   * Returns all unique workers (artisans) that the company has booked before.
   * Looks at bookings where customerId === company userId.
   */
  static async getHiredWorkers(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

      // Bookings where company is the customer
      const bookings = await collections.bookings()
        .find({ customerId: userId, status: { $nin: ['cancelled', 'rejected'] } })
        .sort({ createdAt: -1 })
        .toArray();

      // Build unique artisan map
      const artisanMap = new Map<number, any>();
      for (const b of bookings) {
        const aid = b.artisanUserId;
        if (!aid) continue;
        if (artisanMap.has(aid)) {
          const w = artisanMap.get(aid);
          w.jobsCount += 1;
          w.totalEarned += b.escrowAmount || b.estimatedPrice || 0;
          if ((b.scheduledDate || '') > (w.lastJobDate || '')) w.lastJobDate = b.scheduledDate;
        } else {
          artisanMap.set(aid, {
            artisanUserId: aid,
            artisanId: b.artisanId,
            jobsCount: 1,
            totalEarned: b.escrowAmount || b.estimatedPrice || 0,
            lastJobDate: b.scheduledDate || b.createdAt,
          });
        }
      }

      // Enrich with user + profile info
      const workers = await Promise.all(
        Array.from(artisanMap.values()).map(async (w) => {
          const user = await collections.users().findOne({ id: w.artisanUserId });
          const profile = await collections.artisanProfiles().findOne({ userId: w.artisanUserId });
          return {
            id: String(w.artisanUserId),
            artisanUserId: w.artisanUserId,
            artisanId: w.artisanId,
            name: user?.name || 'Unknown Worker',
            trade: profile?.primarySkill || profile?.skillCategory || 'General Services',
            photoUrl: profile?.profilePhotoUrl || null,
            jobsCount: w.jobsCount,
            totalEarned: w.totalEarned,
            lastJobDate: w.lastJobDate,
            isVerified: profile?.verificationStatus === 'verified',
          };
        })
      );

      res.json({ success: true, workers });
    } catch (error) {
      console.error('Get hired workers error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch hired workers' });
    }
  }

  /**
   * GET /api/company/pending-quotes
   * Returns bookings where the company is the customer and status is quoted/negotiating,
   * enriched with the latest quote details so the company can accept/reject/negotiate.
   */
  static async getPendingQuotes(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

      const bookings = await collections.bookings()
        .find({ customerId: userId, status: { $in: ['quoted', 'negotiating'] } })
        .sort({ updatedAt: -1 })
        .toArray();

      const enriched = await Promise.all(
        bookings.map(async (b) => {
          const artisanUser = await collections.users().findOne({ id: b.artisanUserId });
          const artisanProfile = await collections.artisanProfiles().findOne({ userId: b.artisanUserId });

          // Get latest active quote for this booking
          const quote = b.quoteId
            ? await collections.quotes().findOne({ id: b.quoteId })
            : await collections.quotes().findOne(
                { bookingId: b.id, status: 'sent' },
                { sort: { createdAt: -1 } }
              );

          return {
            bookingId: b.id,
            service: b.serviceType,
            artisanName: artisanUser?.name || 'Unknown',
            artisanPhoto: artisanProfile?.profilePhotoUrl || null,
            artisanTrade: artisanProfile?.primarySkill || '',
            bookingStatus: b.status,
            scheduledDate: b.scheduledDate,
            quote: quote ? {
              id: quote.id,
              workDescription: quote.workDescription,
              laborCost: quote.laborCost,
              materialsCost: quote.materialsCost,
              totalCost: quote.totalCost,
              serviceFee: quote.serviceFee,
              grandTotal: quote.grandTotal,
              duration: quote.duration,
              status: quote.status,
              version: quote.version,
            } : null,
          };
        })
      );

      res.json({ success: true, pendingQuotes: enriched });
    } catch (error) {
      console.error('Get pending quotes error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch pending quotes' });
    }
  }

  /**
   * POST /api/company/jobs
   * Post a job that artisans can browse and apply for.
   */
  static async postJob(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

      const { title, description, category, budget, location, scheduledDate, urgency, jobType } = req.body;
      if (!title || !description || !category) {
        return res.status(400).json({ success: false, message: 'title, description and category are required' });
      }

      const id = await getNextSequence('jobPostId');
      const now = new Date().toISOString();

      const jobPost = {
        id,
        postedByUserId: userId,
        title,
        description,
        category,
        budget: budget ? Number(budget) : null,
        location: location || '',
        scheduledDate: scheduledDate || null,
        urgency: urgency || 'normal',
        jobType: jobType || 'one-time',
        status: 'open',
        applications: [] as any[],
        createdAt: now,
        updatedAt: now,
      };

      await collections.db().collection('jobPosts').insertOne(jobPost);

      // Notify artisans in the category (fan-out notification, max 50 per job post)
      const io = (req.app as any).io;
      if (io) {
        io.emit('new_job_post', { jobId: id, category, title });
      }

      // Notify up to 50 artisans whose primary skill matches the category
      try {
        const categoryLower = (category || '').toLowerCase();
        const matchingArtisans = await collections.artisanProfiles()
          .find({ $or: [
            { primarySkill: { $regex: categoryLower, $options: 'i' } },
            { skillCategory: { $regex: categoryLower, $options: 'i' } },
          ] })
          .limit(50)
          .toArray();

        const companyProfile = await collections.companyProfiles().findOne({ userId });
        const companyName = companyProfile?.companyName || 'A company';
        const locationInfo = location ? ` in ${location}` : '';

        await Promise.allSettled(
          matchingArtisans
            .filter((a: any) => a.userId && a.userId !== userId)
            .map((a: any) =>
              notifyUser(
                a.userId,
                `💼 New ${category} Job Posted`,
                `${companyName} is hiring a ${category} professional${locationInfo}. ${budget ? `Budget: ₦${Number(budget).toLocaleString()}` : 'Budget: Open to negotiation'}`,
                'booking',
                { jobId: id, jobTitle: title },
                io
              )
            )
        );
      } catch (fanOutErr) {
        console.warn('Job post artisan fan-out warning:', fanOutErr);
      }

      res.status(201).json({ success: true, message: 'Job posted successfully', job: jobPost });
    } catch (error) {
      console.error('Post job error:', error);
      res.status(500).json({ success: false, message: 'Failed to post job' });
    }
  }

  /**
   * GET /api/company/jobs
   * Get all jobs posted by the company.
   */
  static async getPostedJobs(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

      const jobs = await collections.db().collection('jobPosts')
        .find({ postedByUserId: userId })
        .sort({ createdAt: -1 })
        .toArray();

      res.json({ success: true, jobs });
    } catch (error) {
      console.error('Get posted jobs error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch jobs' });
    }
  }

  /**
   * GET /api/company/jobs/browse
   * Artisans browse open job posts (all companies).
   */
  static async browseJobs(req: Request, res: Response) {
    try {
      const { category, page = 1, limit = 20 } = req.query;
      const filter: any = { status: 'open' };
      if (category) filter.category = category;

      const skip = (Number(page) - 1) * Number(limit);
      const jobs = await collections.db().collection('jobPosts')
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .toArray();

      // Enrich with company name
      const enriched = await Promise.all(
        jobs.map(async (j) => {
          const user = await collections.users().findOne({ id: j.postedByUserId });
          const company = await collections.companyProfiles().findOne({ userId: j.postedByUserId });
          return {
            ...j,
            companyName: company?.companyName || user?.name || 'Company',
            logoUrl: company?.logoUrl || null,
          };
        })
      );

      res.json({ success: true, jobs: enriched });
    } catch (error) {
      console.error('Browse jobs error:', error);
      res.status(500).json({ success: false, message: 'Failed to browse jobs' });
    }
  }

  /**
   * POST /api/company/jobs/:jobId/apply
   * Artisan applies for a job post.
   */
  static async applyForJob(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

      const jobId = parseInt(req.params.jobId as string);
      const { message } = req.body;

      const job = await collections.db().collection('jobPosts').findOne({ id: jobId });
      if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
      if (job.status !== 'open') return res.status(400).json({ success: false, message: 'This job is no longer open' });

      // Check if already applied
      const alreadyApplied = job.applications?.some((a: any) => a.artisanUserId === userId);
      if (alreadyApplied) return res.status(400).json({ success: false, message: 'You have already applied for this job' });

      const artisanProfile = await collections.artisanProfiles().findOne({ userId });
      const artisanUser = await collections.users().findOne({ id: userId });

      const application = {
        artisanUserId: userId,
        artisanName: artisanUser?.name || 'Artisan',
        artisanTrade: artisanProfile?.primarySkill || '',
        artisanPhoto: artisanProfile?.profilePhotoUrl || null,
        message: message || '',
        status: 'pending',
        appliedAt: new Date().toISOString(),
      };

      await collections.db().collection('jobPosts').updateOne(
        { id: jobId },
        { $push: { applications: application } as any, $set: { updatedAt: new Date().toISOString() } }
      );

      // Notify the company
      const io = (req.app as any).io;
      await notifyUser(
        job.postedByUserId,
        '🔨 New Job Application',
        `${artisanUser?.name || 'An artisan'} has applied for your job: "${job.title}"`,
        'booking',
        { jobId },
        io
      );

      res.json({ success: true, message: 'Application submitted successfully' });
    } catch (error) {
      console.error('Apply for job error:', error);
      res.status(500).json({ success: false, message: 'Failed to apply for job' });
    }
  }

  /**
   * PUT /api/company/jobs/:jobId/application/:artisanUserId
   * Company accepts or rejects a job application.
   */
  static async respondToApplication(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

      const jobId = parseInt(req.params.jobId as string);
      const artisanUserId = parseInt(req.params.artisanUserId as string);
      const { action } = req.body; // 'accept' | 'reject'

      if (!['accept', 'reject'].includes(action)) {
        return res.status(400).json({ success: false, message: 'action must be accept or reject' });
      }

      const job = await collections.db().collection('jobPosts').findOne({ id: jobId, postedByUserId: userId });
      if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

      const newStatus = action === 'accept' ? 'accepted' : 'rejected';

      await collections.db().collection('jobPosts').updateOne(
        { id: jobId, 'applications.artisanUserId': artisanUserId },
        {
          $set: {
            'applications.$.status': newStatus,
            updatedAt: new Date().toISOString(),
            ...(action === 'accept' ? { status: 'filled' } : {}),
          },
        }
      );

      const io = (req.app as any).io;
      const company = await collections.companyProfiles().findOne({ userId });
      await notifyUser(
        artisanUserId,
        action === 'accept' ? '🎉 Job Application Accepted!' : '❌ Job Application Update',
        action === 'accept'
          ? `${company?.companyName || 'A company'} has accepted your application for "${job.title}". They will contact you soon.`
          : `Your application for "${job.title}" was not selected this time.`,
        'booking',
        { jobId },
        io
      );

      res.json({ success: true, message: `Application ${newStatus}` });
    } catch (error) {
      console.error('Respond to application error:', error);
      res.status(500).json({ success: false, message: 'Failed to update application' });
    }
  }

  /**
   * POST /api/company/logo
   * Upload / update company logo URL.
   */
  static async updateLogo(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });

      const { logoUrl } = req.body;
      if (!logoUrl) return res.status(400).json({ success: false, message: 'logoUrl is required' });

      const result = await collections.companyProfiles().updateOne(
        { userId },
        { $set: { logoUrl, updatedAt: new Date().toISOString() } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ success: false, message: 'Company profile not found' });
      }

      res.json({ success: true, message: 'Logo updated successfully', logoUrl });
    } catch (error) {
      console.error('Update logo error:', error);
      res.status(500).json({ success: false, message: 'Failed to update logo' });
    }
  }
}
