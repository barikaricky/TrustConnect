import { Request, Response } from 'express';
import { getNextSequence, collections, Dispute, DisputeSettlementOffer } from '../database/connection';

/**
 * Dispute Controller
 * Module 5: Dispute Management System
 * - Raise dispute with evidence
 * - 48hr negotiation period with counter-offers
 * - Auto-escalation after deadline
 * - Admin verdict (release / refund / split)
 * - Trust score impact
 */

const NEGOTIATION_HOURS = 48;

/**
 * POST /api/dispute/raise
 * Raise a dispute on a booking (customer or artisan)
 */
export async function raiseDispute(req: Request, res: Response) {
  try {
    const { bookingId, raisedBy, raisedByRole, category, description, evidenceUrls } = req.body;

    // Validate
    if (!bookingId || !raisedBy || !raisedByRole || !category || !description) {
      return res.status(400).json({
        success: false,
        message: 'Required: bookingId, raisedBy, raisedByRole, category, description',
      });
    }

    if (!evidenceUrls || !Array.isArray(evidenceUrls) || evidenceUrls.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 evidence photos are required',
      });
    }

    const validCategories = ['incomplete_work', 'poor_quality', 'overcharge', 'no_show', 'damage', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
      });
    }

    const booking = await collections.bookings().findOne({ id: Number(bookingId) });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Can only dispute funded, in-progress, or job-done bookings
    if (!['funded', 'in-progress', 'job-done'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot dispute a booking with status: ${booking.status}`,
      });
    }

    // Check if dispute already exists
    const existingDispute = await collections.disputes().findOne({
      bookingId: Number(bookingId),
      status: { $in: ['open', 'negotiating', 'escalated'] },
    });
    if (existingDispute) {
      return res.status(400).json({
        success: false,
        message: 'An active dispute already exists for this booking',
      });
    }

    const now = new Date().toISOString();
    const deadline = new Date(Date.now() + NEGOTIATION_HOURS * 60 * 60 * 1000).toISOString();
    const disputeId = await getNextSequence('disputeId');

    // Get the associated quote/transaction
    const quote = booking.quoteId
      ? await collections.quotes().findOne({ id: booking.quoteId })
      : null;
    const escrowTx = booking.escrowTransactionId
      ? await collections.transactions().findOne({ id: booking.escrowTransactionId })
      : null;

    const dispute: Dispute = {
      id: disputeId,
      bookingId: Number(bookingId),
      quoteId: quote?.id,
      transactionId: escrowTx?.id,
      raisedBy: Number(raisedBy),
      raisedByRole: raisedByRole as 'customer' | 'artisan',
      category,
      description,
      evidenceUrls,
      artisanEvidenceUrls: [],
      status: 'open',
      negotiationDeadline: deadline,
      settlementOffers: [],
      createdAt: now,
      updatedAt: now,
    };

    await collections.disputes().insertOne(dispute);

    // Freeze the booking — set status to 'disputed'
    await collections.bookings().updateOne(
      { id: Number(bookingId) },
      { $set: { status: 'disputed' as any, updatedAt: now } }
    );

    // If escrow transaction exists, mark as disputed (frozen)
    if (escrowTx) {
      await collections.transactions().updateOne(
        { id: escrowTx.id },
        { $set: { metadata: { ...escrowTx.metadata, disputed: true }, updatedAt: now } }
      );
    }

    // System messages in chat
    const conversation = await collections.conversations().findOne({
      $or: [
        { customerId: booking.customerId, artisanUserId: booking.artisanUserId },
        { artisanUserId: booking.artisanUserId, customerId: booking.customerId },
      ],
    });

    if (conversation) {
      const msgId = await getNextSequence('messageId');
      const raisedByLabel = raisedByRole === 'customer' ? 'Customer' : 'Artisan';
      const systemMsg = {
        id: msgId,
        conversationId: conversation.id,
        senderId: 0,
        senderRole: 'system' as const,
        type: 'system' as const,
        content: `⚠️ Dispute raised by ${raisedByLabel}: "${category.replace(/_/g, ' ')}". Escrow funds are frozen. You have 48 hours to negotiate before admin review.`,
        status: 'sent' as const,
        createdAt: now,
      };
      await collections.messages().insertOne(systemMsg);

      const io = (req.app as any).io;
      if (io) {
        io.to(`conversation:${conversation.id}`).emit('new_message', systemMsg);
        // Notify both parties
        io.to(`user:${booking.customerId}`).emit('dispute_raised', { disputeId, bookingId });
        io.to(`user:${booking.artisanUserId}`).emit('dispute_raised', { disputeId, bookingId });
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Dispute raised. 48-hour negotiation period started.',
      dispute,
    });
  } catch (error) {
    console.error('Raise dispute error:', error);
    return res.status(500).json({ success: false, message: 'Failed to raise dispute' });
  }
}

/**
 * GET /api/dispute/:disputeId
 * Get dispute details
 */
export async function getDispute(req: Request, res: Response) {
  try {
    const disputeId = parseInt(Array.isArray(req.params.disputeId) ? req.params.disputeId[0] : req.params.disputeId);
    const dispute = await collections.disputes().findOne({ id: disputeId });

    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Dispute not found' });
    }

    const booking = await collections.bookings().findOne({ id: dispute.bookingId });
    const quote = dispute.quoteId
      ? await collections.quotes().findOne({ id: dispute.quoteId })
      : null;

    // Get user names
    const raiser = await collections.users().findOne({ id: dispute.raisedBy });
    const customer = booking ? await collections.users().findOne({ id: booking.customerId }) : null;
    const artisan = booking ? await collections.users().findOne({ id: booking.artisanUserId }) : null;

    return res.json({
      success: true,
      dispute: {
        ...dispute,
        raiserName: raiser?.name,
        customerName: customer?.name,
        artisanName: artisan?.name,
        booking: booking ? {
          id: booking.id,
          serviceType: booking.serviceType,
          escrowAmount: booking.escrowAmount,
          status: booking.status,
        } : null,
        quote: quote ? {
          laborCost: quote.laborCost,
          materialsCost: quote.materialsCost,
          totalCost: quote.totalCost,
          serviceFee: quote.serviceFee,
          grandTotal: quote.grandTotal,
        } : null,
      },
    });
  } catch (error) {
    console.error('Get dispute error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get dispute' });
  }
}

/**
 * GET /api/dispute/booking/:bookingId
 * Get dispute for a specific booking
 */
export async function getDisputeByBooking(req: Request, res: Response) {
  try {
    const bookingId = parseInt(Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId);
    const dispute = await collections.disputes().findOne({
      bookingId,
      status: { $in: ['open', 'negotiating', 'escalated'] },
    });

    return res.json({ success: true, dispute: dispute || null });
  } catch (error) {
    console.error('Get dispute by booking error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get dispute' });
  }
}

/**
 * POST /api/dispute/:disputeId/respond
 * Artisan responds with evidence and/or counter-evidence
 */
export async function respondToDispute(req: Request, res: Response) {
  try {
    const disputeId = parseInt(Array.isArray(req.params.disputeId) ? req.params.disputeId[0] : req.params.disputeId);
    const { artisanUserId, response, evidenceUrls } = req.body;

    const dispute = await collections.disputes().findOne({ id: disputeId });
    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Dispute not found' });
    }
    if (!['open', 'negotiating'].includes(dispute.status)) {
      return res.status(400).json({ success: false, message: 'Dispute is no longer open for response' });
    }

    const now = new Date().toISOString();
    const updates: any = { updatedAt: now };

    if (response) updates.artisanResponse = response;
    if (evidenceUrls && Array.isArray(evidenceUrls)) {
      updates.artisanEvidenceUrls = [...dispute.artisanEvidenceUrls, ...evidenceUrls];
    }
    if (dispute.status === 'open') {
      updates.status = 'negotiating';
    }

    await collections.disputes().updateOne({ id: disputeId }, { $set: updates });

    return res.json({ success: true, message: 'Response submitted' });
  } catch (error) {
    console.error('Respond to dispute error:', error);
    return res.status(500).json({ success: false, message: 'Failed to respond' });
  }
}

/**
 * POST /api/dispute/:disputeId/offer
 * Make a settlement offer (partial refund)
 */
export async function makeSettlementOffer(req: Request, res: Response) {
  try {
    const disputeId = parseInt(Array.isArray(req.params.disputeId) ? req.params.disputeId[0] : req.params.disputeId);
    const { offeredBy, offeredByRole, amount, message } = req.body;

    if (!offeredBy || !offeredByRole || amount == null) {
      return res.status(400).json({
        success: false,
        message: 'offeredBy, offeredByRole, and amount are required',
      });
    }

    const dispute = await collections.disputes().findOne({ id: disputeId });
    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Dispute not found' });
    }
    if (!['open', 'negotiating'].includes(dispute.status)) {
      return res.status(400).json({ success: false, message: 'Dispute is no longer open for offers' });
    }

    // Validate amount doesn't exceed escrow
    const booking = await collections.bookings().findOne({ id: dispute.bookingId });
    if (booking && Number(amount) > (booking.escrowAmount || 0)) {
      return res.status(400).json({
        success: false,
        message: `Settlement amount cannot exceed escrow amount of ₦${booking.escrowAmount}`,
      });
    }

    const now = new Date().toISOString();
    const offer: DisputeSettlementOffer = {
      offeredBy: Number(offeredBy),
      offeredByRole,
      amount: Number(amount),
      message,
      status: 'pending',
      createdAt: now,
    };

    await collections.disputes().updateOne(
      { id: disputeId },
      {
        $push: { settlementOffers: offer as any },
        $set: { status: 'negotiating' as const, updatedAt: now },
      }
    );

    // Notify other party
    const io = (req.app as any).io;
    if (io && booking) {
      const notifyUserId = offeredByRole === 'customer'
        ? booking.artisanUserId
        : booking.customerId;
      io.to(`user:${notifyUserId}`).emit('settlement_offer', { disputeId, offer });
    }

    return res.json({ success: true, message: 'Settlement offer sent' });
  } catch (error) {
    console.error('Make settlement offer error:', error);
    return res.status(500).json({ success: false, message: 'Failed to make offer' });
  }
}

/**
 * POST /api/dispute/:disputeId/accept-offer
 * Accept a settlement offer → resolve dispute with partial refund
 */
export async function acceptSettlementOffer(req: Request, res: Response) {
  try {
    const disputeId = parseInt(Array.isArray(req.params.disputeId) ? req.params.disputeId[0] : req.params.disputeId);
    const { acceptedBy, offerIndex } = req.body;

    const dispute = await collections.disputes().findOne({ id: disputeId });
    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Dispute not found' });
    }

    const offer = dispute.settlementOffers[offerIndex];
    if (!offer || offer.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Invalid or already processed offer' });
    }

    // The person accepting must NOT be the one who made the offer
    if (offer.offeredBy === Number(acceptedBy)) {
      return res.status(400).json({ success: false, message: 'You cannot accept your own offer' });
    }

    const now = new Date().toISOString();
    const booking = await collections.bookings().findOne({ id: dispute.bookingId });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Process settlement — split the escrow
    const refundAmount = offer.amount;
    const artisanAmount = (booking.escrowAmount || 0) - refundAmount;

    // Update offer status
    const offers = dispute.settlementOffers.map((o, i) => ({
      ...o,
      status: (i === offerIndex ? 'accepted' : o.status) as 'pending' | 'accepted' | 'rejected',
    }));

    // Resolve dispute
    await collections.disputes().updateOne(
      { id: disputeId },
      {
        $set: {
          status: 'resolved' as const,
          settlementOffers: offers,
          resolvedAt: now,
          updatedAt: now,
        },
      }
    );

    // Process financial settlement
    await processDisputeSettlement(booking, refundAmount, artisanAmount, 'settlement', req);

    return res.json({
      success: true,
      message: 'Settlement accepted. Funds distributed.',
      settlement: { refundAmount, artisanAmount },
    });
  } catch (error) {
    console.error('Accept settlement error:', error);
    return res.status(500).json({ success: false, message: 'Failed to accept settlement' });
  }
}

/**
 * POST /api/dispute/:disputeId/escalate
 * Escalate dispute to admin (manual or auto after 48hrs)
 */
export async function escalateDispute(req: Request, res: Response) {
  try {
    const disputeId = parseInt(Array.isArray(req.params.disputeId) ? req.params.disputeId[0] : req.params.disputeId);

    const dispute = await collections.disputes().findOne({ id: disputeId });
    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Dispute not found' });
    }
    if (dispute.status === 'resolved' || dispute.status === 'escalated') {
      return res.status(400).json({ success: false, message: `Dispute is already ${dispute.status}` });
    }

    const now = new Date().toISOString();
    await collections.disputes().updateOne(
      { id: disputeId },
      { $set: { status: 'escalated' as const, updatedAt: now } }
    );

    // Notify both parties
    const booking = await collections.bookings().findOne({ id: dispute.bookingId });
    if (booking) {
      const conversation = await collections.conversations().findOne({
        $or: [
          { customerId: booking.customerId, artisanUserId: booking.artisanUserId },
          { artisanUserId: booking.artisanUserId, customerId: booking.customerId },
        ],
      });

      if (conversation) {
        const msgId = await getNextSequence('messageId');
        const systemMsg = {
          id: msgId,
          conversationId: conversation.id,
          senderId: 0,
          senderRole: 'system' as const,
          type: 'system' as const,
          content: '⚖️ Dispute escalated to admin review. An admin will review the evidence and render a verdict.',
          status: 'sent' as const,
          createdAt: now,
        };
        await collections.messages().insertOne(systemMsg);

        const io = (req.app as any).io;
        if (io) {
          io.to(`conversation:${conversation.id}`).emit('new_message', systemMsg);
        }
      }
    }

    return res.json({ success: true, message: 'Dispute escalated to admin review' });
  } catch (error) {
    console.error('Escalate dispute error:', error);
    return res.status(500).json({ success: false, message: 'Failed to escalate' });
  }
}

/**
 * POST /api/dispute/:disputeId/verdict
 * Admin renders verdict (release_to_artisan | refund_to_customer | split_payment)
 */
export async function adminVerdict(req: Request, res: Response) {
  try {
    const disputeId = parseInt(Array.isArray(req.params.disputeId) ? req.params.disputeId[0] : req.params.disputeId);
    const { verdict, adminId, note, splitPercentage } = req.body;

    const validVerdicts = ['release_to_artisan', 'refund_to_customer', 'split_payment'];
    if (!verdict || !validVerdicts.includes(verdict)) {
      return res.status(400).json({
        success: false,
        message: `Invalid verdict. Must be one of: ${validVerdicts.join(', ')}`,
      });
    }

    if (verdict === 'split_payment' && (splitPercentage == null || splitPercentage < 0 || splitPercentage > 100)) {
      return res.status(400).json({
        success: false,
        message: 'splitPercentage (0-100, artisan share) is required for split_payment verdict',
      });
    }

    const dispute = await collections.disputes().findOne({ id: disputeId });
    if (!dispute) {
      return res.status(404).json({ success: false, message: 'Dispute not found' });
    }
    if (dispute.status === 'resolved') {
      return res.status(400).json({ success: false, message: 'Dispute already resolved' });
    }

    const booking = await collections.bookings().findOne({ id: dispute.bookingId });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const escrowAmount = booking.escrowAmount || 0;
    const now = new Date().toISOString();

    let refundAmount = 0;
    let artisanAmount = 0;

    if (verdict === 'release_to_artisan') {
      artisanAmount = escrowAmount;
      refundAmount = 0;
    } else if (verdict === 'refund_to_customer') {
      refundAmount = escrowAmount;
      artisanAmount = 0;
    } else if (verdict === 'split_payment') {
      artisanAmount = Math.round(escrowAmount * (splitPercentage / 100));
      refundAmount = escrowAmount - artisanAmount;
    }

    // Update dispute
    await collections.disputes().updateOne(
      { id: disputeId },
      {
        $set: {
          status: 'resolved' as const,
          adminVerdict: verdict,
          adminVerdictBy: adminId,
          adminVerdictNote: note,
          splitPercentage: verdict === 'split_payment' ? splitPercentage : undefined,
          resolvedAt: now,
          updatedAt: now,
        },
      }
    );

    // Process financial settlement
    await processDisputeSettlement(booking, refundAmount, artisanAmount, verdict, req);

    // Update trust score if artisan was at fault
    if (verdict === 'refund_to_customer' || (verdict === 'split_payment' && splitPercentage < 50)) {
      await updateTrustScore(booking.artisanUserId, 'dispute_lost');
    } else if (verdict === 'release_to_artisan') {
      await updateTrustScore(booking.artisanUserId, 'dispute_won');
    }

    // Audit log
    await collections.auditLogs().insertOne({
      id: await getNextSequence('auditLogId'),
      adminId,
      adminEmail: 'admin',
      action: 'DISPUTE_VERDICT',
      resource: 'dispute',
      resourceId: disputeId,
      details: { verdict, splitPercentage, refundAmount, artisanAmount, note },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      status: 'success',
      timestamp: now,
    });

    return res.json({
      success: true,
      message: `Verdict: ${verdict}`,
      settlement: { refundAmount, artisanAmount },
    });
  } catch (error) {
    console.error('Admin verdict error:', error);
    return res.status(500).json({ success: false, message: 'Failed to render verdict' });
  }
}

/**
 * GET /api/dispute/admin/all
 * Admin: Get all disputes (for Dispute Center)
 */
export async function getAllDisputes(req: Request, res: Response) {
  try {
    const { status, page = '1', limit = '20' } = req.query;
    const filter: any = {};
    if (status) filter.status = status;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const disputes = await collections.disputes()
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string))
      .toArray();

    const total = await collections.disputes().countDocuments(filter);

    // Enrich with user/booking info
    const enriched = await Promise.all(disputes.map(async (d) => {
      const booking = await collections.bookings().findOne({ id: d.bookingId });
      const raiser = await collections.users().findOne({ id: d.raisedBy });
      const customer = booking ? await collections.users().findOne({ id: booking.customerId }) : null;
      const artisan = booking ? await collections.users().findOne({ id: booking.artisanUserId }) : null;

      return {
        ...d,
        raiserName: raiser?.name,
        customerName: customer?.name,
        artisanName: artisan?.name,
        serviceType: booking?.serviceType,
        escrowAmount: booking?.escrowAmount,
      };
    }));

    return res.json({
      success: true,
      disputes: enriched,
      total,
      page: parseInt(page as string),
      totalPages: Math.ceil(total / parseInt(limit as string)),
    });
  } catch (error) {
    console.error('Get all disputes error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get disputes' });
  }
}

/**
 * POST /api/dispute/upload-evidence
 * Upload evidence photos for a dispute
 */
export async function uploadDisputeEvidence(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const imageUrl = `/uploads/disputes/${req.file.filename}`;
    return res.json({ success: true, imageUrl });
  } catch (error) {
    console.error('Upload evidence error:', error);
    return res.status(500).json({ success: false, message: 'Failed to upload' });
  }
}

// ─── Internal Helpers ──────────────────────────────────────────────

/**
 * Process financial settlement after dispute resolution
 */
async function processDisputeSettlement(
  booking: any,
  refundAmount: number,
  artisanAmount: number,
  verdictType: string,
  req: Request
) {
  const now = new Date().toISOString();

  // Release escrow transaction
  if (booking.escrowTransactionId) {
    await collections.transactions().updateOne(
      { id: booking.escrowTransactionId },
      { $set: { status: 'released' as const, updatedAt: now } }
    );
  }

  // Create refund transaction if applicable
  if (refundAmount > 0) {
    const refundTxId = await getNextSequence('transactionId');
    await collections.transactions().insertOne({
      id: refundTxId,
      bookingId: booking.id,
      type: verdictType === 'split_payment' ? 'dispute_split' as const : 'refund' as const,
      amount: refundAmount,
      toUserId: booking.customerId,
      status: 'completed',
      metadata: { verdictType, disputeSettlement: true },
      createdAt: now,
      updatedAt: now,
    });

    // Credit customer wallet
    await collections.users().updateOne(
      { id: booking.customerId },
      { $inc: { walletBalance: refundAmount } }
    );
  }

  // Create artisan payout transaction if applicable
  if (artisanAmount > 0) {
    // Apply 10% commission on artisan's share
    const commission = Math.round(artisanAmount * 0.10);
    const netPayout = artisanAmount - commission;

    const artisanTxId = await getNextSequence('transactionId');
    await collections.transactions().insertOne({
      id: artisanTxId,
      bookingId: booking.id,
      type: 'escrow_release' as const,
      amount: netPayout,
      toUserId: booking.artisanUserId,
      status: 'completed',
      metadata: { verdictType, grossAmount: artisanAmount, commission, netPayout },
      createdAt: now,
      updatedAt: now,
    });

    // Commission transaction
    if (commission > 0) {
      const commTxId = await getNextSequence('transactionId');
      await collections.transactions().insertOne({
        id: commTxId,
        bookingId: booking.id,
        type: 'commission' as const,
        amount: commission,
        fromUserId: booking.artisanUserId,
        status: 'completed',
        metadata: { verdictType, commissionRate: 0.10 },
        createdAt: now,
        updatedAt: now,
      });
    }

    // Credit artisan wallet
    await collections.users().updateOne(
      { id: booking.artisanUserId },
      { $inc: { walletBalance: netPayout } }
    );
  }

  // Deduct from customer's escrow tracking
  await collections.users().updateOne(
    { id: booking.customerId },
    { $inc: { escrowAmount: -(booking.escrowAmount || 0) } }
  );

  // Update booking status
  await collections.bookings().updateOne(
    { id: booking.id },
    {
      $set: {
        status: 'completed' as any,
        artisanPayout: artisanAmount > 0 ? artisanAmount - Math.round(artisanAmount * 0.10) : 0,
        platformCommission: artisanAmount > 0 ? Math.round(artisanAmount * 0.10) : 0,
        completedAt: now,
        updatedAt: now,
      },
    }
  );

  // System message
  const conversation = await collections.conversations().findOne({
    $or: [
      { customerId: booking.customerId, artisanUserId: booking.artisanUserId },
      { artisanUserId: booking.artisanUserId, customerId: booking.customerId },
    ],
  });

  if (conversation) {
    let content = '';
    if (refundAmount > 0 && artisanAmount > 0) {
      content = `⚖️ Dispute resolved — Split payment: ₦${(artisanAmount - Math.round(artisanAmount * 0.10)).toLocaleString()} to artisan, ₦${refundAmount.toLocaleString()} refunded to customer.`;
    } else if (refundAmount > 0) {
      content = `⚖️ Dispute resolved — Full refund of ₦${refundAmount.toLocaleString()} to customer.`;
    } else {
      content = `⚖️ Dispute resolved — Full payment of ₦${(artisanAmount - Math.round(artisanAmount * 0.10)).toLocaleString()} released to artisan.`;
    }

    const msgId = await getNextSequence('messageId');
    const systemMsg = {
      id: msgId,
      conversationId: conversation.id,
      senderId: 0,
      senderRole: 'system' as const,
      type: 'system' as const,
      content,
      status: 'sent' as const,
      createdAt: now,
    };
    await collections.messages().insertOne(systemMsg);

    const io = (req.app as any).io;
    if (io) {
      io.to(`conversation:${conversation.id}`).emit('new_message', systemMsg);
      io.to(`user:${booking.customerId}`).emit('dispute_resolved', { bookingId: booking.id, refundAmount });
      io.to(`user:${booking.artisanUserId}`).emit('dispute_resolved', { bookingId: booking.id, artisanAmount });
    }
  }
}

/**
 * Update artisan trust score based on dispute outcome
 */
async function updateTrustScore(artisanUserId: number, outcome: 'dispute_won' | 'dispute_lost') {
  const profile = await collections.artisanProfiles().findOne({ userId: artisanUserId });
  if (!profile) return;

  // Get all resolved disputes involving this artisan
  const artisanBookings = await collections.bookings().find({ artisanUserId }).toArray();
  const bookingIds = artisanBookings.map(b => b.id);

  const totalDisputes = await collections.disputes().countDocuments({
    bookingId: { $in: bookingIds },
    status: 'resolved',
  });

  const lostDisputes = await collections.disputes().countDocuments({
    bookingId: { $in: bookingIds },
    status: 'resolved',
    adminVerdict: { $in: ['refund_to_customer'] },
  });

  // Trust score calculation:
  // Start at 100, lose 15 per lost dispute, gain 5 per won dispute
  // Minimum 0, maximum 100
  const reviews = await collections.reviews().find({ artisanId: profile.id }).toArray();
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 5;

  let trustScore = Math.round(avgRating * 20); // Base: rating * 20 (max 100)
  trustScore -= lostDisputes * 15;
  trustScore += (totalDisputes - lostDisputes) * 5;
  trustScore = Math.max(0, Math.min(100, trustScore));

  // Determine badge level based on trust score
  let badgeLevel = 'bronze';
  if (trustScore >= 90) badgeLevel = 'gold';
  else if (trustScore >= 70) badgeLevel = 'silver';

  await collections.artisanProfiles().updateOne(
    { userId: artisanUserId },
    {
      $set: {
        trustScore,
        badgeLevel,
        updatedAt: new Date().toISOString(),
      } as any,
    }
  );
}
