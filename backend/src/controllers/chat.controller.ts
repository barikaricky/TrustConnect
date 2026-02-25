import { Request, Response } from 'express';
import { collections, getNextSequence, ChatConversation, ChatMessage } from '../database/connection';

/**
 * Chat Controller - Real-Time Negotiation System
 * Handles conversations and messages between customers and artisans
 */

/**
 * Get or create a conversation between customer and artisan
 */
export const getOrCreateConversation = async (req: Request, res: Response) => {
  try {
    const { customerId, artisanUserId, bookingId } = req.body;

    if (!customerId || !artisanUserId) {
      return res.status(400).json({ error: 'customerId and artisanUserId are required' });
    }

    const custId = parseInt(customerId);
    const artId = parseInt(artisanUserId);

    // Check if conversation already exists
    let conversation = await collections.conversations().findOne({
      customerId: custId,
      artisanUserId: artId,
    });

    if (!conversation) {
      const id = await getNextSequence('conversationId');
      const now = new Date().toISOString();

      const newConv: ChatConversation = {
        id,
        customerId: custId,
        artisanUserId: artId,
        bookingId: bookingId ? parseInt(bookingId) : undefined,
        customerUnread: 0,
        artisanUnread: 0,
        createdAt: now,
        updatedAt: now,
      };

      await collections.conversations().insertOne(newConv);
      conversation = await collections.conversations().findOne({ id });

      // Insert system welcome message
      const msgId = await getNextSequence('messageId');
      await collections.messages().insertOne({
        id: msgId,
        conversationId: id,
        senderId: 0,
        senderRole: 'system',
        type: 'system',
        content: 'TrustConnect Tip: Never pay an artisan outside the app to ensure your money is safe.',
        status: 'read',
        createdAt: now,
      });
    }

    // Get user details
    const customer = await collections.users().findOne({ id: custId });
    const artisan = await collections.users().findOne({ id: artId });
    const artisanProfile = await collections.artisanProfiles().findOne({ userId: artId });

    res.json({
      success: true,
      conversation: {
        ...conversation,
        customerName: customer?.name || 'Customer',
        customerAvatar: customer?.avatar || null,
        artisanName: artisan?.name || 'Artisan',
        artisanAvatar: artisanProfile?.profilePhotoUrl || artisan?.avatar || null,
        artisanTrade: artisanProfile?.primarySkill || '',
      },
    });
  } catch (error) {
    console.error('Get/create conversation error:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
};

/**
 * Get all conversations for a user
 */
export const getConversations = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId as string);
    const userRole = req.query.role as string || 'customer';

    const filter = userRole === 'artisan'
      ? { artisanUserId: userId }
      : { customerId: userId };

    const conversations = await collections.conversations()
      .find(filter)
      .sort({ updatedAt: -1 })
      .toArray();

    // Enrich with user details
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const customer = await collections.users().findOne({ id: conv.customerId });
        const artisan = await collections.users().findOne({ id: conv.artisanUserId });
        const artisanProfile = await collections.artisanProfiles().findOne({ userId: conv.artisanUserId });

        return {
          ...conv,
          customerName: customer?.name || 'Customer',
          customerAvatar: customer?.avatar || null,
          artisanName: artisan?.name || 'Artisan',
          artisanAvatar: artisanProfile?.profilePhotoUrl || artisan?.avatar || null,
          artisanTrade: artisanProfile?.primarySkill || '',
          unreadCount: userRole === 'artisan' ? conv.artisanUnread : conv.customerUnread,
        };
      })
    );

    res.json({ conversations: enriched });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

/**
 * Send a message in a conversation
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { conversationId, senderId, senderRole, type, content, imageUrl } = req.body;

    if (!conversationId || !senderId || !content) {
      return res.status(400).json({ error: 'conversationId, senderId, and content are required' });
    }

    const convId = parseInt(conversationId);
    const conversation = await collections.conversations().findOne({ id: convId });
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const msgId = await getNextSequence('messageId');
    const now = new Date().toISOString();

    const message: ChatMessage = {
      id: msgId,
      conversationId: convId,
      senderId: parseInt(senderId),
      senderRole: senderRole || 'customer',
      type: type || 'text',
      content,
      imageUrl,
      status: 'sent',
      createdAt: now,
    };

    await collections.messages().insertOne(message);

    // Update conversation
    const unreadUpdate = senderRole === 'customer'
      ? { artisanUnread: (conversation.artisanUnread || 0) + 1 }
      : { customerUnread: (conversation.customerUnread || 0) + 1 };

    await collections.conversations().updateOne(
      { id: convId },
      {
        $set: {
          lastMessage: content.substring(0, 100),
          lastMessageAt: now,
          updatedAt: now,
          ...unreadUpdate,
        },
      }
    );

    // Emit via Socket.io if available
    const io = (req.app as any).io;
    if (io) {
      // Mark as delivered immediately (since we're sending via the API)
      message.status = 'delivered';
      await collections.messages().updateOne({ id: msgId }, { $set: { status: 'delivered' } });

      io.to(`conversation:${convId}`).emit('new_message', {
        ...message,
        senderName: (await collections.users().findOne({ id: parseInt(senderId) }))?.name || 'User',
      });

      // Notify the other user
      const recipientId = senderRole === 'customer' ? conversation.artisanUserId : conversation.customerId;
      io.to(`user:${recipientId}`).emit('message_notification', {
        conversationId: convId,
        senderName: (await collections.users().findOne({ id: parseInt(senderId) }))?.name || 'User',
        preview: content.substring(0, 50),
      });
    }

    res.status(201).json({ success: true, message });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

/**
 * Get messages for a conversation (with pagination)
 */
export const getMessages = async (req: Request, res: Response) => {
  try {
    const conversationId = parseInt(req.params.conversationId as string);
    const { before, limit = 50 } = req.query;

    const filter: any = { conversationId };
    if (before) {
      filter.createdAt = { $lt: before as string };
    }

    const messages = await collections.messages()
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string))
      .toArray();

    // Return in chronological order
    messages.reverse();

    res.json({ messages, hasMore: messages.length === parseInt(limit as string) });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

/**
 * Mark messages as read
 */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const conversationId = parseInt(req.params.conversationId as string);
    const { userId, userRole } = req.body;

    // Mark all messages from the OTHER user as 'read'
    const senderRole = userRole === 'customer' ? 'artisan' : 'customer';
    await collections.messages().updateMany(
      {
        conversationId,
        senderRole,
        status: { $ne: 'read' },
      },
      { $set: { status: 'read' } }
    );

    // Reset unread counter
    const unreadField = userRole === 'customer' ? 'customerUnread' : 'artisanUnread';
    await collections.conversations().updateOne(
      { id: conversationId },
      { $set: { [unreadField]: 0 } }
    );

    // Emit read receipt via Socket.io
    const io = (req.app as any).io;
    if (io) {
      io.to(`conversation:${conversationId}`).emit('messages_read', {
        conversationId,
        readBy: parseInt(userId),
        readByRole: userRole,
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
};

/**
 * Upload image for chat (compressed)
 */
export const uploadChatImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
      success: true,
      imageUrl: fileUrl,
      message: 'Image uploaded successfully',
    });
  } catch (error) {
    console.error('Upload chat image error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
};
