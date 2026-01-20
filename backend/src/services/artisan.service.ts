import pool from '../database/connection';

export interface ArtisanProfile {
  id: number;
  userId: number;
  skillCategory: string;
  primarySkill: string;
  profilePhotoUrl?: string;
  governmentIdUrl?: string;
  idType?: 'NIN' | 'BVN';
  verificationStatus: 'unsubmitted' | 'pending' | 'verified' | 'rejected' | 'suspended';
  adminNotes?: string;
  submittedAt?: Date;
  verifiedAt?: Date;
  rejectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnboardingData {
  userId: number;
  skillCategory: string;
  primarySkill: string;
  profilePhotoUrl: string;
  governmentIdUrl: string;
  idType: 'NIN' | 'BVN';
}

export interface VerificationDecision {
  artisanProfileId: number;
  status: 'verified' | 'rejected' | 'suspended';
  adminNotes?: string;
  changedBy: string;
}

export class ArtisanService {
  /**
   * Get artisan profile by user ID
   */
  static async getProfileByUserId(userId: number): Promise<ArtisanProfile | null> {
    const result = await pool.query(
      `SELECT 
        id, user_id as "userId", skill_category as "skillCategory", 
        primary_skill as "primarySkill", profile_photo_url as "profilePhotoUrl",
        government_id_url as "governmentIdUrl", id_type as "idType",
        verification_status as "verificationStatus", admin_notes as "adminNotes",
        submitted_at as "submittedAt", verified_at as "verifiedAt", 
        rejected_at as "rejectedAt", created_at as "createdAt", updated_at as "updatedAt"
       FROM artisan_profiles 
       WHERE user_id = $1`,
      [userId]
    );
    
    return result.rows[0] || null;
  }
  
  /**
   * Create or initialize artisan profile
   */
  static async initializeProfile(userId: number): Promise<ArtisanProfile> {
    const result = await pool.query(
      `INSERT INTO artisan_profiles (user_id, skill_category, primary_skill, verification_status) 
       VALUES ($1, '', '', 'unsubmitted')
       ON CONFLICT (user_id) DO NOTHING
       RETURNING 
        id, user_id as "userId", skill_category as "skillCategory", 
        primary_skill as "primarySkill", verification_status as "verificationStatus",
        created_at as "createdAt", updated_at as "updatedAt"`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      // Profile already exists, fetch it
      return (await this.getProfileByUserId(userId))!;
    }
    
    return result.rows[0];
  }
  
  /**
   * Submit onboarding (artisan submits documents)
   */
  static async submitOnboarding(data: OnboardingData): Promise<ArtisanProfile> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Update profile with onboarding data
      const result = await client.query(
        `UPDATE artisan_profiles 
         SET 
          skill_category = $1,
          primary_skill = $2,
          profile_photo_url = $3,
          government_id_url = $4,
          id_type = $5,
          verification_status = 'pending',
          submitted_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $6
         RETURNING 
          id, user_id as "userId", skill_category as "skillCategory", 
          primary_skill as "primarySkill", profile_photo_url as "profilePhotoUrl",
          government_id_url as "governmentIdUrl", id_type as "idType",
          verification_status as "verificationStatus", submitted_at as "submittedAt",
          created_at as "createdAt", updated_at as "updatedAt"`,
        [
          data.skillCategory,
          data.primarySkill,
          data.profilePhotoUrl,
          data.governmentIdUrl,
          data.idType,
          data.userId
        ]
      );
      
      if (result.rows.length === 0) {
        throw new Error('Artisan profile not found');
      }
      
      // Log history
      await client.query(
        `INSERT INTO verification_history (artisan_profile_id, previous_status, new_status, reason)
         VALUES ($1, 'unsubmitted', 'pending', 'Initial submission')`,
        [result.rows[0].id]
      );
      
      await client.query('COMMIT');
      return result.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get all artisan profiles (admin)
   */
  static async getAllProfiles(status?: string): Promise<ArtisanProfile[]> {
    let query = `
      SELECT 
        ap.id, ap.user_id as "userId", ap.skill_category as "skillCategory", 
        ap.primary_skill as "primarySkill", ap.profile_photo_url as "profilePhotoUrl",
        ap.government_id_url as "governmentIdUrl", ap.id_type as "idType",
        ap.verification_status as "verificationStatus", ap.admin_notes as "adminNotes",
        ap.submitted_at as "submittedAt", ap.verified_at as "verifiedAt", 
        ap.rejected_at as "rejectedAt", ap.created_at as "createdAt", ap.updated_at as "updatedAt",
        u.name as "artisanName", u.phone as "artisanPhone"
      FROM artisan_profiles ap
      JOIN users u ON ap.user_id = u.id
    `;
    
    const params: any[] = [];
    
    if (status) {
      query += ' WHERE ap.verification_status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY ap.submitted_at DESC';
    
    const result = await pool.query(query, params);
    return result.rows;
  }
  
  /**
   * Update verification status (admin action)
   */
  static async updateVerificationStatus(decision: VerificationDecision): Promise<ArtisanProfile> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get current status
      const current = await client.query(
        'SELECT verification_status FROM artisan_profiles WHERE id = $1',
        [decision.artisanProfileId]
      );
      
      if (current.rows.length === 0) {
        throw new Error('Artisan profile not found');
      }
      
      const previousStatus = current.rows[0].verification_status;
      
      // Update status
      const timestampField = decision.status === 'verified' ? 'verified_at' 
                           : decision.status === 'rejected' ? 'rejected_at' 
                           : null;
      
      let updateQuery = `
        UPDATE artisan_profiles 
        SET 
          verification_status = $1,
          admin_notes = $2,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      if (timestampField) {
        updateQuery += `, ${timestampField} = CURRENT_TIMESTAMP`;
      }
      
      updateQuery += `
        WHERE id = $3
        RETURNING 
          id, user_id as "userId", skill_category as "skillCategory", 
          primary_skill as "primarySkill", verification_status as "verificationStatus",
          admin_notes as "adminNotes", created_at as "createdAt", updated_at as "updatedAt"
      `;
      
      const result = await client.query(updateQuery, [
        decision.status,
        decision.adminNotes || null,
        decision.artisanProfileId
      ]);
      
      // Log history
      await client.query(
        `INSERT INTO verification_history (artisan_profile_id, previous_status, new_status, changed_by, reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          decision.artisanProfileId,
          previousStatus,
          decision.status,
          decision.changedBy,
          decision.adminNotes || null
        ]
      );
      
      await client.query('COMMIT');
      return result.rows[0];
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Check if artisan is verified
   */
  static async isVerified(userId: number): Promise<boolean> {
    const result = await pool.query(
      'SELECT verification_status FROM artisan_profiles WHERE user_id = $1',
      [userId]
    );
    
    return result.rows[0]?.verification_status === 'verified';
  }
}
