import { db, ArtisanProfile, VerificationHistory } from '../database/connection';

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
  static async getProfileByUserId(userId: number): Promise<ArtisanProfile | null> {
    await db.read();
    return db.data!.artisanProfiles.find(p => p.userId === userId) || null;
  }
  
  static async initializeProfile(userId: number): Promise<ArtisanProfile> {
    await db.read();
    let profile = db.data!.artisanProfiles.find(p => p.userId === userId);
    
    if (!profile) {
      profile = {
        id: db.data!._meta.nextArtisanProfileId++,
        userId,
        skillCategory: '',
        primarySkill: '',
        verificationStatus: 'unsubmitted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      db.data!.artisanProfiles.push(profile);
      await db.write();
    }
    
    return profile;
  }
  
  static async submitOnboarding(data: OnboardingData): Promise<ArtisanProfile> {
    await db.read();
    let profile = db.data!.artisanProfiles.find(p => p.userId === data.userId);
    
    if (!profile) {
      profile = await this.initializeProfile(data.userId);
      await db.read();
    }
    
    profile.skillCategory = data.skillCategory;
    profile.primarySkill = data.primarySkill;
    profile.profilePhotoUrl = data.profilePhotoUrl;
    profile.governmentIdUrl = data.governmentIdUrl;
    profile.idType = data.idType;
    profile.verificationStatus = 'pending';
    profile.submittedAt = new Date().toISOString();
    profile.updatedAt = new Date().toISOString();
    
    const history: VerificationHistory = {
      id: db.data!._meta.nextHistoryId++,
      artisanProfileId: profile.id,
      previousStatus: 'unsubmitted',
      newStatus: 'pending',
      changedBy: 'system',
      reason: 'Initial submission',
      createdAt: new Date().toISOString(),
    };
    
    db.data!.verificationHistory.push(history);
    await db.write();
    
    return profile;
  }
  
  static async getAllProfiles(status?: string): Promise<any[]> {
    await db.read();
    let profiles = db.data!.artisanProfiles;
    
    if (status) {
      profiles = profiles.filter(p => p.verificationStatus === status);
    }
    
    return profiles.map(profile => {
      const user = db.data!.users.find(u => u.id === profile.userId);
      return {
        ...profile,
        artisanName: user?.name,
        artisanPhone: user?.phone,
      };
    });
  }
  
  static async updateVerificationStatus(decision: VerificationDecision): Promise<ArtisanProfile> {
    await db.read();
    const profile = db.data!.artisanProfiles.find(p => p.id === decision.artisanProfileId);
    
    if (!profile) throw new Error('Profile not found');
    
    const previousStatus = profile.verificationStatus;
    profile.verificationStatus = decision.status;
    profile.adminNotes = decision.adminNotes;
    profile.updatedAt = new Date().toISOString();
    
    if (decision.status === 'verified') profile.verifiedAt = new Date().toISOString();
    if (decision.status === 'rejected') profile.rejectedAt = new Date().toISOString();
    
    const history: VerificationHistory = {
      id: db.data!._meta.nextHistoryId++,
      artisanProfileId: profile.id,
      previousStatus,
      newStatus: decision.status,
      changedBy: decision.changedBy,
      reason: decision.adminNotes,
      createdAt: new Date().toISOString(),
    };
    
    db.data!.verificationHistory.push(history);
    await db.write();
    
    return profile;
  }
  
  static async isVerified(userId: number): Promise<boolean> {
    await db.read();
    const profile = db.data!.artisanProfiles.find(p => p.userId === userId);
    return profile?.verificationStatus === 'verified';
  }
}
