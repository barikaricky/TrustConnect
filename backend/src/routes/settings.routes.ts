import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// All settings routes require authentication
router.use(authMiddleware);

// Profile
router.get('/profile', SettingsController.getProfile);
router.put('/profile', SettingsController.updateProfile);

// Security
router.post('/change-password', SettingsController.changePassword);

// Emergency Contacts
router.get('/emergency-contacts', SettingsController.getEmergencyContacts);
router.put('/emergency-contacts', SettingsController.updateEmergencyContacts);

// Saved Addresses
router.get('/saved-addresses', SettingsController.getSavedAddresses);
router.put('/saved-addresses', SettingsController.updateSavedAddresses);

// Notifications
router.get('/notifications', SettingsController.getNotificationPreferences);
router.put('/notifications', SettingsController.updateNotificationPreferences);

// Payment Methods
router.get('/payment-methods', SettingsController.getPaymentMethods);
router.put('/payment-methods', SettingsController.updatePaymentMethods);

// Account
router.delete('/account', SettingsController.deleteAccount);

export default router;
