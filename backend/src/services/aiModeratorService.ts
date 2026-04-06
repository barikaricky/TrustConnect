import { getNextSequence, collections, Quote, Booking, Milestone } from '../database/connection';
import { generateVoiceNote } from './ttsService';

/**
 * AI Moderator Service
 * ─────────────────────────────────────────────────
 * Acts as a neutral AI moderator in the chat between
 * Customer and Artisan. Generates contextual voice notes
 * at key workflow moments using template-based intelligence.
 *
 * ● Zero API cost — template-based text + free Edge TTS
 * ● Zero latency — no external LLM calls
 * ● 100% reliable — no hallucinations with numbers
 */

const AI_NAME = 'TrustConnect AI';

// ── Helper: send AI voice note into chat ────────────────────

async function sendAiMessage(
  conversationId: number,
  text: string,
  io: any,
  generateAudio: boolean = true
): Promise<void> {
  const msgId = await getNextSequence('messageId');
  const now = new Date().toISOString();

  let audioUrl: string | undefined;

  if (generateAudio) {
    try {
      const voice = await generateVoiceNote(text);
      if (voice) {
        audioUrl = voice.relativePath;
      }
    } catch (err) {
      console.error('AI voice generation failed (sending text only):', err);
    }
  }

  const msg: any = {
    id: msgId,
    conversationId,
    senderId: 0,
    senderRole: 'ai' as const,
    type: 'ai_voice_note' as const,
    content: text,
    audioUrl,
    status: 'sent' as const,
    createdAt: now,
  };

  await collections.messages().insertOne(msg);
  await collections.conversations().updateOne(
    { id: conversationId },
    {
      $set: {
        lastMessage: `🤖 ${text.slice(0, 60)}...`,
        lastMessageAt: now,
        updatedAt: now,
      },
    }
  );

  if (io) {
    io.to(`conversation:${conversationId}`).emit('new_message', msg);
  }
}

// ── 1. Quote Submitted → Explain to Customer ───────────────

export async function onQuoteSubmitted(
  quote: Quote,
  artisanName: string,
  customerName: string,
  io: any
): Promise<void> {
  const milestoneText = quote.milestones && quote.milestones.length > 0
    ? ` This job is split into ${quote.milestones.length} milestones: ${quote.milestones.map(m => `${m.label} at ${m.percent}%`).join(', ')}. Payments will be released as each phase is completed.`
    : '';

  const text =
    `Hello ${customerName}! ${artisanName} has submitted a quotation for your review. ` +
    `Here's the breakdown: Labour cost is ${formatNaira(quote.laborCost)}, ` +
    `materials cost is ${formatNaira(quote.materialsCost)}, ` +
    `bringing the subtotal to ${formatNaira(quote.totalCost)}. ` +
    `A 5% service fee of ${formatNaira(quote.serviceFee)} is added, ` +
    `making the grand total ${formatNaira(quote.grandTotal)}. ` +
    `The estimated duration is ${quote.duration}.${milestoneText} ` +
    `If you're satisfied, tap Accept to lock the funds securely in escrow. ` +
    `You can also Negotiate if you'd like to discuss changes. ` +
    `Your money is fully protected until you approve the completed work.`;

  await sendAiMessage(quote.conversationId, text, io);
}

// ── 2. Funds Locked → Guide Artisan to Start ───────────────

export async function onFundsLocked(
  quote: Quote,
  artisanName: string,
  customerName: string,
  io: any
): Promise<void> {
  const milestoneText = quote.milestones && quote.milestones.length > 0
    ? ` This job uses milestone payments. You'll receive payment for each phase as ${customerName} approves your progress.`
    : '';

  const text =
    `Great news, ${artisanName}! ${customerName} has accepted your quote and ` +
    `${formatNaira(quote.grandTotal)} is now safely locked in escrow. ` +
    `You can confidently purchase materials and begin work — the funds are secured.${milestoneText} ` +
    `Once you complete the job, submit your work proof photos and the customer will review your work.`;

  await sendAiMessage(quote.conversationId, text, io);
}

// ── 3. Work Proof Submitted → Guide Customer to Review ─────

export async function onWorkProofSubmitted(
  booking: Booking,
  artisanName: string,
  customerName: string,
  conversationId: number,
  photoCount: number,
  io: any
): Promise<void> {
  const text =
    `Attention ${customerName}! ${artisanName} has submitted ${photoCount} photo${photoCount > 1 ? 's' : ''} ` +
    `as proof that the work is complete. Please scroll up to review the photos carefully. ` +
    `If you are satisfied with the quality, tap Release Payment to pay the artisan. ` +
    `If something needs fixing, tap Request Revision and describe what needs to change. ` +
    `Note: If no action is taken within 7 days, the payment will be automatically released.`;

  await sendAiMessage(conversationId, text, io);
}

// ── 4. Payment Released → Confirm to Both Parties ──────────

export async function onPaymentReleased(
  booking: Booking,
  artisanName: string,
  customerName: string,
  artisanPayout: number,
  conversationId: number,
  io: any
): Promise<void> {
  const text =
    `Congratulations! The job is complete and payment has been released. ` +
    `${artisanName}, ${formatNaira(artisanPayout)} has been credited to your wallet. ` +
    `${customerName}, thank you for using TrustConnect! ` +
    `We encourage both parties to leave a review for each other. ` +
    `It was a pleasure helping you through this transaction. Stay safe!`;

  await sendAiMessage(conversationId, text, io);
}

// ── 5. Milestone Released → Update Progress ────────────────

export async function onMilestoneReleased(
  milestone: Milestone,
  artisanName: string,
  allComplete: boolean,
  conversationId: number,
  io: any
): Promise<void> {
  const text = allComplete
    ? `All milestones are now complete! ${artisanName}, the final payment for "${milestone.label}" ` +
      `of ${formatNaira(milestone.amount)} has been released. Great job finishing the project!`
    : `Milestone "${milestone.label}" (${milestone.percent}%) has been approved and released. ` +
      `${artisanName}, please continue to the next phase of the project. ` +
      `Keep up the great work!`;

  await sendAiMessage(conversationId, text, io);
}

// ── 6. Revision Requested → Mediate ────────────────────────

export async function onRevisionRequested(
  artisanName: string,
  customerName: string,
  reason: string,
  conversationId: number,
  io: any
): Promise<void> {
  const text =
    `${artisanName}, ${customerName} has requested a revision. ` +
    `The reason given is: "${reason}". ` +
    `Please address the concerns and resubmit your work proof photos when ready. ` +
    `The funds remain safely locked in escrow. ` +
    `If you both need help resolving a disagreement, you can open a formal dispute.`;

  await sendAiMessage(conversationId, text, io);
}

// ── 7. Auto-Release Warning → Nudge Customer ───────────────

export async function onAutoReleaseWarning(
  customerName: string,
  daysLeft: number,
  conversationId: number,
  io: any
): Promise<void> {
  const text =
    `Reminder, ${customerName}: The artisan submitted work proof and is waiting for your review. ` +
    `If no action is taken in ${daysLeft} day${daysLeft > 1 ? 's' : ''}, ` +
    `the payment will be automatically released to the artisan. ` +
    `Please review the submitted photos and either release payment or request a revision.`;

  await sendAiMessage(conversationId, text, io);
}

// ── 8. Dispute Summary for Admin ────────────────────────────

export async function generateDisputeSummary(
  bookingId: number
): Promise<string> {
  const booking = await collections.bookings().findOne({ id: bookingId });
  if (!booking) return 'Booking not found.';

  const quote = booking.quoteId
    ? await collections.quotes().findOne({ id: booking.quoteId })
    : null;

  const customer = await collections.users().findOne({ id: booking.customerId });
  const artisan = await collections.users().findOne({ id: booking.artisanUserId });

  // Get conversation
  const conversation = await collections.conversations().findOne({
    $or: [
      { customerId: booking.customerId, artisanUserId: booking.artisanUserId },
      { artisanUserId: booking.artisanUserId, customerId: booking.customerId },
    ],
  });

  let chatHistory = '';
  if (conversation) {
    const messages = await collections.messages()
      .find({ conversationId: conversation.id })
      .sort({ createdAt: 1 })
      .toArray();

    const last50 = messages.slice(-50);
    chatHistory = last50.map(m => {
      const role = m.senderRole === 'ai' ? '🤖 AI' :
                   m.senderRole === 'system' ? '⚙️ System' :
                   m.senderId === booking.customerId ? `👤 ${customer?.name || 'Customer'}` :
                   `🔧 ${artisan?.name || 'Artisan'}`;
      const time = new Date(m.createdAt).toLocaleString();
      return `[${time}] ${role}: ${m.content}`;
    }).join('\n');
  }

  const summary =
    `═══ DISPUTE SUMMARY — Booking #${booking.id} ═══\n\n` +
    `PARTIES:\n` +
    `  Customer: ${customer?.name || 'Unknown'} (ID: ${booking.customerId})\n` +
    `  Artisan: ${artisan?.name || 'Unknown'} (ID: ${booking.artisanUserId})\n\n` +
    `JOB DETAILS:\n` +
    `  Description: ${quote?.workDescription || 'N/A'}\n` +
    `  Grand Total: ${quote ? formatNaira(quote.grandTotal) : 'N/A'}\n` +
    `  Duration: ${quote?.duration || 'N/A'}\n\n` +
    `STATUS TIMELINE:\n` +
    `  Booking Status: ${booking.status}\n` +
    `  Created: ${booking.createdAt || 'N/A'}\n` +
    `  Funded At: ${(booking as any).fundedAt || 'N/A'}\n` +
    `  Job Done At: ${(booking as any).jobDoneAt || 'N/A'}\n` +
    `  Work Proof: ${booking.workProofPhotos ? `${booking.workProofPhotos.length} photos` : 'None'}\n\n` +
    `ESCROW:\n` +
    `  Locked Amount: ${formatNaira(booking.escrowAmount || 0)}\n` +
    (booking.milestones ? `  Milestones:\n${booking.milestones.map(m =>
      `    • ${m.label} (${m.percent}%) — ${formatNaira(m.amount)} — ${m.status}`).join('\n')}\n` : '') +
    `\n═══ CHAT HISTORY (last 50 messages) ═══\n\n${chatHistory || 'No messages found.'}`;

  return summary;
}

// ── Utility ─────────────────────────────────────────────────

function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}
