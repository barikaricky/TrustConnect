import { getNextSequence, collections, Booking, Quote, Milestone, Transaction } from '../database/connection';
import { notifyUser } from '../controllers/notification.controller';
import {
  onWorkProofSubmitted,
  onPaymentReleased,
  onMilestoneReleased,
  onRevisionRequested,
} from './aiModeratorService';

/**
 * Escrow State Machine
 * ─────────────────────────────────────────────────────
 * Manages all escrow state transitions with ACID-like
 * guarantees using MongoDB's atomic operations.
 *
 * State flow:
 *   DISCOVERY → QUOTED → NEGOTIATING → FUNDED → IN_PROGRESS → JOB_DONE → RELEASED
 *                                                  ↕ (milestones)
 *   Any state after FUNDED can branch to → DISPUTED
 */

const PLATFORM_COMMISSION_PERCENT = 0.10; // 10%
const AUTO_RELEASE_DAYS = 7;

// ── Valid state transitions ─────────────────────────────────

type BookingStatus = Booking['status'];

const VALID_TRANSITIONS: Record<string, BookingStatus[]> = {
  'pending':      ['accepted', 'rejected', 'cancelled'],
  'accepted':     ['quoted', 'cancelled'],
  'quoted':       ['funded', 'negotiating', 'cancelled'],
  'negotiating':  ['quoted', 'cancelled'],
  'funded':       ['in-progress', 'on-the-way', 'disputed', 'cancelled'],
  'on-the-way':   ['in-progress', 'disputed'],
  'in-progress':  ['job-done', 'disputed'],
  'job-done':     ['released', 'disputed', 'in-progress'],
  'disputed':     ['released', 'in-progress'],
  'released':     ['completed'],
  'completed':    [],
  'cancelled':    [],
  'rejected':     [],
};

export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return (VALID_TRANSITIONS[from] || []).includes(to);
}

// ── Helper: send system chat message ────────────────────────

async function sendSystemMessage(
  conversationId: number,
  content: string,
  io: any,
  extra?: Partial<{ quoteId: number; milestoneIndex: number; type: string }>
) {
  const msgId = await getNextSequence('messageId');
  const now = new Date().toISOString();
  const msg: any = {
    id: msgId,
    conversationId,
    senderId: 0,
    senderRole: 'system' as const,
    type: extra?.type || 'system',
    content,
    status: 'sent' as const,
    createdAt: now,
  };
  if (extra?.quoteId) msg.quoteId = extra.quoteId;
  if (extra?.milestoneIndex !== undefined) msg.milestoneIndex = extra.milestoneIndex;
  await collections.messages().insertOne(msg);
  await collections.conversations().updateOne(
    { id: conversationId },
    { $set: { lastMessage: content.slice(0, 80), lastMessageAt: now, updatedAt: now } }
  );
  if (io) {
    io.to(`conversation:${conversationId}`).emit('new_message', msg);
  }
  return msg;
}

// ── Get conversation for a booking ──────────────────────────

async function getConversationForBooking(booking: Booking) {
  return collections.conversations().findOne({
    $or: [
      { customerId: booking.customerId, artisanUserId: booking.artisanUserId },
      { artisanUserId: booking.artisanUserId, customerId: booking.customerId },
    ],
  });
}

// ── 1. Lock funds (Accept Quote → FUNDED) ───────────────────

export async function lockFunds(
  quote: Quote,
  customerId: number,
  io: any
): Promise<{ success: boolean; message: string; escrowLocked?: number; milestones?: Milestone[] }> {
  const customer = await collections.users().findOne({ id: customerId });
  if (!customer) return { success: false, message: 'Customer not found' };

  const requiredAmount = quote.grandTotal;
  const available = customer.walletBalance || 0;

  if (available < requiredAmount) {
    return {
      success: false,
      message: `Insufficient balance. Need ₦${requiredAmount.toLocaleString()}, have ₦${available.toLocaleString()}.`,
    };
  }

  const now = new Date().toISOString();

  // Atomic deduction — wallet → escrow
  const updateResult = await collections.users().updateOne(
    { id: customerId, walletBalance: { $gte: requiredAmount } },
    { $inc: { walletBalance: -requiredAmount, escrowAmount: requiredAmount } }
  );
  if (updateResult.modifiedCount === 0) {
    return { success: false, message: 'Balance changed during operation. Please try again.' };
  }

  // Create escrow_fund transaction
  const txId = await getNextSequence('transactionId');
  await collections.transactions().insertOne({
    id: txId,
    bookingId: quote.bookingId,
    quoteId: quote.id,
    type: 'escrow_fund' as const,
    amount: requiredAmount,
    fromUserId: customerId,
    paymentRef: `TC-ESC-${quote.id}-${Date.now()}`,
    status: 'held_in_escrow' as const,
    metadata: {
      laborCost: quote.laborCost,
      materialsCost: quote.materialsCost,
      totalCost: quote.totalCost,
      serviceFee: quote.serviceFee,
      grandTotal: quote.grandTotal,
    },
    createdAt: now,
    updatedAt: now,
  });

  // Build milestones if quote has them
  let milestones: Milestone[] | undefined;
  if (quote.milestones && quote.milestones.length > 0) {
    milestones = quote.milestones.map(m => ({
      ...m,
      amount: Math.round(quote.grandTotal * (m.percent / 100)),
      status: 'funded' as const,
    }));
  }

  // Mark quote accepted
  await collections.quotes().updateOne(
    { id: quote.id },
    { $set: { status: 'accepted' as const, acceptedAt: now, updatedAt: now } }
  );

  // Update booking → funded
  if (quote.bookingId) {
    const bookingUpdate: any = {
      status: 'funded',
      quoteId: quote.id,
      escrowAmount: requiredAmount,
      escrowTransactionId: txId,
      fundedAt: now,
      updatedAt: now,
    };
    if (milestones) {
      bookingUpdate.milestones = milestones;
      bookingUpdate.currentMilestone = 0;
    }
    await collections.bookings().updateOne({ id: quote.bookingId }, { $set: bookingUpdate });
  }

  // System chat message
  const conversation = await collections.conversations().findOne({ id: quote.conversationId });
  if (conversation) {
    await sendSystemMessage(
      quote.conversationId,
      `💰 Funds Secured — ₦${requiredAmount.toLocaleString()} locked in escrow. The artisan can now safely start work.`,
      io,
      { quoteId: quote.id, type: 'escrow_status' }
    );
  }

  // Notify artisan
  await notifyUser(
    quote.artisanUserId,
    '💰 Funds Secured!',
    `₦${requiredAmount.toLocaleString()} is locked in escrow. You can safely buy materials and start.`,
    'escrow',
    { bookingId: quote.bookingId, quoteId: quote.id },
    io
  );

  if (io) {
    io.to(`user:${quote.artisanUserId}`).emit('escrow_funded', {
      quoteId: quote.id,
      amount: requiredAmount,
      bookingId: quote.bookingId,
    });
  }

  return { success: true, message: 'Funds locked in escrow', escrowLocked: requiredAmount, milestones };
}

// ── 2. Mark Job Done (artisan submits proof) ────────────────

export async function transitionToJobDone(
  bookingId: number,
  artisanUserId: number,
  workProofPhotos: string[],
  io: any
): Promise<{ success: boolean; message: string }> {
  const booking = await collections.bookings().findOne({ id: bookingId });
  if (!booking) return { success: false, message: 'Booking not found' };
  if (booking.artisanUserId !== artisanUserId) return { success: false, message: 'Unauthorized' };

  if (!canTransition(booking.status, 'job-done')) {
    return { success: false, message: `Cannot mark as done from status: ${booking.status}` };
  }

  if (!workProofPhotos || workProofPhotos.length < 1) {
    return { success: false, message: 'At least one work proof photo/video is required' };
  }

  const now = new Date().toISOString();
  const autoReleaseAt = new Date(Date.now() + AUTO_RELEASE_DAYS * 24 * 60 * 60 * 1000).toISOString();

  await collections.bookings().updateOne(
    { id: bookingId },
    {
      $set: {
        status: 'job-done' as any,
        workProofPhotos,
        workProofSubmittedAt: now,
        jobDoneAt: now,
        autoReleaseAt,
        updatedAt: now,
      },
    }
  );

  // Send work_proof message
  const conversation = await getConversationForBooking(booking);
  if (conversation) {
    const msgId = await getNextSequence('messageId');
    const wpMsg = {
      id: msgId,
      conversationId: conversation.id,
      senderId: artisanUserId,
      senderRole: 'artisan' as const,
      type: 'work_proof' as const,
      content: '📸 Work completed! Please review and approve to release payment.',
      workProofPhotos,
      status: 'sent' as const,
      createdAt: now,
    };
    await collections.messages().insertOne(wpMsg);
    await collections.conversations().updateOne(
      { id: conversation.id },
      {
        $set: { lastMessage: '📸 Work proof submitted', lastMessageAt: now, updatedAt: now },
        $inc: { customerUnread: 1 },
      }
    );
    if (io) {
      io.to(`conversation:${conversation.id}`).emit('new_message', wpMsg);
    }

    // Auto-release notice
    await sendSystemMessage(
      conversation.id,
      `⏱ Auto-release: If no response in ${AUTO_RELEASE_DAYS} days, funds will be released to the artisan automatically.`,
      io,
      { type: 'escrow_status' }
    );
  }

  // Notify customer
  await notifyUser(
    booking.customerId,
    '🔧 Job Completed!',
    'The artisan has finished and submitted proof. Review the work and release payment.',
    'booking',
    { bookingId },
    io
  );

  // AI Moderator: guide customer to review & release
  if (conversation) {
    const artisanUser = await collections.users().findOne({ id: artisanUserId });
    const customerUser = await collections.users().findOne({ id: booking.customerId });
    onWorkProofSubmitted(
      booking, artisanUser?.name || 'The artisan', customerUser?.name || 'Customer',
      conversation.id, workProofPhotos.length, io
    ).catch(err => console.error('AI moderator (work proof) error:', err));
  }

  return { success: true, message: 'Job marked as done. Awaiting customer approval.' };
}

// ── 3. Release Funds (full or milestone) ────────────────────

export async function releaseFunds(
  bookingId: number,
  customerId: number,
  io: any,
  milestoneIndex?: number
): Promise<{ success: boolean; message: string; payout?: any }> {
  const booking = await collections.bookings().findOne({ id: bookingId });
  if (!booking) return { success: false, message: 'Booking not found' };
  if (booking.customerId !== customerId) return { success: false, message: 'Only the customer can release funds' };

  const quote = booking.quoteId
    ? await collections.quotes().findOne({ id: booking.quoteId })
    : null;
  if (!quote) return { success: false, message: 'Quote not found for this booking' };

  const now = new Date().toISOString();

  // Milestone release
  if (milestoneIndex !== undefined && booking.milestones && booking.milestones.length > 0) {
    return releaseMilestone(booking, quote, milestoneIndex, now, io);
  }

  // Full release
  if (booking.status !== 'job-done') {
    return { success: false, message: `Cannot release from status: ${booking.status}` };
  }

  const commission = Math.round(quote.totalCost * PLATFORM_COMMISSION_PERCENT);
  const artisanPayout = quote.totalCost - commission;

  // Release escrow transaction
  if (booking.escrowTransactionId) {
    await collections.transactions().updateOne(
      { id: booking.escrowTransactionId },
      { $set: { status: 'released' as const, updatedAt: now } }
    );
  }

  // Commission transaction
  const commTxId = await getNextSequence('transactionId');
  await collections.transactions().insertOne({
    id: commTxId,
    bookingId: booking.id,
    quoteId: quote.id,
    type: 'commission',
    amount: commission,
    fromUserId: booking.artisanUserId,
    status: 'completed',
    metadata: { totalCost: quote.totalCost, commissionRate: PLATFORM_COMMISSION_PERCENT, serviceFee: quote.serviceFee },
    createdAt: now,
    updatedAt: now,
  });

  // Artisan payout transaction
  const releaseTxId = await getNextSequence('transactionId');
  await collections.transactions().insertOne({
    id: releaseTxId,
    bookingId: booking.id,
    quoteId: quote.id,
    type: 'escrow_release',
    amount: artisanPayout,
    toUserId: booking.artisanUserId,
    status: 'completed',
    metadata: { grossAmount: quote.totalCost, commission, netPayout: artisanPayout },
    createdAt: now,
    updatedAt: now,
  });

  // Credit artisan wallet
  await collections.users().updateOne(
    { id: booking.artisanUserId },
    { $inc: { walletBalance: artisanPayout } }
  );

  // Deduct customer's escrow hold
  await collections.users().updateOne(
    { id: booking.customerId },
    { $inc: { escrowAmount: -(booking.escrowAmount || quote.grandTotal) } }
  );

  // Referral bonus (first completed job)
  const customer = await collections.users().findOne({ id: booking.customerId });
  if (customer?.referredBy && customer.referralRewardClaimed === false) {
    const bonus = Math.round(quote.totalCost * 0.10);
    await collections.users().updateOne(
      { id: booking.customerId },
      { $inc: { walletBalance: bonus }, $set: { referralRewardClaimed: true, updatedAt: now } }
    );
    await collections.users().updateOne(
      { id: customer.referredBy },
      { $inc: { walletBalance: bonus }, $set: { updatedAt: now } }
    );
  }

  // Update booking
  await collections.bookings().updateOne(
    { id: booking.id },
    {
      $set: {
        status: 'released' as any,
        artisanPayout,
        platformCommission: commission,
        finalPrice: quote.totalCost,
        releasedAt: now,
        completedAt: now,
        autoReleaseAt: undefined,
        updatedAt: now,
      },
    }
  );

  // Chat + notifications
  const conversation = await getConversationForBooking(booking);
  if (conversation) {
    await sendSystemMessage(
      conversation.id,
      `✅ Payment released! ₦${artisanPayout.toLocaleString()} credited to artisan's wallet.`,
      io,
      { type: 'escrow_status' }
    );
  }

  await notifyUser(
    booking.artisanUserId,
    '💵 Payment Released!',
    `₦${artisanPayout.toLocaleString()} has been credited to your wallet.`,
    'escrow',
    { bookingId: booking.id, amount: artisanPayout },
    io
  );

  if (io) {
    io.to(`user:${booking.artisanUserId}`).emit('payment_released', { bookingId: booking.id, amount: artisanPayout });
  }

  // AI Moderator: congratulate both parties
  if (conversation) {
    const artisanUser = await collections.users().findOne({ id: booking.artisanUserId });
    const customerUser = await collections.users().findOne({ id: booking.customerId });
    onPaymentReleased(
      booking, artisanUser?.name || 'Artisan', customerUser?.name || 'Customer',
      artisanPayout, conversation.id, io
    ).catch(err => console.error('AI moderator (release) error:', err));
  }

  return {
    success: true,
    message: 'Funds released successfully',
    payout: {
      totalCost: quote.totalCost,
      serviceFee: quote.serviceFee,
      grandTotal: quote.grandTotal,
      commission,
      commissionRate: '10%',
      artisanPayout,
    },
  };
}

// ── 3b. Release a single milestone ──────────────────────────

async function releaseMilestone(
  booking: Booking,
  quote: Quote,
  milestoneIndex: number,
  now: string,
  io: any
): Promise<{ success: boolean; message: string; payout?: any }> {
  const milestones = booking.milestones;
  if (!milestones || milestoneIndex >= milestones.length) {
    return { success: false, message: 'Invalid milestone index' };
  }

  const ms = milestones[milestoneIndex];
  if (ms.status !== 'funded') {
    return { success: false, message: `Milestone already ${ms.status}` };
  }

  const commission = Math.round(ms.amount * PLATFORM_COMMISSION_PERCENT);
  const payout = ms.amount - commission;

  // Release transaction for this milestone
  const txId = await getNextSequence('transactionId');
  await collections.transactions().insertOne({
    id: txId,
    bookingId: booking.id,
    quoteId: quote.id,
    type: 'escrow_release',
    amount: payout,
    toUserId: booking.artisanUserId,
    status: 'completed',
    metadata: { milestoneIndex, milestoneLabel: ms.label, milestonePercent: ms.percent, commission },
    createdAt: now,
    updatedAt: now,
  });

  // Credit artisan
  await collections.users().updateOne({ id: booking.artisanUserId }, { $inc: { walletBalance: payout } });
  // Deduct from customer escrow
  await collections.users().updateOne({ id: booking.customerId }, { $inc: { escrowAmount: -ms.amount } });

  // Update milestone status
  milestones[milestoneIndex] = { ...ms, status: 'released', releasedAt: now };
  const allReleased = milestones.every(m => m.status === 'released');
  const nextMilestone = milestones.findIndex(m => m.status === 'funded');

  const bookingUpdate: any = {
    milestones,
    updatedAt: now,
  };
  if (nextMilestone >= 0) bookingUpdate.currentMilestone = nextMilestone;
  if (allReleased) {
    bookingUpdate.status = 'released';
    bookingUpdate.releasedAt = now;
    bookingUpdate.completedAt = now;
    bookingUpdate.autoReleaseAt = undefined;
  }

  await collections.bookings().updateOne({ id: booking.id }, { $set: bookingUpdate });

  // Chat notification
  const conversation = await getConversationForBooking(booking);
  if (conversation) {
    await sendSystemMessage(
      conversation.id,
      `🏗 Milestone "${ms.label}" (${ms.percent}%) released — ₦${payout.toLocaleString()} to artisan.${allReleased ? ' All milestones complete!' : ''}`,
      io,
      { type: 'milestone', milestoneIndex }
    );
  }

  await notifyUser(
    booking.artisanUserId,
    `💵 Milestone "${ms.label}" Released!`,
    `₦${payout.toLocaleString()} credited to your wallet.`,
    'escrow',
    { bookingId: booking.id, milestoneIndex },
    io
  );

  // AI Moderator: announce milestone progress
  if (conversation) {
    const artisanUser = await collections.users().findOne({ id: booking.artisanUserId });
    onMilestoneReleased(ms, artisanUser?.name || 'Artisan', allReleased, conversation.id, io)
      .catch(err => console.error('AI moderator (milestone) error:', err));
  }

  return {
    success: true,
    message: `Milestone "${ms.label}" released`,
    payout: { milestoneIndex, label: ms.label, percent: ms.percent, amount: ms.amount, commission, artisanPayout: payout, allComplete: allReleased },
  };
}

// ── 4. Auto-Release Cron Check ──────────────────────────────

export async function processAutoReleases(io: any): Promise<number> {
  const now = new Date().toISOString();
  const overdue = await collections.bookings()
    .find({ status: 'job-done', autoReleaseAt: { $lte: now } })
    .toArray();

  let released = 0;
  for (const booking of overdue) {
    const result = await releaseFunds(booking.id, booking.customerId, io);
    if (result.success) {
      released++;
      // Extra notification about auto-release
      const conversation = await getConversationForBooking(booking);
      if (conversation) {
        await sendSystemMessage(
          conversation.id,
          '⏱ Auto-released: 7 days elapsed with no response. Funds have been released to the artisan.',
          io,
          { type: 'escrow_status' }
        );
      }
      await notifyUser(
        booking.customerId,
        '⏱ Auto-Release',
        'Funds were automatically released after 7 days of silence.',
        'escrow',
        { bookingId: booking.id },
        io
      );
    }
  }
  return released;
}

// ── 5. Request Revision (from job-done → back to in-progress) ──

export async function requestRevision(
  bookingId: number,
  customerId: number,
  reason: string,
  io: any
): Promise<{ success: boolean; message: string }> {
  const booking = await collections.bookings().findOne({ id: bookingId });
  if (!booking) return { success: false, message: 'Booking not found' };
  if (booking.customerId !== customerId) return { success: false, message: 'Unauthorized' };
  if (booking.status !== 'job-done') return { success: false, message: 'Can only request revision when job is marked done' };

  const now = new Date().toISOString();

  await collections.bookings().updateOne(
    { id: bookingId },
    {
      $set: {
        status: 'in-progress' as any,
        autoReleaseAt: undefined,
        updatedAt: now,
      },
    }
  );

  const conversation = await getConversationForBooking(booking);
  if (conversation) {
    await sendSystemMessage(
      conversation.id,
      `🔄 Revision requested: "${reason}". Funds remain locked. Artisan must fix and resubmit.`,
      io,
      { type: 'escrow_status' }
    );
  }

  await notifyUser(
    booking.artisanUserId,
    '🔄 Revision Requested',
    `The client isn't satisfied: "${reason}". Please fix the issue and resubmit.`,
    'booking',
    { bookingId },
    io
  );

  // AI Moderator: mediate the revision
  if (conversation) {
    const artisanUser = await collections.users().findOne({ id: booking.artisanUserId });
    const customerUser = await collections.users().findOne({ id: customerId });
    onRevisionRequested(
      artisanUser?.name || 'Artisan', customerUser?.name || 'Customer',
      reason, conversation.id, io
    ).catch(err => console.error('AI moderator (revision) error:', err));
  }

  return { success: true, message: 'Revision requested. Artisan must fix and resubmit proof.' };
}

// ── 6. KYC Withdrawal Guard ────────────────────────────────

export async function checkKycForWithdrawal(userId: number): Promise<{ allowed: boolean; reason?: string }> {
  const user = await collections.users().findOne({ id: userId });
  if (!user) return { allowed: false, reason: 'User not found' };

  if (user.role === 'artisan') {
    const profile = await collections.artisanProfiles().findOne({ userId });
    if (!profile || profile.verificationStatus !== 'verified') {
      return { allowed: false, reason: 'KYC verification required. Complete your identity verification to withdraw funds.' };
    }
  } else if (user.role === 'company') {
    const profile = await collections.companyProfiles().findOne({ userId });
    if (!profile || profile.verificationStatus !== 'verified') {
      return { allowed: false, reason: 'Business verification required. Complete CAC verification to withdraw funds.' };
    }
  }

  if (!user.verified) {
    return { allowed: false, reason: 'Phone verification required before withdrawing.' };
  }

  return { allowed: true };
}
