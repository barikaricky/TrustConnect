import { Request, Response } from 'express';
import { normalizeImageUrl } from '../utils/imageUrl';

// Get customer profile
export const getCustomerProfile = async (req: Request, res: Response) => {
  try {
    const customerIdParam = Array.isArray(req.params.customerId) ? req.params.customerId[0] : req.params.customerId;
    const customerId = parseInt(customerIdParam);
    
    const { collections } = await import('../database/connection');
    const user = await collections.users().findOne({ id: customerId });
    
    if (!user) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    // Return customer profile data
    const profile = {
      id: user._id?.toString(),
      fullName: user.name,
      email: user.email || '',
      phone: user.phone,
      avatar: normalizeImageUrl(user.avatar, req),
      isVerified: user.verified || false,
      joinDate: user.createdAt || new Date().toISOString(),
      trustScore: 4.8, // TODO: Implement trust score calculation
      walletBalance: user.walletBalance || 0,
      escrowAmount: user.escrowAmount || 0,
      location: user.location || '',
    };
    
    res.json(profile);
  } catch (error) {
    console.error('Get customer profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update customer profile
export const updateCustomerProfile = async (req: Request, res: Response) => {
  try {
    const customerIdParam = Array.isArray(req.params.customerId) ? req.params.customerId[0] : req.params.customerId;
    const customerId = parseInt(customerIdParam);
    const { name, email, location, avatar } = req.body;
    
    const { collections } = await import('../database/connection');
    
    const updateFields: any = { updatedAt: new Date().toISOString() };
    if (name) updateFields.name = name;
    if (email) updateFields.email = email;
    if (location) updateFields.location = location;
    if (avatar) updateFields.avatar = avatar;
    
    const result = await collections.users().findOneAndUpdate(
      { id: customerId },
      { $set: updateFields },
      { returnDocument: 'after' }
    );
    
    if (!result) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    res.json({ 
      message: 'Profile updated successfully',
      profile: {
        id: result._id?.toString(),
        fullName: result.name,
        email: result.email,
        phone: result.phone,
        avatar: result.avatar,
        location: result.location,
      }
    });
  } catch (error) {
    console.error('Update customer profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get wallet balance
export const getWalletBalance = async (req: Request, res: Response) => {
  try {
    const customerIdParam = Array.isArray(req.params.customerId) ? req.params.customerId[0] : req.params.customerId;
    const customerId = parseInt(customerIdParam);
    
    const { collections } = await import('../database/connection');
    const user = await collections.users().findOne({ id: customerId });
    
    if (!user) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    res.json({ 
      balance: user.walletBalance || 0,
      escrowAmount: user.escrowAmount || 0
    });
  } catch (error) {
    console.error('Get wallet balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get active jobs for customer
export const getActiveJobs = async (req: Request, res: Response) => {
  try {
    const customerIdParam = Array.isArray(req.params.customerId) ? req.params.customerId[0] : req.params.customerId;
    const customerId = parseInt(customerIdParam);
    
    const { collections } = await import('../database/connection');
    const user = await collections.users().findOne({ id: customerId });
    
    if (!user) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    // TODO: Implement job fetching from Job model
    // For now, return empty array
    res.json({ jobs: [] });
  } catch (error) {
    console.error('Get active jobs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get favorite artisans
export const getFavoriteArtisans = async (req: Request, res: Response) => {
  try {
    const customerIdParam = Array.isArray(req.params.customerId) ? req.params.customerId[0] : req.params.customerId;
    const customerId = parseInt(customerIdParam);
    
    const { collections } = await import('../database/connection');
    const user = await collections.users().findOne({ id: customerId });
    
    if (!user) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    // TODO: Implement favorites from Favorite model
    // For now, return empty array
    res.json([]);
  } catch (error) {
    console.error('Get favorite artisans error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Upload profile picture
export const uploadProfilePicture = async (req: Request, res: Response) => {
  try {
    const customerIdParam = Array.isArray(req.params.customerId) ? req.params.customerId[0] : req.params.customerId;
    const customerId = parseInt(customerIdParam);
    const { avatar } = req.body; // Base64 or URL
    
    const { collections } = await import('../database/connection');
    
    const result = await collections.users().findOneAndUpdate(
      { id: customerId },
      { $set: { avatar, updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' }
    );
    
    if (!result) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    res.json({ 
      message: 'Profile picture updated successfully',
      avatar: result.avatar
    });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
