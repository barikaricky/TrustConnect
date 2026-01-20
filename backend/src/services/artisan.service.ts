import db from '../database/connection';
import { ArtisanProfile, VerificationHistory } from '../database/connection';

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
    return db.get('artisanProfiles').find({ userId }).value() || null;
  }

  static async initializeProfile(userId: number): Promise<ArtisanProfile> {
    let profile = db.get('artisanProfiles').find({ userId }).value();

    if (!profile) {
      const profileId = db.get('_meta.nextArtisanProfileId').value();
      
      profile = {
        id: profileId,
        userId,
        skillCategory: '',
        primarySkill: '',
        verificationStatus: 'unsubmitted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.get('artisanProfiles').push(profile).write();
      db.set('_meta.nextArtisanProfileId', profileId + 1).write();
    }

    return profile;
  }

  static async submitOnboarding(onboardingData: OnboardingData): Promise<ArtisanProfile> {
    let profile = db.get('artisanProfiles').find({ userId: onboardingData.userId }).value();

    if (!profile) {
      profile = await this.initializeProfile(onboardingData.userId);
    }

    const historyId = db.get('_meta.nextHistoryId').value();
    const history: VerificationHistory = {
      id: historyId,
      artisanProfileId: profile.id,
      previousStatus: profile.verificationStatus,
      newStatus: 'pending',
      changedBy: 'system',
      reason: 'Initial submission',
      createdAt: new Date().toISOString(),
    };

    db.get('artisanProfiles')
      .find({ id: profile.id })
      .assign({
        skillCategory: onboardingData.skillCategory,
        primarySkill: onboardingData.primarySkill,
        profilePhotoUrl: onboardingData.profilePhotoUrl,
        governmentIdUrl: onboardingData.governmentIdUrl,
        idType: onboardingData.idType,
        verificationStatus: 'pending',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .write();

    db.get('verificationHistory').push(history).write();
    db.set('_meta.nextHistoryId', historyId + 1).write();

    return db.get('artisanProfiles').find({ id: profile.id }).value();
  }

  static async getAllProfiles(status?: string): Promise<any[]> {
    let profiles = db.get('artisanProfiles');

    if (status) {
      profiles = profiles.filter({ verificationStatus: status });
    }

    return profiles.value().map((profile: ArtisanProfile) => {
      const user = db.get('users').find({ id: profile.userId }).value();
      return {
        ...profile,
        artisanName: user?.name,
        artisanPhone: user?.phone,
      };
    });
  }

  static async updateVerificationStatus(decision: VerificationDecision): Promise<ArtisanProfile> {
    const profile = db.get('artisanProfiles').find({ id: decision.artisanProfileId }).value();

    if (!profile) throw new Error('Profile not found');

    const historyId = db.get('_meta.nextHistoryId').value();
    const updateData: any = {
      verificationStatus: decision.status,
      adminNotes: decision.adminNotes,
      updatedAt: new Date().toISOString(),
    };

    if (decision.status === 'verified') updateData.verifiedAt = new Date().toISOString();
    if (decision.status === 'rejected') updateData.rejectedAt = new Date().toISOString();

    db.get('artisanProfiles')
      .find({ id: decision.artisanProfileId })
      .assign(updateData)
      .write();

    const history: VerificationHistory = {
      id: historyId,
      artisanProfileId: decision.artisanProfileId,
      previousStatus: profile.verificationStatus,
      newStatus: decision.status,
      changedBy: decision.changedBy,
      reason: decision.adminNotes,
      createdAt: new Date().toISOString(),
    };

    db.get('verificationHistory').push(history).write();
    db.set('_meta.nextHistoryId', historyId + 1).write();

    return db.get('artisanProfiles').find({ id: decision.artisanProfileId }).value();
  }

  static async isVerified(userId: number): Promise<boolean> {
    const profile = db.get('artisanProfiles').find({ userId }).value();
    return profile?.verificationStatus === 'verified';
  }
}
