import { Request, Response } from 'express';
import { getDB, getNextSequence } from '../database/connection';

const reelsCollection = () => getDB().collection('reels');

export class ReelController {
  // Create a new reel
  static async createReel(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { caption, category } = req.body;
      const file = (req as any).file;

      if (!file) {
        return res.status(400).json({ success: false, message: 'Video file is required' });
      }

      const videoUrl = `/uploads/reels/${file.filename}`;
      const id = await getNextSequence('reelId');

      // Fetch user info
      const userDoc = await getDB().collection('users').findOne({ id: user.userId });

      const reel = {
        id,
        userId: user.userId,
        userRole: userDoc?.role || 'customer',
        userName: userDoc?.name || 'User',
        userAvatar: userDoc?.avatar || null,
        videoUrl,
        caption: caption || '',
        category: category || 'general',
        likes: [] as number[],
        comments: [] as any[],
        views: 0,
        reported: false,
        flagged: false,
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await reelsCollection().insertOne(reel);
      res.status(201).json({ success: true, reel });
    } catch (error) {
      console.error('Create reel error:', error);
      res.status(500).json({ success: false, message: 'Failed to create reel' });
    }
  }

  // Get reels feed (paginated)
  static async getFeed(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const category = req.query.category as string;
      const skip = (page - 1) * limit;

      const filter: any = { status: 'active' };
      if (category && category !== 'all') filter.category = category;

      const [reels, total] = await Promise.all([
        reelsCollection().find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
        reelsCollection().countDocuments(filter),
      ]);

      res.json({
        success: true,
        reels,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('Get feed error:', error);
      res.status(500).json({ success: false, message: 'Failed to get feed' });
    }
  }

  // Get single reel
  static async getReel(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const reel = await reelsCollection().findOne({ id });
      if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

      // Increment view count
      await reelsCollection().updateOne({ id }, { $inc: { views: 1 } });

      res.json({ success: true, reel: { ...reel, views: (reel.views || 0) + 1 } });
    } catch (error) {
      console.error('Get reel error:', error);
      res.status(500).json({ success: false, message: 'Failed to get reel' });
    }
  }

  // Like / unlike a reel
  static async toggleLike(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const id = parseInt(req.params.id);
      const reel = await reelsCollection().findOne({ id });
      if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

      const likes: number[] = reel.likes || [];
      const isLiked = likes.includes(user.userId);

      if (isLiked) {
        await reelsCollection().updateOne({ id }, { $pull: { likes: user.userId } });
      } else {
        await reelsCollection().updateOne({ id }, { $addToSet: { likes: user.userId } });
      }

      res.json({ success: true, liked: !isLiked, likesCount: isLiked ? likes.length - 1 : likes.length + 1 });
    } catch (error) {
      console.error('Toggle like error:', error);
      res.status(500).json({ success: false, message: 'Failed to toggle like' });
    }
  }

  // Add comment
  static async addComment(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const id = parseInt(req.params.id);
      const { text } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ success: false, message: 'Comment text is required' });
      }

      const reel = await reelsCollection().findOne({ id });
      if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

      const userDoc = await getDB().collection('users').findOne({ id: user.userId });

      const comment = {
        id: Date.now(),
        userId: user.userId,
        userName: userDoc?.name || 'User',
        userAvatar: userDoc?.avatar || null,
        text: text.trim(),
        createdAt: new Date().toISOString(),
      };

      await reelsCollection().updateOne({ id }, { $push: { comments: comment } });
      res.json({ success: true, comment });
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({ success: false, message: 'Failed to add comment' });
    }
  }

  // Delete own reel
  static async deleteReel(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const id = parseInt(req.params.id);
      const reel = await reelsCollection().findOne({ id });
      if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

      if (reel.userId !== user.userId) {
        return res.status(403).json({ success: false, message: 'You can only delete your own reels' });
      }

      await reelsCollection().updateOne({ id }, { $set: { status: 'deleted', updatedAt: new Date().toISOString() } });
      res.json({ success: true, message: 'Reel deleted' });
    } catch (error) {
      console.error('Delete reel error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete reel' });
    }
  }

  // Get user's own reels
  static async getMyReels(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const reels = await reelsCollection()
        .find({ userId: user.userId, status: { $ne: 'deleted' } })
        .sort({ createdAt: -1 })
        .toArray();

      res.json({ success: true, reels });
    } catch (error) {
      console.error('Get my reels error:', error);
      res.status(500).json({ success: false, message: 'Failed to get reels' });
    }
  }

  // ═══ ADMIN ENDPOINTS ═══

  // Admin: Get all reels (including flagged/reported)
  static async adminGetAllReels(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const status = req.query.status as string;
      const skip = (page - 1) * limit;

      const filter: any = {};
      if (status && status !== 'all') filter.status = status;

      const [reels, total, activeCount, flaggedCount, reportedCount] = await Promise.all([
        reelsCollection().find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
        reelsCollection().countDocuments(filter),
        reelsCollection().countDocuments({ status: 'active' }),
        reelsCollection().countDocuments({ flagged: true }),
        reelsCollection().countDocuments({ reported: true }),
      ]);

      res.json({
        success: true,
        reels,
        stats: { total: await reelsCollection().countDocuments({}), active: activeCount, flagged: flaggedCount, reported: reportedCount },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('Admin get reels error:', error);
      res.status(500).json({ success: false, message: 'Failed to get reels' });
    }
  }

  // Admin: Flag/unflag a reel
  static async adminToggleFlag(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const reel = await reelsCollection().findOne({ id });
      if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

      const flagged = !reel.flagged;
      await reelsCollection().updateOne({ id }, { $set: { flagged, updatedAt: new Date().toISOString() } });
      res.json({ success: true, flagged });
    } catch (error) {
      console.error('Admin flag reel error:', error);
      res.status(500).json({ success: false, message: 'Failed to flag reel' });
    }
  }

  // Admin: Remove a reel
  static async adminRemoveReel(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const reel = await reelsCollection().findOne({ id });
      if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

      await reelsCollection().updateOne({ id }, { $set: { status: 'removed', updatedAt: new Date().toISOString() } });
      res.json({ success: true, message: 'Reel removed by admin' });
    } catch (error) {
      console.error('Admin remove reel error:', error);
      res.status(500).json({ success: false, message: 'Failed to remove reel' });
    }
  }

  // Admin: Get reel stats
  static async adminGetStats(req: Request, res: Response) {
    try {
      const [total, active, flagged, reported, removed] = await Promise.all([
        reelsCollection().countDocuments({}),
        reelsCollection().countDocuments({ status: 'active' }),
        reelsCollection().countDocuments({ flagged: true }),
        reelsCollection().countDocuments({ reported: true }),
        reelsCollection().countDocuments({ status: 'removed' }),
      ]);

      // Get top creators
      const topCreators = await reelsCollection().aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: '$userId', count: { $sum: 1 }, userName: { $first: '$userName' }, userRole: { $first: '$userRole' } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]).toArray();

      // Recent 24h count
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recent24h = await reelsCollection().countDocuments({ createdAt: { $gte: oneDayAgo } });

      res.json({
        success: true,
        stats: { total, active, flagged, reported, removed, recent24h, topCreators },
      });
    } catch (error) {
      console.error('Admin reel stats error:', error);
      res.status(500).json({ success: false, message: 'Failed to get stats' });
    }
  }

  // Admin: Get all job posts (for Job Feed admin page)
  static async adminGetJobPosts(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const status = req.query.status as string;
      const search = req.query.search as string;
      const skip = (page - 1) * limit;

      const filter: any = {};
      if (status && status !== 'all') filter.status = status;
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
        ];
      }

      const jobPosts = getDB().collection('jobPosts');

      const [jobs, total, openCount, closedCount, filledCount] = await Promise.all([
        jobPosts.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
        jobPosts.countDocuments(filter),
        jobPosts.countDocuments({ status: 'open' }),
        jobPosts.countDocuments({ status: 'closed' }),
        jobPosts.countDocuments({ status: 'filled' }),
      ]);

      // Enrich with poster info
      const enrichedJobs = await Promise.all(jobs.map(async (job: any) => {
        const poster = await getDB().collection('users').findOne({ id: job.postedBy }, { projection: { name: 1, role: 1 } });
        return { ...job, posterName: poster?.name || 'Unknown', posterRole: poster?.role || 'unknown' };
      }));

      res.json({
        success: true,
        jobs: enrichedJobs,
        stats: { total: await jobPosts.countDocuments({}), open: openCount, closed: closedCount, filled: filledCount },
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      console.error('Admin get jobs error:', error);
      res.status(500).json({ success: false, message: 'Failed to get jobs' });
    }
  }

  // Admin: Get single job post detail
  static async adminGetJobDetail(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const job = await getDB().collection('jobPosts').findOne({ id });
      if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

      const poster = await getDB().collection('users').findOne({ id: job.postedBy }, { projection: { name: 1, role: 1, phone: 1 } });
      const applications = (job as any).applications || [];

      // Enrich applicants
      const enrichedApps = await Promise.all(applications.map(async (app: any) => {
        const applicant = await getDB().collection('users').findOne({ id: app.artisanUserId }, { projection: { name: 1 } });
        return { ...app, applicantName: applicant?.name || 'Unknown' };
      }));

      res.json({
        success: true,
        job: { ...job, posterName: poster?.name, posterRole: poster?.role, posterPhone: poster?.phone, applications: enrichedApps },
      });
    } catch (error) {
      console.error('Admin get job detail error:', error);
      res.status(500).json({ success: false, message: 'Failed to get job detail' });
    }
  }
}
