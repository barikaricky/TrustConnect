import { Request, Response } from 'express';
import { getDB, getNextSequence, collections, Quote, Milestone } from '../database/connection';
import { notifyUser } from './notification.controller';
import { generateQuotePdf } from '../services/quotePdfGenerator';
import { lockFunds } from '../services/escrowStateMachine';
import { onQuoteSubmitted, onFundsLocked } from '../services/aiModeratorService';

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
      milestones: rawMilestones,
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

    // Build milestones if provided (e.g. 30/40/30 split)
    let milestones: Milestone[] | undefined;
    if (rawMilestones && Array.isArray(rawMilestones) && rawMilestones.length > 0) {
      milestones = rawMilestones.map((m: any, i: number) => ({
        index: i,
        label: m.label || `Phase ${i + 1}`,
        percent: Number(m.percent),
        amount: Math.round(grandTotal * (Number(m.percent) / 100)),
        status: 'pending' as const,
      }));
    }

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
      milestones,
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

    // Generate PDF for this quote
    try {
      const artisan = await collections.users().findOne({ id: Number(artisanUserId) });
      const customer = await collections.users().findOne({ id: Number(customerId) });
      const artisanProfile = await collections.artisanProfiles().findOne({ userId: Number(artisanUserId) });
      const pdfResult = await generateQuotePdf(
        quote,
        artisan?.name || 'Artisan',
        customer?.name || 'Customer',
        artisanProfile?.primarySkill,
      );
      await collections.quotes().updateOne(
        { id: quoteId },
        { $set: { pdfUrl: pdfResult.relativePath, securityHash: pdfResult.securityHash } }
      );
      (quote as any).pdfUrl = pdfResult.relativePath;
      (quote as any).securityHash = pdfResult.securityHash;
    } catch (pdfErr) {
      console.error('PDF generation failed (non-blocking):', pdfErr);
    }

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

    // AI Moderator: explain the quote to the customer via voice note
    const artisan = await collections.users().findOne({ id: Number(artisanUserId) });
    const customer = await collections.users().findOne({ id: Number(customerId) });
    onQuoteSubmitted(quote, artisan?.name || 'The artisan', customer?.name || 'Customer', io)
      .catch(err => console.error('AI moderator (quote) error:', err));

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
 * Customer accepts a quote.
 * ─ Checks wallet balance ≥ grandTotal (blocks if insufficient)
 * ─ Locks the exact agreed amount in escrow (deduct from wallet, add to escrowAmount)
 * ─ Creates an escrow_fund transaction
 * ─ Updates booking status → 'funded'
 * ─ Notifies artisan that they may now start work
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

    // Delegate to state machine (atomic wallet→escrow, milestones, notifications)
    const io = (req.app as any).io;
    const result = await lockFunds(quote, Number(customerId), io);

    if (!result.success) {
      const statusCode = result.message.includes('Insufficient') ? 400 : 500;
      return res.status(statusCode).json({ success: false, message: result.message, code: result.message.includes('Insufficient') ? 'INSUFFICIENT_BALANCE' : undefined });
    }

    // AI Moderator: tell the artisan funds are locked, they can start
    const artisan = await collections.users().findOne({ id: quote.artisanUserId });
    const customer = await collections.users().findOne({ id: Number(customerId) });
    onFundsLocked(quote, artisan?.name || 'Artisan', customer?.name || 'Customer', io)
      .catch(err => console.error('AI moderator (funds locked) error:', err));

    return res.json({
      success: true,
      message: 'Quote accepted. Funds locked in escrow. Artisan is now enabled to start work.',
      quote: { ...quote, status: 'accepted' },
      escrowLocked: result.escrowLocked,
      milestones: result.milestones,
      bookingStatus: 'funded',
    });
  } catch (error) {
    console.error('Accept quote error:', error);
    return res.status(500).json({ success: false, message: 'Failed to accept quote' });
  }
}

/**
 * POST /api/quote/:quoteId/reject
 * Customer rejects a quote → booking is cancelled, no funds are held.
 * (Escrow was never locked at this point, so no refund is needed.)
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

    // Mark quote as rejected
    await collections.quotes().updateOne(
      { id: quoteId },
      { $set: { status: 'rejected' as const, rejectedAt: now, updatedAt: now } }
    );

    // Cancel the booking — no escrow held yet, so no refund needed
    if (quote.bookingId) {
      await collections.bookings().updateOne(
        { id: quote.bookingId },
        { $set: { status: 'cancelled' as any, cancelledAt: now, updatedAt: now } }
      );
    }

    // System message in chat
    const msgId = await getNextSequence('messageId');
    const systemMsg = {
      id: msgId,
      conversationId: quote.conversationId,
      senderId: 0,
      senderRole: 'system' as const,
      type: 'system' as const,
      content: `❌ Quote rejected${reason ? ': ' + reason : ''}. Booking has been cancelled.`,
      status: 'sent' as const,
      createdAt: now,
    };
    await collections.messages().insertOne(systemMsg);
    await collections.conversations().updateOne(
      { id: quote.conversationId },
      {
        $set: {
          lastMessage: '❌ Quote rejected — booking cancelled',
          lastMessageAt: now,
          updatedAt: now,
        },
        $inc: { artisanUnread: 1 },
      }
    );

    const io = (req.app as any).io;
    if (io) {
      io.to(`conversation:${quote.conversationId}`).emit('new_message', systemMsg);
      io.to(`user:${quote.artisanUserId}`).emit('quote_rejected', { quoteId, reason });
    }
    await notifyUser(
      quote.artisanUserId,
      '❌ Quote Rejected',
      `The customer rejected your quote${reason ? ': ' + reason : ''}. The booking has been cancelled.`,
      'quote',
      { quoteId, bookingId: quote.bookingId },
      io
    );

    return res.json({
      success: true,
      message: 'Quote rejected. Booking cancelled.',
      bookingStatus: 'cancelled',
    });
  } catch (error) {
    console.error('Reject quote error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reject quote' });
  }
}

/**
 * POST /api/quote/:quoteId/negotiate
 * Customer requests the artisan to revise the quote.
 * ─ Supersedes the current quote (status → 'superseded')
 * ─ Updates booking status → 'negotiating'
 * ─ Notifies the artisan to resubmit a revised quote
 */
export async function requestNegotiation(req: Request, res: Response) {
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
      return res.status(403).json({ success: false, message: 'Only the customer can request a negotiation' });
    }
    if (quote.status !== 'sent') {
      return res.status(400).json({ success: false, message: `Quote is already ${quote.status}` });
    }

    const now = new Date().toISOString();

    // Mark quote as superseded so artisan can resubmit
    await collections.quotes().updateOne(
      { id: quoteId },
      { $set: { status: 'superseded' as const, updatedAt: now } }
    );

    // Update booking status to 'negotiating'
    if (quote.bookingId) {
      await collections.bookings().updateOne(
        { id: quote.bookingId },
        { $set: { status: 'negotiating' as any, negotiatingAt: now, updatedAt: now } }
      );
    }

    // System message in chat
    const msgId = await getNextSequence('messageId');
    const reasonText = reason ? `: "${reason}"` : '';
    const systemMsg = {
      id: msgId,
      conversationId: quote.conversationId,
      senderId: 0,
      senderRole: 'system' as const,
      type: 'system' as const,
      content: `🔄 Customer requested a revised quote${reasonText}. Please resubmit a new quote.`,
      status: 'sent' as const,
      createdAt: now,
    };
    await collections.messages().insertOne(systemMsg);
    await collections.conversations().updateOne(
      { id: quote.conversationId },
      {
        $set: {
          lastMessage: '🔄 Negotiation requested — please revise your quote',
          lastMessageAt: now,
          updatedAt: now,
        },
        $inc: { artisanUnread: 1 },
      }
    );

    // Notify artisan
    const io = (req.app as any).io;
    if (io) {
      io.to(`conversation:${quote.conversationId}`).emit('new_message', systemMsg);
      io.to(`user:${quote.artisanUserId}`).emit('negotiation_requested', {
        quoteId,
        bookingId: quote.bookingId,
        reason,
      });
    }
    await notifyUser(
      quote.artisanUserId,
      '🔄 Quote Revision Requested',
      `The customer wants to negotiate the price${reasonText}. Please submit a revised quote.`,
      'quote',
      { quoteId, bookingId: quote.bookingId },
      io
    );

    return res.json({
      success: true,
      message: 'Negotiation requested. Artisan will submit a revised quote.',
      bookingStatus: 'negotiating',
    });
  } catch (error) {
    console.error('Request negotiation error:', error);
    return res.status(500).json({ success: false, message: 'Failed to request negotiation' });
  }
}
