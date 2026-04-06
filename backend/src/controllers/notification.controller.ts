import { Request, Response } from 'express';
import { getNextSequence, collections } from '../database/connection';

/**
 * Notification Controller
 * Advanced notification system: in-app + push-ready
 * Stores notifications in MongoDB and emits via Socket.io.
 */

export interface Notification {
  id: number;
  userId: number;
  title: string;
  body: string;
  type:
    | 'booking'
    | 'escrow'
    | 'chat'
    | 'dispute'
    | 'system'
    | 'promotion'
    | 'review'
    | 'verification'
    | 'quote';
  data?: Record<string, any>;  // deep-link params, bookingId, etc.
  read: boolean;
  createdAt: string;
}

/* ── Helper: create & broadcast a notification ─────────────── */
export async function createNotification(
  userId: number,
  title: string,
  body: string,
  type: Notification['type'],
  data?: Record<string, any>,
  io?: any
) {
  const id = await getNextSequence('notificationId');
  const now = new Date().toISOString();

  const notification: Notification = {
    id,
    userId,
    title,
    body,
    type,
    data: data || {},
    read: false,
    createdAt: now,
  };

  await collections.db().collection('notifications').insertOne(notification);

  // Real-time push via Socket.io
  if (io) {
    io.to(`user:${userId}`).emit('notification', notification);
  }

  return notification;
}

/* ── GET /api/notifications/:userId ────────────────────────── */
export async function getNotifications(req: Request, res: Response) {
  try {
    const userId = parseInt(
      Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId
    );
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const skip = (page - 1) * limit;

    const total = await collections
      .db()
      .collection('notifications')
      .countDocuments({ userId });

    const notifications = await collections
      .db()
      .collection('notifications')
      .find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const unreadCount = await collections
      .db()
      .collection('notifications')
      .countDocuments({ userId, read: false });

    return res.json({
      success: true,
      notifications,
      unreadCount,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get notifications' });
  }
}

/* ── POST /api/notifications/mark-read ──────────────────────── */
export async function markNotificationRead(req: Request, res: Response) {
  try {
    const { notificationId, userId } = req.body;

    if (notificationId) {
      await collections
        .db()
        .collection('notifications')
        .updateOne({ id: Number(notificationId) }, { $set: { read: true } });
    } else if (userId) {
      // Mark ALL as read for user
      await collections
        .db()
        .collection('notifications')
        .updateMany({ userId: Number(userId), read: false }, { $set: { read: true } });
    }

    return res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    console.error('Mark read error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark notification' });
  }
}

/* ── GET /api/notifications/unread-count/:userId ───────────── */
export async function getUnreadCount(req: Request, res: Response) {
  try {
    const userId = parseInt(
      Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId
    );

    const count = await collections
      .db()
      .collection('notifications')
      .countDocuments({ userId, read: false });

    return res.json({ success: true, unreadCount: count });
  } catch (error) {
    console.error('Unread count error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get count' });
  }
}

/* ── DELETE /api/notifications/:notificationId ─────────────── */
export async function deleteNotification(req: Request, res: Response) {
  try {
    const notificationId = parseInt(
      Array.isArray(req.params.notificationId)
        ? req.params.notificationId[0]
        : req.params.notificationId
    );

    await collections.db().collection('notifications').deleteOne({ id: notificationId });
    return res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Delete notification error:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete notification' });
  }
}

/* ── POST /api/notifications/register-push ──────────────────── */
export async function registerPushToken(req: Request, res: Response) {
  try {
    const { userId, pushToken, platform } = req.body;

    if (!userId || !pushToken) {
      return res.status(400).json({ success: false, message: 'userId and pushToken required' });
    }

    await collections.users().updateOne(
      { id: Number(userId) },
      {
        $set: {
          pushToken,
          pushPlatform: platform || 'expo',
          pushTokenUpdatedAt: new Date().toISOString(),
        },
      }
    );

    return res.json({ success: true, message: 'Push token registered' });
  } catch (error) {
    console.error('Register push token error:', error);
    return res.status(500).json({ success: false, message: 'Failed to register push token' });
  }
}

/* ── Helper: Send Expo push notification ────────────────────── */
export async function sendExpoPush(pushToken: string, title: string, body: string, data?: any) {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: pushToken,
        title,
        body,
        sound: 'default',
        badge: 1,
        data: data || {},
      }),
    });
  } catch (err) {
    console.error('Expo push error:', err);
  }
}

/* ── Helper: Notify user (in-app + push) ────────────────────── */
export async function notifyUser(
  userId: number,
  title: string,
  body: string,
  type: Notification['type'],
  data?: Record<string, any>,
  io?: any
) {
  // 1. In-app notification
  const notification = await createNotification(userId, title, body, type, data, io);

  // 2. Push notification if user has a token
  const user = await collections.users().findOne({ id: userId });
  if (user?.pushToken) {
    await sendExpoPush(user.pushToken, title, body, { ...data, notificationId: notification.id });
  }

  return notification;
}
