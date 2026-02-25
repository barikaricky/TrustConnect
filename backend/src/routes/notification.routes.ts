import { Router } from 'express';
import {
  getNotifications,
  markNotificationRead,
  getUnreadCount,
  deleteNotification,
  registerPushToken,
} from '../controllers/notification.controller';

const router = Router();

// Get notifications for a user (paginated)
router.get('/:userId', getNotifications);

// Get unread count
router.get('/unread-count/:userId', getUnreadCount);

// Mark notification(s) as read
router.post('/mark-read', markNotificationRead);

// Register push token
router.post('/register-push', registerPushToken);

// Delete a notification
router.delete('/:notificationId', deleteNotification);

export default router;
