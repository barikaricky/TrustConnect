import { db, ArtisanProfile, VerificationHistory, Database } from '../database/connection';

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
    db.read();
    const data = db.data as Database;
    return data.artisanProfiles.find((p: ArtisanProfile) => p.userId === userId) || null;
  }

  static async initializeProfile(userId: number): Promise<ArtisanProfile> {
    db.read();
    const data = db.data as Database;
    let profile = data.artisanProfiles.find((p: ArtisanProfile) => p.userId === userId);

    if (!profile) {
      profile = {
        id: data._meta.nextArtisanProfileId++,
        userId,
        skillCategory: '',
        primarySkill: '',
        verificationStatus: 'unsubmitted',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      data.artisanProfiles.push(profile);
      db.write();
    }

    return profile;
  }

  static async submitOnboarding(onboardingData: OnboardingData): Promise<ArtisanProfile> {
    db.read();
    const data = db.data as Database;
    let profile = data.artisanProfiles.find((p: ArtisanProfile) => p.userId === onboardingData.userId);

    if (!profile) {
      profile = await this.initializeProfile(onboardingData.userId);
      db.read();
    }

    profile.skillCategory = onboardingData.skillCategory;
    profile.primarySkill = onboardingData.primarySkill;
    profile.profilePhotoUrl = onboardingData.profilePhotoUrl;
    profile.governmentIdUrl = onboardingData.governmentIdUrl;
    profile.idType = onboardingData.idType;
    profile.verificationStatus = 'pending';
    profile.submittedAt = new Date().toISOString();
    profile.updatedAt = new Date().toISOString();

    const history: VerificationHistory = {
      id: data._meta.nextHistoryId++,
      artisanProfileId: profile.id,
      previousStatus: 'unsubmitted',
      newStatus: 'pending',
      changedBy: 'system',
      reason: 'Initial submission',
      createdAt: new Date().toISOString(),
    };

    data.verificationHistory.push(history);
    db.write();

    return profile;
  }

  static async getAllProfiles(status?: string): Promise<any[]> {
    db.read();
    const data = db.data as Database;
    let profiles = data.artisanProfiles;

    if (status) {
      profiles = profiles.filter((p: ArtisanProfile) => p.verificationStatus === status);
    }

    return profiles.map((profile: ArtisanProfile) => {
      const user = data.users.find((u: any) => u.id === profile.userId);
      return {
        ...profile,
        artisanName: user?.name,
        artisanPhone: user?.phone,
      };
    });
  }

  static async updateVerificationStatus(decision: VerificationDecision): Promise<ArtisanProfile> {
    db.read();
    const data = db.data as Database;
    const profile = data.artisanProfiles.find((p: ArtisanProfile) => p.id === decision.artisanProfileId);

    if (!profile) throw new Error('Profile not found');

    const previousStatus = profile.verificationStatus;
    profile.verificationStatus = decision.status;
    profile.adminNotes = decision.adminNotes;
    profile.updatedAt = new Date().toISOString();

    if (decision.status === 'verified') profile.verifiedAt = new Date().toISOString();
    if (decision.status === 'rejected') profile.rejectedAt = new Date().toISOString();

    const history: VerificationHistory = {
      id: data._meta.nextHistoryId++,
      artisanProfileId: profile.id,
      previousStatus,
      newStatus: decision.status,
      changedBy: decision.changedBy,
      reason: decision.adminNotes,
      createdAt: new Date().toISOString(),
    };

    data.verificationHistory.push(history);
    db.write();

    return profile;
  }

  static async isVerified(userId: number): Promise<boolean> {
    db.read();
    const data = db.data as Database;
    const profile = data.artisanProfiles.find((p: ArtisanProfile) => p.userId === userId);
    return profile?.verificationStatus === 'verified';
  }
}
