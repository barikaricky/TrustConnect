import { collections, getNextSequence, ArtisanProfile, VerificationHistory } from '../database/connection';
import { ObjectId } from 'mongodb';

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
    return await collections.artisanProfiles().findOne({ userId });
  }

  static async initializeProfile(userId: number): Promise<ArtisanProfile> {
    let profile = await collections.artisanProfiles().findOne({ userId });

    if (!profile) {
      const id = await getNextSequence('artisanProfileId');
      
      const newProfile: any = {
        id,
        userId,
        skillCategory: '',
        primarySkill: '',
        verificationStatus: 'unsubmitted' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await collections.artisanProfiles().insertOne(newProfile);
      profile = await collections.artisanProfiles().findOne({ id });
    }

    return profile!;
  }

  static async submitOnboarding(onboardingData: OnboardingData): Promise<ArtisanProfile> {
    const existingProfile = await collections.artisanProfiles().findOne({ userId: onboardingData.userId });

    const profile = existingProfile || await this.initializeProfile(onboardingData.userId);

    if (!profile) throw new Error('Failed to initialize profile');

    const historyId = await getNextSequence('historyId');
    const history: any = {
      id: historyId,
      artisanProfileId: profile.id,
      previousStatus: profile.verificationStatus,
      newStatus: 'pending' as const,
      changedBy: 'system',
      reason: 'Initial submission',
      createdAt: new Date().toISOString(),
    };

    await collections.artisanProfiles().updateOne(
      { id: profile.id },
      {
        $set: {
          skillCategory: onboardingData.skillCategory,
          primarySkill: onboardingData.primarySkill,
          profilePhotoUrl: onboardingData.profilePhotoUrl,
          governmentIdUrl: onboardingData.governmentIdUrl,
          idType: onboardingData.idType,
          verificationStatus: 'pending',
          submittedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }
    );

    await collections.verificationHistory().insertOne(history);

    return (await collections.artisanProfiles().findOne({ id: profile.id }))!;
  }

  static async getAllProfiles(status?: string): Promise<any[]> {
    const query: any = status && ['verified', 'unsubmitted', 'pending', 'rejected', 'suspended'].includes(status) 
      ? { verificationStatus: status as ArtisanProfile['verificationStatus'] } 
      : {};
    
    const profiles = await collections.artisanProfiles().find(query).toArray();

    return Promise.all(
      profiles.map(async (profile) => {
        const user = await collections.users().findOne({ id: profile.userId });
        return {
          ...profile,
          artisanName: user?.name,
          artisanPhone: user?.phone,
        };
      })
    );
  }

  static async updateVerificationStatus(decision: VerificationDecision): Promise<ArtisanProfile> {
    const profile = await collections.artisanProfiles().findOne({ id: decision.artisanProfileId });

    if (!profile) throw new Error('Profile not found');

    const historyId = await getNextSequence('historyId');
    const updateData: any = {
      verificationStatus: decision.status,
      adminNotes: decision.adminNotes,
      updatedAt: new Date().toISOString(),
    };

    if (decision.status === 'verified') updateData.verifiedAt = new Date().toISOString();
    if (decision.status === 'rejected') updateData.rejectedAt = new Date().toISOString();

    await collections.artisanProfiles().updateOne(
      { id: decision.artisanProfileId },
      { $set: updateData }
    );

    const history: any = {
      id: historyId,
      artisanProfileId: decision.artisanProfileId,
      previousStatus: profile.verificationStatus,
      newStatus: decision.status,
      changedBy: decision.changedBy,
      reason: decision.adminNotes,
      createdAt: new Date().toISOString(),
    };

    await collections.verificationHistory().insertOne(history);

    return (await collections.artisanProfiles().findOne({ id: decision.artisanProfileId }))!;
  }

  static async isVerified(userId: number): Promise<boolean> {
    const profile = await collections.artisanProfiles().findOne({ userId });
    return profile?.verificationStatus === 'verified';
  }

  /**
   * Complete multi-phase registration
   */
  static async completeMultiPhaseRegistration(data: any): Promise<ArtisanProfile> {
    const existingProfile = await collections.artisanProfiles().findOne({ userId: data.userId });

    const profile = existingProfile || await this.initializeProfile(data.userId);

    if (!profile) throw new Error('Failed to initialize profile');

    // Do NOT downgrade an already-verified artisan back to 'pending'
    const isAlreadyVerified = profile.verificationStatus === 'verified';
    const newStatus = isAlreadyVerified ? 'verified' : 'pending';

    const historyId = await getNextSequence('historyId');
    const history: any = {
      id: historyId,
      artisanProfileId: profile.id,
      previousStatus: profile.verificationStatus,
      newStatus: newStatus as 'verified' | 'pending',
      changedBy: 'system',
      reason: isAlreadyVerified
        ? 'Artisan re-submitted registration (profile already verified – status preserved)'
        : 'Multi-phase registration completed',
      createdAt: new Date().toISOString(),
    };

    // Update profile with all phase data
    await collections.artisanProfiles().updateOne(
      { id: profile.id },
      {
        $set: {
          // Identity
          idType: data.idType,
          idNumber: data.idNumber,
          profilePhotoUrl: data.selfieUrl,
          governmentIdUrl: data.idDocumentUrl,

          // Professional Profile
          fullName: data.fullName,
          skillCategory: data.primaryTrade,
          primarySkill: data.primaryTrade,
          yearsExperience: data.yearsExperience,
          workshopAddress: data.workshopAddress,

          // Skill Proof
          portfolioPhotos: data.portfolioPhotos,

          // Financial Setup
          accountNumber: data.accountNumber,
          bankName: data.bankName,
          accountName: data.accountName,

          // Trust Agreement
          trustAccepted: data.trustAccepted,

          verificationStatus: newStatus,
          submittedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }
    );

    await collections.verificationHistory().insertOne(history);

    // Save bank details as a payment method on the user so settings/payment-methods shows it
    if (data.bankName && data.accountNumber && data.accountName) {
      await collections.users().updateOne(
        { id: data.userId },
        {
          $set: {
            paymentMethods: [{
              id: Date.now().toString(),
              type: 'bank',
              bankName: data.bankName,
              accountNumber: data.accountNumber,
              accountName: data.accountName,
              isDefault: true,
            }],
          },
        }
      );
    }

    return (await collections.artisanProfiles().findOne({ id: profile.id }))!;
  }
}
