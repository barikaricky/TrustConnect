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
   * Complete multi-phase registration
   */
  static async completeRegistration(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const profileData = req.body;
      
      // Validation
      if (
        !profileData.idType ||
        !profileData.idNumber ||
        !profileData.selfieUrl ||
        !profileData.idDocumentUrl ||
        !profileData.fullName ||
        !profileData.primaryTrade ||
        !profileData.yearsExperience ||
        !profileData.workshopAddress ||
        !Array.isArray(profileData.portfolioPhotos) ||
        profileData.portfolioPhotos.length < 3 ||
        !profileData.accountNumber ||
        !profileData.bankName ||
        !profileData.accountName ||
        profileData.trustAccepted !== true
      ) {
        return res.status(400).json({ error: 'Required fields missing' });
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
}
