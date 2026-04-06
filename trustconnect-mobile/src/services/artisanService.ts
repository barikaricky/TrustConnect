import { api } from './api';

export interface ArtisanProfile {
  id: number;
  userId: number;
  fullName?: string;
  skillCategory: string;
  primarySkill: string;
  profilePhotoUrl?: string;
  governmentIdUrl?: string;
  idType?: 'NIN' | 'BVN';
  verificationStatus: 'unsubmitted' | 'pending' | 'verified' | 'rejected' | 'suspended';
  adminNotes?: string;
  submittedAt?: string;
  verifiedAt?: string;
  rejectedAt?: string;
}

export interface OnboardingData {
  skillCategory: string;
  primarySkill: string;
  profilePhotoUrl: string;
  governmentIdUrl: string;
  idType: 'NIN' | 'BVN';
}

export class ArtisanService {
  /**
   * Get artisan profile
   */
  static async getProfile(): Promise<ArtisanProfile> {
    const response = await api.get('/artisan/profile');
    return response.data;
  }
  
  /**
   * Submit onboarding
   */
  static async submitOnboarding(data: OnboardingData): Promise<{ message: string; profile: ArtisanProfile }> {
    const response = await api.post('/artisan/onboarding', data);
    return response.data;
  }
  
  /**
   * Upload file
   */
  static async uploadFile(uri: string): Promise<{ fileUrl: string }> {
    // Create form data
    const formData = new FormData();
    
    // Extract filename
    const filename = uri.split('/').pop() || 'upload.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('file', {
      uri,
      name: filename,
      type,
    } as any);
    
    const response = await api.post('/artisan/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  }

  /**
   * Complete multi-phase registration
   */
  static async completeRegistration(profileData: any): Promise<{ message: string; profile: any }> {
    const response = await api.post('/artisan/registration/complete', profileData);
    return response.data;
  }
}
