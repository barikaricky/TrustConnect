import { Request, Response } from 'express';
import { ArtisanService } from '../services/artisan.service';

export class ArtisanController {
  /**
   * Get artisan profile (own profile)
   */
  static async getMyProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      
      let profile = await ArtisanService.getProfileByUserId(userId);
      
      // Initialize if doesn't exist
      if (!profile) {
        profile = await ArtisanService.initializeProfile(userId);
      }
      
      res.json(profile);
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }
  
  /**
   * Submit onboarding (artisan submits documents)
   */
  static async submitOnboarding(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { skillCategory, primarySkill, profilePhotoUrl, governmentIdUrl, idType } = req.body;
      
      // Validation
      if (!skillCategory || !primarySkill || !profilePhotoUrl || !governmentIdUrl || !idType) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      
      if (!['NIN', 'BVN'].includes(idType)) {
        return res.status(400).json({ error: 'Invalid ID type' });
      }
      
      const profile = await ArtisanService.submitOnboarding({
        userId,
        skillCategory,
        primarySkill,
        profilePhotoUrl,
        governmentIdUrl,
        idType
      });
      
      res.json({
        message: 'Onboarding submitted successfully',
        profile
      });
    } catch (error) {
      console.error('Submit onboarding error:', error);
      res.status(500).json({ error: 'Failed to submit onboarding' });
    }
  }
  
  /**
   * Get all artisan profiles (admin only)
   */
  static async getAllProfiles(req: Request, res: Response) {
    try {
      const { status } = req.query;
      
      const profiles = await ArtisanService.getAllProfiles(status as string);
      
      res.json({ profiles });
    } catch (error) {
      console.error('Get all profiles error:', error);
      res.status(500).json({ error: 'Failed to fetch profiles' });
    }
  }
  
  /**
   * Get single artisan profile by ID (admin only)
   */
  static async getProfileById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const profileId = parseInt(Array.isArray(id) ? id[0] : id);
      
      const { collections } = await import('../database/connection');
      
      const profile = await collections.artisanProfiles().findOne({ id: profileId });
      
      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      
      // Get user details
      const user = await collections.users().findOne({ id: profile.userId });
      
      const result = {
        ...profile,
        artisanName: user?.name || 'Unknown',
        artisanPhone: user?.phone || 'Unknown'
      };
      
      res.json(result);
    } catch (error) {
      console.error('Get profile by ID error:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }
  
  /**
   * Update verification status (admin only)
   */
  static async updateVerificationStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, adminNotes } = req.body;
      const adminUser = (req as any).user;
      
      if (!['verified', 'rejected', 'suspended'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      
      const profile = await ArtisanService.updateVerificationStatus({
        artisanProfileId: parseInt(Array.isArray(id) ? id[0] : id),
        status,
        adminNotes,
        changedBy: adminUser.phone || 'admin'
      });
      
      res.json({
        message: 'Status updated successfully',
        profile
      });
    } catch (error) {
      console.error('Update status error:', error);
      res.status(500).json({ error: 'Failed to update status' });
    }
  }
  
  /**
   * Upload file handler
   */
  static async uploadFile(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Return the file path/URL
      const fileUrl = `/uploads/${req.file.filename}`;
      
      res.json({
        message: 'File uploaded successfully',
        fileUrl
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  }

  /**
   * Upload portfolio photos (multiple files)
   * POST /api/artisan/upload-portfolio
   * Multipart form: field "photos" (up to 10 image files)
   */
  static async uploadPortfolio(req: Request, res: Response) {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No portfolio photos uploaded. Use field name "photos".',
        });
      }

      const urls = files.map((file) => `/uploads/portfolio/${file.filename}`);

      console.log(`📷 Portfolio: ${files.length} photos uploaded`);

      res.json({
        success: true,
        urls,
        count: files.length,
        message: `${files.length} portfolio photos uploaded successfully`,
      });
    } catch (error) {
      console.error('Portfolio upload error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload portfolio photos',
      });
    }
  }

  /**
   * Complete multi-phase registration
   */
  static async completeRegistration(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const profileData = req.body;
      
      // Validation — collect missing fields for clear error messages
      const missing: string[] = [];
      if (!profileData.idType) missing.push('idType');
      if (!profileData.idNumber) missing.push('idNumber');
      if (!profileData.fullName) missing.push('fullName');
      if (!profileData.primaryTrade) missing.push('primaryTrade');
      if (!profileData.yearsExperience) missing.push('yearsExperience');
      if (!profileData.workshopAddress) missing.push('workshopAddress');
      if (!profileData.accountNumber) missing.push('accountNumber');
      if (!profileData.bankName) missing.push('bankName');
      if (!profileData.accountName) missing.push('accountName');
      if (profileData.trustAccepted !== true) missing.push('trustAccepted');

      // selfieUrl / idDocumentUrl are optional in dev (camera may not work in emulator)
      if (!profileData.selfieUrl) profileData.selfieUrl = 'placeholder-selfie';
      if (!profileData.idDocumentUrl) profileData.idDocumentUrl = profileData.selfieUrl;

      // portfolioPhotos: accept empty array (artisan can add later)
      if (!Array.isArray(profileData.portfolioPhotos)) {
        profileData.portfolioPhotos = [];
      }

      if (missing.length > 0) {
        return res.status(400).json({
          error: 'Required fields missing',
          missing,
          message: `Missing: ${missing.join(', ')}`,
        });
      }
      
      const profile = await ArtisanService.completeMultiPhaseRegistration({
        userId,
        ...profileData
      });
      
      res.json({
        message: 'Registration completed successfully',
        profile
      });
    } catch (error) {
      console.error('Complete registration error:', error);
      res.status(500).json({ error: 'Failed to complete registration' });
    }
  }

  /**
   * Get top-rated artisans near location (public)
   * Uses Haversine formula for geospatial distance filtering
   */
  static async getTopRated(req: Request, res: Response) {
    try {
      const { latitude, longitude, radius = 10, limit = 20 } = req.query;
      const { collections } = await import('../database/connection');
      
      // Get all verified artisans
      const artisans = await collections.artisanProfiles()
        .find({ verificationStatus: 'verified' })
        .toArray();
      
      // Haversine distance calculation
      const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };
      
      const custLat = parseFloat(latitude as string) || 0;
      const custLon = parseFloat(longitude as string) || 0;
      const maxRadius = parseFloat(radius as string) || 10;
      const maxResults = parseInt(limit as string) || 20;
      
      // Enrich with user data, reviews, and distance - then filter
      const enrichedPromises = artisans.map(async (artisan) => {
        const user = await collections.users().findOne({ id: artisan.userId });
        
        // Calculate distance using Haversine
        let distance = 0;
        if (custLat && custLon && artisan.location) {
          const loc = artisan.location as any;
          if (loc.latitude && loc.longitude) {
            distance = haversineDistance(custLat, custLon, loc.latitude, loc.longitude);
          }
        } else if (custLat && custLon) {
          // Assign semi-random distance for artisans without coords (within radius)
          distance = Math.round((Math.random() * maxRadius * 0.8 + 0.5) * 10) / 10;
        }
        
        // Get real reviews
        const reviews = await collections.reviews()
          .find({ artisanId: artisan.id })
          .toArray();
        const avgRating = reviews.length > 0
          ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
          : 0;
        const completedJobs = await collections.bookings().countDocuments({
          artisanId: artisan.id,
          status: 'completed',
        });
        
        return {
          id: artisan._id?.toString() || String(artisan.id),
          profileId: artisan.id,
          name: user?.name || 'Unknown',
          trade: artisan.primarySkill || artisan.skillCategory || '',
          category: artisan.skillCategory || '',
          photo: artisan.profilePhotoUrl || null,
          rating: avgRating || 4.5,
          reviewCount: reviews.length,
          completedJobs,
          verified: true,
          badge: completedJobs >= 50 ? 'gold' : completedJobs >= 20 ? 'silver' : completedJobs >= 5 ? 'bronze' : undefined,
          startingPrice: 3000,
          distance: Math.round(distance * 10) / 10,
          yearsExperience: artisan.yearsExperience || 0,
          workshopAddress: artisan.workshopAddress || '',
          location: artisan.location || null,
        };
      });
      
      let results = await Promise.all(enrichedPromises);
      
      // Filter by radius if coordinates provided
      if (custLat && custLon) {
        results = results.filter(a => a.distance <= maxRadius);
      }
      
      // Sort by rating (desc), then distance (asc)
      results.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return a.distance - b.distance;
      });
      
      // Limit results
      results = results.slice(0, maxResults);
      
      res.json({ artisans: results, total: results.length, radius: maxRadius });
    } catch (error) {
      console.error('Get top-rated artisans error:', error);
      res.status(500).json({ error: 'Failed to fetch artisans' });
    }
  }

  /**
   * Search artisans with multi-filter (category, proximity, verification)
   */
  static async searchArtisans(req: Request, res: Response) {
    try {
      const { query, category, latitude, longitude, radius = 10, verified_only } = req.query;
      const { collections } = await import('../database/connection');
      
      // Build MongoDB query with filters
      const searchFilter: any = {};
      
      // Filter 1: Category
      if (category) {
        searchFilter.skillCategory = { $regex: category as string, $options: 'i' };
      }
      
      // Filter 3: Verification (default: verified only)
      if (verified_only !== 'false') {
        searchFilter.verificationStatus = 'verified';
      }
      
      // Text search across skill fields
      if (query) {
        searchFilter.$or = [
          { primarySkill: { $regex: query as string, $options: 'i' } },
          { skillCategory: { $regex: query as string, $options: 'i' } },
          { fullName: { $regex: query as string, $options: 'i' } },
        ];
      }
      
      const artisans = await collections.artisanProfiles()
        .find(searchFilter)
        .limit(50)
        .toArray();
      
      // Haversine distance calculation
      const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };
      
      const custLat = parseFloat(latitude as string) || 0;
      const custLon = parseFloat(longitude as string) || 0;
      const maxRadius = parseFloat(radius as string) || 10;
      
      // Enrich results
      const enrichedPromises = artisans.map(async (artisan) => {
        const user = await collections.users().findOne({ id: artisan.userId });
        
        let distance = 0;
        if (custLat && custLon && artisan.location) {
          const loc = artisan.location as any;
          if (loc.latitude && loc.longitude) {
            distance = haversineDistance(custLat, custLon, loc.latitude, loc.longitude);
          }
        } else if (custLat && custLon) {
          distance = Math.round((Math.random() * maxRadius * 0.8 + 0.5) * 10) / 10;
        }
        
        const reviews = await collections.reviews()
          .find({ artisanId: artisan.id })
          .toArray();
        const avgRating = reviews.length > 0
          ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
          : 0;
        const completedJobs = await collections.bookings().countDocuments({
          artisanId: artisan.id, status: 'completed',
        });
        
        return {
          id: artisan._id?.toString() || String(artisan.id),
          profileId: artisan.id,
          name: user?.name || 'Unknown',
          trade: artisan.primarySkill || artisan.skillCategory || '',
          category: artisan.skillCategory || '',
          photo: artisan.profilePhotoUrl || null,
          rating: avgRating || 4.5,
          reviewCount: reviews.length,
          completedJobs,
          verified: artisan.verificationStatus === 'verified',
          badge: completedJobs >= 50 ? 'gold' : completedJobs >= 20 ? 'silver' : completedJobs >= 5 ? 'bronze' : undefined,
          startingPrice: 3000,
          distance: Math.round(distance * 10) / 10,
          yearsExperience: artisan.yearsExperience || 0,
          workshopAddress: artisan.workshopAddress || '',
        };
      });
      
      let results = await Promise.all(enrichedPromises);
      
      // Filter 2: Proximity
      if (custLat && custLon) {
        results = results.filter(a => a.distance <= maxRadius);
      }
      
      // Sort by relevance: rating desc, distance asc
      results.sort((a, b) => b.rating - a.rating || a.distance - b.distance);
      
      res.json({ artisans: results, total: results.length });
    } catch (error) {
      console.error('Search artisans error:', error);
      res.status(500).json({ error: 'Failed to search artisans' });
    }
  }
}
