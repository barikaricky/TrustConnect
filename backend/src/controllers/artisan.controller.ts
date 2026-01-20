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
      
      const result = await (await import('../database/connection')).default.query(
        `SELECT 
          ap.*, 
          u.name as "artisanName", 
          u.phone as "artisanPhone"
         FROM artisan_profiles ap
         JOIN users u ON ap.user_id = u.id
         WHERE ap.id = $1`,
        [id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      
      res.json(result.rows[0]);
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
        artisanProfileId: parseInt(id),
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
}
