import { Request, Response } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { getNextSequence, collections, Transaction } from '../database/connection';
import { notifyUser } from './notification.controller';
import {
  transitionToJobDone,
  releaseFunds,
  requestRevision,
  processAutoReleases,
} from '../services/escrowStateMachine';
import { generateDisputeSummary } from '../services/aiModeratorService';

/**
 * Escrow Controller
 * Module 4: Escrow Payment System — Flutterwave Edition
 * - Fund escrow (Flutterwave Standard / payment link)
 * - Verify payment / Webhook
 * - Release funds on job completion
 * - Commission calculation (10%)
 */

const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY || '';
const FLW_HASH   = process.env.FLW_SECRET_HASH || 'trustconnect_hash';
const PLATFORM_COMMISSION_PERCENT = 0.10; // 10%

/* ─────────────────────────────────────────────────────────────
 * POST /api/escrow/fund
 * Initialize escrow funding via Flutterwave Standard payment
 * Idempotency: Uses idempotencyKey to prevent double charges
 * ───────────────────────────────────────────────────────────── */
export async function fundEscrow(req: Request, res: Response) {
  try {
    const { quoteId, customerId, idempotencyKey } = req.body;

    if (!quoteId || !customerId) {
      return res.status(400).json({ success: false, message: 'quoteId and customerId are required' });
    }

    // Idempotency check
    if (idempotencyKey) {
      const existing = await collections.transactions().findOne({ idempotencyKey });
      if (existing) {
        return res.json({
          success: true,
          message: 'Payment already initiated',
          transaction: existing,
          duplicate: true,
        });
      }
    }

    const quote = await collections.quotes().findOne({ id: Number(quoteId) });
    if (!quote) {
      return res.status(404).json({ success: false, message: 'Quote not found' });
    }
    if (quote.status !== 'accepted') {
      return res.status(400).json({ success: false, message: 'Quote must be accepted before funding escrow' });
    }
    if (quote.customerId !== Number(customerId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Already funded?
    const existingTx = await collections.transactions().findOne({
      quoteId: quote.id,
      type: 'escrow_fund',
      status: { $in: ['held_in_escrow', 'completed'] },
    });
    if (existingTx) {
      return res.status(400).json({ success: false, message: 'Escrow already funded for this quote' });
    }

    const customer = await collections.users().findOne({ id: Number(customerId) });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Payment reference
    const paymentRef = `TC-ESC-${quote.id}-${Date.now()}`;
    const now = new Date().toISOString();
    const txId = await getNextSequence('transactionId');

    // Pending transaction
    const transaction: Transaction = {
      id: txId,
      bookingId: quote.bookingId,
      quoteId: quote.id,
      type: 'escrow_fund',
      amount: quote.grandTotal,
      fromUserId: quote.customerId,
      toUserId: undefined,
      paymentRef,
      status: 'pending',
      idempotencyKey: idempotencyKey || `auto-${txId}`,
      metadata: {
        laborCost: quote.laborCost,
        materialsCost: quote.materialsCost,
        totalCost: quote.totalCost,
        serviceFee: quote.serviceFee,
        grandTotal: quote.grandTotal,
      },
      createdAt: now,
      updatedAt: now,
    };

    await collections.transactions().insertOne(transaction);

    /* ── Try Flutterwave Standard payment ──────────────── */
    let flwData: any = null;

    if (FLW_SECRET && FLW_SECRET !== 'FLWSECK-xxxxxx') {
      try {
        const response = await fetch('https://api.flutterwave.com/v3/payments', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${FLW_SECRET}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tx_ref: paymentRef,
            amount: quote.grandTotal,
            currency: 'NGN',
            redirect_url: `trustconnect://escrow/verify?ref=${paymentRef}`,
            customer: {
              email: customer.email || `${customer.phone}@trustconnect.ng`,
              phonenumber: customer.phone,
              name: customer.name || 'Customer',
            },
            customizations: {
              title: 'TrustConnect Escrow',
              description: `Escrow for Quote #${quote.id}`,
              logo: 'https://trustconnect.ng/logo.png',
            },
            meta: {
              quoteId: quote.id,
              customerId: quote.customerId,
              artisanUserId: quote.artisanUserId,
              transactionId: txId,
            },
          }),
        });
        flwData = await response.json();

        if (flwData.status === 'success' && flwData.data?.link) {
          await collections.transactions().updateOne(
            { id: txId },
            {
              $set: {
                flutterwaveRef: paymentRef,
                updatedAt: new Date().toISOString(),
              },
            }
          );
        } else {
          flwData = null; // fall through to dev mode
        }
      } catch (err) {
        console.error('Flutterwave init error:', err);
        flwData = null;
      }
    }

    /* ── Dev / test fallback ───────────────────────────── */
    if (!flwData) {
      flwData = {
        status: 'success',
        message: 'DEV MODE: Payment simulated',
        data: {
          link: `http://localhost:3000/api/escrow/dev-pay?ref=${paymentRef}`,
        },
      };
      await collections.transactions().updateOne(
        { id: txId },
        {
          $set: {
            flutterwaveRef: paymentRef,
            updatedAt: new Date().toISOString(),
          },
        }
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Escrow payment initialized',
      transaction: { id: txId, paymentRef, amount: quote.grandTotal },
      flutterwave: {
        payment_link: flwData.data.link,
        tx_ref: paymentRef,
      },
      // Keep backward-compat shape for mobile
      paystack: {
        authorization_url: flwData.data.link,
        access_code: `flw_${txId}`,
        reference: paymentRef,
      },
    });
  } catch (error) {
    console.error('Fund escrow error:', error);
    return res.status(500).json({ success: false, message: 'Failed to initialize escrow' });
  }
}

/* ─────────────────────────────────────────────────────────────
 * GET /api/escrow/dev-pay?ref=xxx
 * DEV ONLY: Simulate successful Flutterwave payment
 * ───────────────────────────────────────────────────────────── */
export async function devSimulatePayment(req: Request, res: Response) {
  try {
    const { ref } = req.query;
    if (!ref) {
      return res.status(400).json({ success: false, message: 'Missing payment reference' });
    }

    const tx = await collections.transactions().findOne({ paymentRef: ref as string });
    if (!tx) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    if (tx.status !== 'pending') {
      return res.json({ success: true, message: 'Already processed', transaction: tx });
    }

    await processSuccessfulPayment(tx.id, req);

    const updatedTx = await collections.transactions().findOne({ id: tx.id });
    return res.json({
      success: true,
      message: 'DEV: Payment simulated successfully. Escrow funded.',
      transaction: updatedTx,
    });
  } catch (error) {
    console.error('Dev simulate payment error:', error);
    return res.status(500).json({ success: false, message: 'Simulation failed' });
  }
}

/* ─────────────────────────────────────────────────────────────
 * POST /api/escrow/webhook
 * Flutterwave webhook handler
 * Verifies the secret hash header, then processes charge.completed
 * ───────────────────────────────────────────────────────────── */
export async function flutterwaveWebhook(req: Request, res: Response) {
  try {
    // Verify Flutterwave signature
    const secretHash = req.headers['verif-hash'] as string;
    if (!secretHash || secretHash !== FLW_HASH) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    const { event, data } = req.body;

    if (event === 'charge.completed' && data.status === 'successful') {
      const txRef = data.tx_ref || data.txRef;
      const tx = await collections.transactions().findOne({ paymentRef: txRef });
      if (tx && tx.status === 'pending') {
        // Optionally store Flutterwave's own transaction id
        await collections.transactions().updateOne(
          { id: tx.id },
          { $set: { flutterwaveId: data.id, updatedAt: new Date().toISOString() } }
        );
        await processSuccessfulPayment(tx.id, req);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(200).json({ received: true });
  }
}

// Keep backward-compat alias
export const paystackWebhook = flutterwaveWebhook;

/* ─────────────────────────────────────────────────────────────
 * POST /api/escrow/verify
 * Customer-initiated payment verification after redirect
 * ───────────────────────────────────────────────────────────── */
export async function verifyPayment(req: Request, res: Response) {
  try {
    const { paymentRef } = req.body;

    if (!paymentRef) {
      return res.status(400).json({ success: false, message: 'paymentRef is required' });
    }

    const tx = await collections.transactions().findOne({ paymentRef });
    if (!tx) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (tx.status === 'held_in_escrow') {
      return res.json({ success: true, message: 'Escrow funded', transaction: tx });
    }

    // Verify with Flutterwave API
    if (FLW_SECRET && FLW_SECRET !== 'FLWSECK-xxxxxx') {
      try {
        // First find the Flutterwave transaction by tx_ref
        const searchRes = await fetch(
          `https://api.flutterwave.com/v3/transactions?tx_ref=${paymentRef}`,
          { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
        );
        const searchData: any = await searchRes.json();

        if (searchData.status === 'success' && searchData.data?.length > 0) {
          const flwTx = searchData.data[0];
          if (flwTx.status === 'successful' && tx.status === 'pending') {
            await processSuccessfulPayment(tx.id, req);
            const updated = await collections.transactions().findOne({ id: tx.id });
            return res.json({ success: true, message: 'Payment verified. Escrow funded.', transaction: updated });
          }
        }
      } catch (err) {
        console.error('Flutterwave verify error:', err);
      }
    }

    return res.json({ success: true, transaction: tx });
  } catch (error) {
    console.error('Verify payment error:', error);
    return res.status(500).json({ success: false, message: 'Verification failed' });
  }
}

/**
 * Internal: Process a successful payment — fund the escrow
 */
async function processSuccessfulPayment(transactionId: number, req: Request) {
  const now = new Date().toISOString();
  const tx = await collections.transactions().findOne({ id: transactionId });
  if (!tx || tx.status !== 'pending') return;

  // Update transaction status to held_in_escrow
  await collections.transactions().updateOne(
    { id: transactionId },
    { $set: { status: 'held_in_escrow' as const, updatedAt: now } }
  );

  // Update the quote's linked booking to 'funded'
  const quote = tx.quoteId ? await collections.quotes().findOne({ id: tx.quoteId }) : null;

  if (quote) {
    // Update or create booking with escrow details
    if (quote.bookingId) {
      await collections.bookings().updateOne(
        { id: quote.bookingId },
        {
          $set: {
            status: 'funded' as any,
            escrowTransactionId: transactionId,
            escrowAmount: tx.amount,
            quoteId: quote.id,
            updatedAt: now,
          },
        }
      );
    }

    // Update customer's escrowAmount
    await collections.users().updateOne(
      { id: quote.customerId },
      { $inc: { escrowAmount: tx.amount } }
    );

    // Send system message in the conversation
    const msgId = await getNextSequence('messageId');
    const systemMsg = {
      id: msgId,
      conversationId: quote.conversationId,
      senderId: 0,
      senderRole: 'system' as const,
      type: 'system' as const,
      content: `💰 Escrow funded — ₦${tx.amount.toLocaleString()} is held securely. Artisan can now begin work.`,
      status: 'sent' as const,
      createdAt: now,
    };
    await collections.messages().insertOne(systemMsg);

    // Update conversation
    await collections.conversations().updateOne(
      { id: quote.conversationId },
      {
        $set: {
          lastMessage: '💰 Escrow funded',
          lastMessageAt: now,
          updatedAt: now,
        },
      }
    );

    // Socket notification
    const io = (req.app as any).io;
    if (io) {
      io.to(`conversation:${quote.conversationId}`).emit('new_message', systemMsg);
      io.to(`user:${quote.artisanUserId}`).emit('escrow_funded', {
        quoteId: quote.id,
        amount: tx.amount,
        bookingId: quote.bookingId,
      });
      io.to(`user:${quote.customerId}`).emit('escrow_funded', {
        quoteId: quote.id,
        amount: tx.amount,
        bookingId: quote.bookingId,
      });
    }

    // Push notifications
    await notifyUser(
      quote.artisanUserId,
      '💰 Escrow Funded!',
      `₦${tx.amount.toLocaleString()} has been secured in escrow. You can start working!`,
      'escrow',
      { bookingId: quote.bookingId, quoteId: quote.id },
      io
    );
    await notifyUser(
      quote.customerId,
      '💰 Payment Secured',
      `₦${tx.amount.toLocaleString()} is held in escrow. The artisan can now begin work.`,
      'escrow',
      { bookingId: quote.bookingId, quoteId: quote.id },
      io
    );
  }
}

/**
 * POST /api/escrow/job-done
 * Artisan marks job as done → awaits customer approval
 * Delegates to state machine for auto-release timer & work proof handling
 */
export async function markJobDone(req: Request, res: Response) {
  try {
    const { bookingId, artisanUserId, workProofPhotos } = req.body;

    if (!bookingId || !artisanUserId) {
      return res.status(400).json({ success: false, message: 'bookingId and artisanUserId required' });
    }

    const io = (req.app as any).io;
    const result = await transitionToJobDone(
      Number(bookingId),
      Number(artisanUserId),
      workProofPhotos || [],
      io
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error('Mark job done error:', error);
    return res.status(500).json({ success: false, message: 'Failed to mark job as done' });
  }
}

/**
 * POST /api/escrow/confirm-release
 * Customer confirms job completion → releases escrow funds to artisan
 * Delegates to state machine for commission, referral, milestone handling
 */
export async function confirmAndRelease(req: Request, res: Response) {
  try {
    const { bookingId, customerId, milestoneIndex } = req.body;

    if (!bookingId || !customerId) {
      return res.status(400).json({ success: false, message: 'bookingId and customerId required' });
    }

    const io = (req.app as any).io;
    const result = await releaseFunds(
      Number(bookingId),
      Number(customerId),
      io,
      milestoneIndex !== undefined ? Number(milestoneIndex) : undefined
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error('Confirm and release error:', error);
    return res.status(500).json({ success: false, message: 'Failed to release funds' });
  }
}

/**
 * POST /api/escrow/revision
 * Customer requests artisan to fix issues before releasing payment
 */
export async function handleRequestRevision(req: Request, res: Response) {
  try {
    const { bookingId, customerId, reason } = req.body;

    if (!bookingId || !customerId || !reason) {
      return res.status(400).json({ success: false, message: 'bookingId, customerId, and reason required' });
    }

    const io = (req.app as any).io;
    const result = await requestRevision(Number(bookingId), Number(customerId), reason, io);

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error('Request revision error:', error);
    return res.status(500).json({ success: false, message: 'Failed to request revision' });
  }
}

/**
 * POST /api/escrow/milestone-release
 * Customer releases a specific milestone payment
 */
export async function handleMilestoneRelease(req: Request, res: Response) {
  try {
    const { bookingId, customerId, milestoneIndex } = req.body;

    if (!bookingId || !customerId || milestoneIndex === undefined) {
      return res.status(400).json({ success: false, message: 'bookingId, customerId, and milestoneIndex required' });
    }

    const io = (req.app as any).io;
    const result = await releaseFunds(Number(bookingId), Number(customerId), io, Number(milestoneIndex));

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    console.error('Milestone release error:', error);
    return res.status(500).json({ success: false, message: 'Failed to release milestone' });
  }
}

/**
 * GET /api/escrow/quote-pdf/:quoteId
 * Download the generated PDF for a quote
 */
export async function downloadQuotePdf(req: Request, res: Response) {
  try {
    const quoteId = parseInt(Array.isArray(req.params.quoteId) ? req.params.quoteId[0] : req.params.quoteId);
    const quote = await collections.quotes().findOne({ id: quoteId });

    if (!quote) {
      return res.status(404).json({ success: false, message: 'Quote not found' });
    }
    if (!quote.pdfUrl) {
      return res.status(404).json({ success: false, message: 'PDF not yet generated for this quote' });
    }

    // Validate security hash when one is stored on the quote
    const { hash } = req.query;
    if (quote.securityHash && hash !== quote.securityHash) {
      return res.status(403).json({ success: false, message: 'Invalid security hash' });
    }

    const pdfPath = path.join(__dirname, '../../', quote.pdfUrl);
    if (!fs.existsSync(pdfPath)) {
      return res.status(404).json({ success: false, message: 'PDF file not found on disk' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="quote-QT-${String(quoteId).padStart(6, '0')}.pdf"`);
    return res.sendFile(pdfPath);
  } catch (error) {
    console.error('Download quote PDF error:', error);
    return res.status(500).json({ success: false, message: 'Failed to download PDF' });
  }
}

/**
 * GET /api/escrow/status/:bookingId
 * Get escrow status for a booking
 */
export async function getEscrowStatus(req: Request, res: Response) {
  try {
    const bookingId = parseInt(Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId);
    const booking = await collections.bookings().findOne({ id: bookingId });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const transactions = await collections.transactions()
      .find({ bookingId })
      .sort({ createdAt: -1 })
      .toArray();

    const quote = booking.quoteId
      ? await collections.quotes().findOne({ id: booking.quoteId })
      : null;

    return res.json({
      success: true,
      escrow: {
        bookingId,
        status: booking.status,
        escrowAmount: booking.escrowAmount,
        milestones: booking.milestones || null,
        currentMilestone: booking.currentMilestone,
        autoReleaseAt: booking.autoReleaseAt || null,
        quote: quote ? {
          laborCost: quote.laborCost,
          materialsCost: quote.materialsCost,
          totalCost: quote.totalCost,
          serviceFee: quote.serviceFee,
          grandTotal: quote.grandTotal,
          pdfUrl: quote.pdfUrl,
          securityHash: quote.securityHash,
        } : null,
        artisanPayout: booking.artisanPayout,
        platformCommission: booking.platformCommission,
        transactions,
      },
    });
  } catch (error) {
    console.error('Get escrow status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get escrow status' });
  }
}

/**
 * GET /api/escrow/dispute-summary/:bookingId
 * AI-generated dispute summary for admin review
 */
export async function getDisputeSummary(req: Request, res: Response) {
  try {
    const bookingId = parseInt(
      Array.isArray(req.params.bookingId) ? req.params.bookingId[0] : req.params.bookingId
    );
    const summary = await generateDisputeSummary(bookingId);
    return res.json({ success: true, summary });
  } catch (error) {
    console.error('Dispute summary error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate dispute summary' });
  }
}
