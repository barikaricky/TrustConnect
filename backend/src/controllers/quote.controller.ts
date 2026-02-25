import { Request, Response } from 'express';
import { getDB, getNextSequence, collections, Quote } from '../database/connection';

/**
 * Quote Controller
 * Module 4: Digital Quotation System
 * Artisans create structured quotes; customers accept/reject; quote sent as chat message
 */

const SERVICE_FEE_PERCENT = 0.05; // 5% service fee

/**
 * POST /api/quote/create
 * Artisan sends a structured quote (appears as 'quote' message in chat)
 */
export async function createQuote(req: Request, res: Response) {
  try {
    const {
      conversationId,
      artisanUserId,
      customerId,
      bookingId,
      workDescription,
      laborCost,
      materialsCost,
      duration,
    } = req.body;

    // Validate required fields
    if (!conversationId || !artisanUserId || !customerId || !workDescription || laborCost == null || materialsCost == null || !duration) {
      return res.status(400).json({
        success: false,
        message: 'All fields required: conversationId, artisanUserId, customerId, workDescription, laborCost, materialsCost, duration',
      });
    }

    // Validate numeric values
    const labor = Number(laborCost);
    const materials = Number(materialsCost);
    if (isNaN(labor) || isNaN(materials) || labor < 0 || materials < 0) {
      return res.status(400).json({ success: false, message: 'laborCost and materialsCost must be non-negative numbers' });
    }

    // Calculate costs
    const totalCost = labor + materials;
    const serviceFee = Math.round(totalCost * SERVICE_FEE_PERCENT);
    const grandTotal = totalCost + serviceFee;

    // Mark any previous quotes in this conversation as superseded
    await collections.quotes().updateMany(
      { conversationId: Number(conversationId), status: 'sent' },
      { $set: { status: 'superseded' as const, updatedAt: new Date().toISOString() } }
    );

    const quoteId = await getNextSequence('quoteId');
    const now = new Date().toISOString();

    const quote: Quote = {
      id: quoteId,
      conversationId: Number(conversationId),
      artisanUserId: Number(artisanUserId),
      customerId: Number(customerId),
      bookingId: bookingId ? Number(bookingId) : undefined,
      workDescription,
      laborCost: labor,
      materialsCost: materials,
      totalCost,
      serviceFee,
      grandTotal,
      duration,
      status: 'sent',
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    // Check for previous version
    const prevQuote = await collections.quotes().findOne(
      { conversationId: Number(conversationId), artisanUserId: Number(artisanUserId), status: 'superseded' },
      { sort: { createdAt: -1 } }
    );
    if (prevQuote) {
      quote.version = prevQuote.version + 1;
      quote.previousQuoteId = prevQuote.id;
    }

    await collections.quotes().insertOne(quote);

    // Send as a chat message of type 'quote'
    const messageId = await getNextSequence('messageId');
    const quoteMessage = {
      id: messageId,
      conversationId: Number(conversationId),
      senderId: Number(artisanUserId),
      senderRole: 'artisan' as const,
      type: 'quote' as const,
      content: `Quote: ₦${grandTotal.toLocaleString()} for ${workDescription}`,
      quoteId,
      status: 'sent' as const,
      createdAt: now,
    };
    await collections.messages().insertOne(quoteMessage);

    // Update conversation last message
    await collections.conversations().updateOne(
      { id: Number(conversationId) },
      {
        $set: {
          lastMessage: `📋 Quote: ₦${grandTotal.toLocaleString()}`,
          lastMessageAt: now,
          updatedAt: now,
        },
        $inc: { customerUnread: 1 },
      }
    );

    // Update booking status if linked
    if (bookingId) {
      await collections.bookings().updateOne(
        { id: Number(bookingId) },
        { $set: { status: 'quoted' as any, quoteId, updatedAt: now } }
      );
    }

    // Emit via Socket.io
    const io = (req.app as any).io;
    if (io) {
      io.to(`conversation:${conversationId}`).emit('new_message', quoteMessage);
      io.to(`user:${customerId}`).emit('quote_received', { quote, message: quoteMessage });
    }

    return res.status(201).json({
      success: true,
      message: 'Quote sent successfully',
      quote,
      chatMessage: quoteMessage,
    });
  } catch (error) {
    console.error('Create quote error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create quote' });
  }
}

/**
 * GET /api/quote/:quoteId
 * Get a specific quote by ID
 */
export async function getQuote(req: Request, res: Response) {
  try {
    const quoteId = parseInt(Array.isArray(req.params.quoteId) ? req.params.quoteId[0] : req.params.quoteId);
    const quote = await collections.quotes().findOne({ id: quoteId });

    if (!quote) {
      return res.status(404).json({ success: false, message: 'Quote not found' });
    }

    // Get artisan and customer names
    const artisan = await collections.users().findOne({ id: quote.artisanUserId });
    const customer = await collections.users().findOne({ id: quote.customerId });

    return res.json({
      success: true,
      quote: {
        ...quote,
        artisanName: artisan?.name || 'Artisan',
        customerName: customer?.name || 'Customer',
      },
    });
  } catch (error) {
    console.error('Get quote error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get quote' });
  }
}

/**
 * GET /api/quote/conversation/:conversationId
 * Get the latest active quote in a conversation
 */
export async function getConversationQuote(req: Request, res: Response) {
  try {
    const conversationId = parseInt(Array.isArray(req.params.conversationId) ? req.params.conversationId[0] : req.params.conversationId);
    const quote = await collections.quotes().findOne(
      { conversationId, status: { $in: ['sent', 'accepted'] } },
      { sort: { createdAt: -1 } }
    );

    return res.json({ success: true, quote: quote || null });
  } catch (error) {
    console.error('Get conversation quote error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get quote' });
  }
}

/**
 * POST /api/quote/:quoteId/accept
 * Customer accepts a quote → triggers escrow funding
 */
export async function acceptQuote(req: Request, res: Response) {
  try {
    const quoteId = parseInt(Array.isArray(req.params.quoteId) ? req.params.quoteId[0] : req.params.quoteId);
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({ success: false, message: 'customerId is required' });
    }

    const quote = await collections.quotes().findOne({ id: quoteId });
    if (!quote) {
      return res.status(404).json({ success: false, message: 'Quote not found' });
    }
    if (quote.customerId !== Number(customerId)) {
      return res.status(403).json({ success: false, message: 'Only the customer can accept this quote' });
    }
    if (quote.status !== 'sent') {
      return res.status(400).json({ success: false, message: `Quote is already ${quote.status}` });
    }

    const now = new Date().toISOString();

    // Accept the quote
    await collections.quotes().updateOne(
      { id: quoteId },
      { $set: { status: 'accepted' as const, acceptedAt: now, updatedAt: now } }
    );

    // Send system message in chat
    const msgId = await getNextSequence('messageId');
    const systemMsg = {
      id: msgId,
      conversationId: quote.conversationId,
      senderId: 0,
      senderRole: 'system' as const,
      type: 'system' as const,
      content: `✅ Quote accepted — ₦${quote.grandTotal.toLocaleString()}. Please fund the escrow to proceed.`,
      status: 'sent' as const,
      createdAt: now,
    };
    await collections.messages().insertOne(systemMsg);

    // Notify via Socket.io
    const io = (req.app as any).io;
    if (io) {
      io.to(`conversation:${quote.conversationId}`).emit('new_message', systemMsg);
      io.to(`user:${quote.artisanUserId}`).emit('quote_accepted', { quoteId, quote });
    }

    return res.json({
      success: true,
      message: 'Quote accepted. Proceed to fund escrow.',
      quote: { ...quote, status: 'accepted', acceptedAt: now },
    });
  } catch (error) {
    console.error('Accept quote error:', error);
    return res.status(500).json({ success: false, message: 'Failed to accept quote' });
  }
}

/**
 * POST /api/quote/:quoteId/reject
 * Customer rejects a quote
 */
export async function rejectQuote(req: Request, res: Response) {
  try {
    const quoteId = parseInt(Array.isArray(req.params.quoteId) ? req.params.quoteId[0] : req.params.quoteId);
    const { customerId, reason } = req.body;

    if (!customerId) {
      return res.status(400).json({ success: false, message: 'customerId is required' });
    }

    const quote = await collections.quotes().findOne({ id: quoteId });
    if (!quote) {
      return res.status(404).json({ success: false, message: 'Quote not found' });
    }
    if (quote.customerId !== Number(customerId)) {
      return res.status(403).json({ success: false, message: 'Only the customer can reject this quote' });
    }
    if (quote.status !== 'sent') {
      return res.status(400).json({ success: false, message: `Quote is already ${quote.status}` });
    }

    const now = new Date().toISOString();

    await collections.quotes().updateOne(
      { id: quoteId },
      { $set: { status: 'rejected' as const, rejectedAt: now, updatedAt: now } }
    );

    // System message
    const msgId = await getNextSequence('messageId');
    const systemMsg = {
      id: msgId,
      conversationId: quote.conversationId,
      senderId: 0,
      senderRole: 'system' as const,
      type: 'system' as const,
      content: `❌ Quote rejected${reason ? ': ' + reason : ''}. Artisan can send a revised quote.`,
      status: 'sent' as const,
      createdAt: now,
    };
    await collections.messages().insertOne(systemMsg);

    const io = (req.app as any).io;
    if (io) {
      io.to(`conversation:${quote.conversationId}`).emit('new_message', systemMsg);
      io.to(`user:${quote.artisanUserId}`).emit('quote_rejected', { quoteId, reason });
    }

    return res.json({ success: true, message: 'Quote rejected' });
  } catch (error) {
    console.error('Reject quote error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reject quote' });
  }
}
