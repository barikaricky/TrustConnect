import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { collections, getNextSequence } from '../database/connection';
import { UserService } from '../services/user.service';

/**
 * Settings Controller
 * Handles user settings, profile updates, and account management
 */
export class SettingsController {

  /**
   * POST /api/settings/change-password
   * Change password (requires current password verification)
   */
  static async changePassword(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required',
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters',
        });
      }

      const user = await UserService.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (!user.password) {
        return res.status(400).json({
          success: false,
          message: 'No password set. Use set-password instead.',
        });
      }

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }

      const hashed = await bcrypt.hash(newPassword, 10);
      await UserService.updatePassword(userId, hashed);

      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ success: false, message: 'Failed to change password' });
    }
  }

  /**
   * PUT /api/settings/profile
   * Update user profile (works for all roles)
   */
  static async updateProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { name, email, location, avatar } = req.body;

      const updateFields: Record<string, any> = { updatedAt: new Date().toISOString() };
      if (name) updateFields.name = name;
      if (email) updateFields.email = email;
      if (location !== undefined) updateFields.location = location;
      if (avatar) updateFields.avatar = avatar;

      await collections.users().updateOne(
        { id: userId },
        { $set: updateFields }
      );

      const updated = await UserService.findById(userId);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: updated!.id,
            name: updated!.name,
            phone: updated!.phone,
            email: updated!.email,
            role: updated!.role,
            avatar: updated!.avatar,
            location: updated!.location,
          },
        },
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ success: false, message: 'Failed to update profile' });
    }
  }

  /**
   * GET /api/settings/profile
   * Get full user profile
   */
  static async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const user = await UserService.findById(userId);

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            role: user.role,
            avatar: user.avatar,
            location: user.location,
            verified: user.verified,
            averageRating: user.averageRating,
            totalReviews: user.totalReviews,
            createdAt: user.createdAt,
          },
        },
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch profile' });
    }
  }

  // ─── Emergency Contacts ───

  /**
   * GET /api/settings/emergency-contacts
   */
  static async getEmergencyContacts(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const contacts = await collections.users().findOne(
        { id: userId },
        { projection: { emergencyContacts: 1 } }
      );

      res.json({
        success: true,
        data: { contacts: contacts?.emergencyContacts || [] },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch emergency contacts' });
    }
  }

  /**
   * PUT /api/settings/emergency-contacts
   */
  static async updateEmergencyContacts(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { contacts } = req.body;

      if (!Array.isArray(contacts)) {
        return res.status(400).json({ success: false, message: 'Contacts must be an array' });
      }

      await collections.users().updateOne(
        { id: userId },
        { $set: { emergencyContacts: contacts, updatedAt: new Date().toISOString() } }
      );

      res.json({ success: true, message: 'Emergency contacts updated', data: { contacts } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to update emergency contacts' });
    }
  }

  // ─── Saved Addresses ───

  /**
   * GET /api/settings/saved-addresses
   */
  static async getSavedAddresses(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const user = await collections.users().findOne(
        { id: userId },
        { projection: { savedAddresses: 1 } }
      );

      res.json({
        success: true,
        data: { addresses: user?.savedAddresses || [] },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch addresses' });
    }
  }

  /**
   * PUT /api/settings/saved-addresses
   */
  static async updateSavedAddresses(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { addresses } = req.body;

      if (!Array.isArray(addresses)) {
        return res.status(400).json({ success: false, message: 'Addresses must be an array' });
      }

      await collections.users().updateOne(
        { id: userId },
        { $set: { savedAddresses: addresses, updatedAt: new Date().toISOString() } }
      );

      res.json({ success: true, message: 'Addresses updated', data: { addresses } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to update addresses' });
    }
  }

  // ─── Notification Preferences ───

  /**
   * GET /api/settings/notifications
   */
  static async getNotificationPreferences(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const user = await collections.users().findOne(
        { id: userId },
        { projection: { notificationPreferences: 1 } }
      );

      const defaults = {
        pushEnabled: true,
        bookingUpdates: true,
        promotions: false,
        chatMessages: true,
        paymentAlerts: true,
        securityAlerts: true,
        weeklyReport: false,
      };

      res.json({
        success: true,
        data: { preferences: user?.notificationPreferences || defaults },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch notification preferences' });
    }
  }

  /**
   * PUT /api/settings/notifications
   */
  static async updateNotificationPreferences(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { preferences } = req.body;

      await collections.users().updateOne(
        { id: userId },
        { $set: { notificationPreferences: preferences, updatedAt: new Date().toISOString() } }
      );

      res.json({ success: true, message: 'Notification preferences updated', data: { preferences } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to update notification preferences' });
    }
  }

  // ─── Payment Methods ───

  /**
   * GET /api/settings/payment-methods
   */
  static async getPaymentMethods(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const user = await collections.users().findOne(
        { id: userId },
        { projection: { paymentMethods: 1 } }
      );

      res.json({
        success: true,
        data: { methods: user?.paymentMethods || [] },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch payment methods' });
    }
  }

  /**
   * PUT /api/settings/payment-methods
   */
  static async updatePaymentMethods(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { methods } = req.body;

      if (!Array.isArray(methods)) {
        return res.status(400).json({ success: false, message: 'Methods must be an array' });
      }

      await collections.users().updateOne(
        { id: userId },
        { $set: { paymentMethods: methods, updatedAt: new Date().toISOString() } }
      );

      res.json({ success: true, message: 'Payment methods updated', data: { methods } });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to update payment methods' });
    }
  }

  // ─── Delete Account ───

  /**
   * DELETE /api/settings/account
   */
  static async deleteAccount(req: Request, res: Response) {
    try {
      const userId = (req as any).user.userId;
      const { password } = req.body;

      const user = await UserService.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      // Verify password before deletion
      if (user.password && password) {
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return res.status(401).json({ success: false, message: 'Incorrect password' });
        }
      }

      // Soft delete - mark as deleted
      await collections.users().updateOne(
        { id: userId },
        {
          $set: {
            deleted: true,
            deletedAt: new Date().toISOString(),
            phone: `deleted_${userId}_${user.phone}`,
            updatedAt: new Date().toISOString(),
          },
        }
      );

      res.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete account' });
    }
  }
}
