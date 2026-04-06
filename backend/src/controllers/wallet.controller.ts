import { Request, Response } from 'express';
import { getNextSequence, collections } from '../database/connection';
import axios from 'axios';
import { checkKycForWithdrawal } from '../services/escrowStateMachine';

/**
 * Wallet Controller
 * Module 4: Artisan Wallet & Withdrawal System
 * - View wallet balance
 * - Transaction history
 * - Withdrawal to bank account
 */

/**
 * GET /api/wallet/balance/:userId
 * Get wallet balance for a user
 */
export async function getWalletBalance(req: Request, res: Response) {
  try {
    const userId = parseInt(Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId);
    const user = await collections.users().findOne({ id: userId });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get pending escrow amount
    const pendingTransactions = await collections.transactions()
      .find({ fromUserId: userId, status: 'held_in_escrow' })
      .toArray();
    const pendingEscrow = pendingTransactions.reduce((sum, t) => sum + t.amount, 0);

    // Get total earnings (all completed releases to this user)
    const earnings = await collections.transactions()
      .find({ toUserId: userId, type: 'escrow_release', status: 'completed' })
      .toArray();
    const totalEarnings = earnings.reduce((sum, t) => sum + t.amount, 0);

    // Get total withdrawals
    const withdrawals = await collections.transactions()
      .find({ fromUserId: userId, type: 'withdrawal', status: 'completed' })
      .toArray();
    const totalWithdrawals = withdrawals.reduce((sum, t) => sum + t.amount, 0);

    return res.json({
      success: true,
      wallet: {
        balance: user.walletBalance || 0,
        escrowHeld: user.escrowAmount || 0,
        pendingEscrow,
        totalEarnings,
        totalWithdrawals,
        availableForWithdrawal: user.walletBalance || 0,
      },
    });
  } catch (error) {
    console.error('Get wallet balance error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get balance' });
  }
}

/**
 * GET /api/wallet/transactions/:userId
 * Get transaction history for a user
 */
export async function getTransactionHistory(req: Request, res: Response) {
  try {
    const userId = parseInt(Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId);
    const { type, page = '1', limit = '20' } = req.query;

    const filter: any = {
      $or: [{ fromUserId: userId }, { toUserId: userId }],
    };
    if (type) filter.type = type;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const transactions = await collections.transactions()
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string))
      .toArray();

    const total = await collections.transactions().countDocuments(filter);

    // Enrich with direction info
    const enriched = transactions.map(tx => ({
      ...tx,
      direction: tx.toUserId === userId ? 'credit' : 'debit',
      displayAmount: tx.toUserId === userId ? `+₦${tx.amount.toLocaleString()}` : `-₦${tx.amount.toLocaleString()}`,
    }));

    return res.json({
      success: true,
      transactions: enriched,
      total,
      page: parseInt(page as string),
      totalPages: Math.ceil(total / parseInt(limit as string)),
    });
  } catch (error) {
    console.error('Get transaction history error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get transactions' });
  }
}

/**
 * POST /api/wallet/withdraw
 * Request withdrawal to bank account
 */
export async function requestWithdrawal(req: Request, res: Response) {
  try {
    const { userId, amount, bankName, accountNumber, accountName } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ success: false, message: 'userId and amount are required' });
    }

    // KYC verification guard
    const kycCheck = await checkKycForWithdrawal(Number(userId));
    if (!kycCheck.allowed) {
      return res.status(403).json({ success: false, message: kycCheck.reason, code: 'KYC_REQUIRED' });
    }

    const user = await collections.users().findOne({ id: Number(userId) });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const withdrawAmount = Number(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid withdrawal amount' });
    }

    if (withdrawAmount > (user.walletBalance || 0)) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: ₦${(user.walletBalance || 0).toLocaleString()}`,
      });
    }

    // Minimum withdrawal
    if (withdrawAmount < 500) {
      return res.status(400).json({ success: false, message: 'Minimum withdrawal is ₦500' });
    }

    // Get artisan bank details if not provided
    let bank = bankName;
    let acctNum = accountNumber;
    let acctName = accountName;

    if (!bank || !acctNum) {
      const profile = await collections.artisanProfiles().findOne({ userId: Number(userId) });
      if (profile) {
        bank = bank || profile.bankName;
        acctNum = acctNum || profile.accountNumber;
        acctName = acctName || profile.accountName;
      }
    }

    if (!bank || !acctNum) {
      return res.status(400).json({
        success: false,
        message: 'Bank details required. Please update your profile with bank information.',
      });
    }

    const now = new Date().toISOString();
    const txId = await getNextSequence('transactionId');
    const paymentRef = `TC-WD-${userId}-${Date.now()}`;

    // Create withdrawal transaction
    await collections.transactions().insertOne({
      id: txId,
      type: 'withdrawal',
      amount: withdrawAmount,
      fromUserId: Number(userId),
      paymentRef,
      status: 'pending', // In production, this would go through Paystack Transfer API
      metadata: {
        bankName: bank,
        accountNumber: acctNum,
        accountName: acctName,
      },
      createdAt: now,
      updatedAt: now,
    });

    // Deduct from wallet immediately (pending settlement)
    await collections.users().updateOne(
      { id: Number(userId) },
      { $inc: { walletBalance: -withdrawAmount } }
    );

    // In dev mode, auto-complete the withdrawal
    const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || 'sk_test_xxxxx';
    if (PAYSTACK_SECRET === 'sk_test_xxxxx') {
      // DEV: Auto-complete
      await collections.transactions().updateOne(
        { id: txId },
        { $set: { status: 'completed' as const, updatedAt: new Date().toISOString() } }
      );
    }

    return res.json({
      success: true,
      message: 'Withdrawal request submitted',
      transaction: {
        id: txId,
        amount: withdrawAmount,
        bankName: bank,
        accountNumber: acctNum,
        accountName: acctName,
        status: PAYSTACK_SECRET === 'sk_test_xxxxx' ? 'completed' : 'pending',
        paymentRef,
      },
    });
  } catch (error) {
    console.error('Request withdrawal error:', error);
    return res.status(500).json({ success: false, message: 'Failed to process withdrawal' });
  }
}

/**
 * POST /api/wallet/fund
 * Initialize wallet top-up via Flutterwave
 */
export async function fundWallet(req: Request, res: Response) {
  try {
    const { userId, amount, email } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({ success: false, message: 'userId and amount are required' });
    }

    const fundAmount = Number(amount);
    if (isNaN(fundAmount) || fundAmount < 100) {
      return res.status(400).json({ success: false, message: 'Minimum top-up amount is ₦100' });
    }

    const user = await collections.users().findOne({ id: Number(userId) });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const now = new Date().toISOString();
    const txRef = `TC-FUND-${userId}-${Date.now()}`;
    const txId = await getNextSequence('transactionId');

    // Create pending transaction
    await collections.transactions().insertOne({
      id: txId,
      type: 'wallet_fund',
      amount: fundAmount,
      toUserId: Number(userId),
      paymentRef: txRef,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    });

    const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY || process.env.FLW_SECRET_KEY || '';
    const customerEmail = email || user.email || `user${userId}@trustconnect.ng`;

    // Check if we should use real Flutterwave or dev mode
    if (FLW_SECRET && !FLW_SECRET.includes('xxxxx')) {
      try {
        const flwRes = await axios.post(
          'https://api.flutterwave.com/v3/payments',
          {
            tx_ref: txRef,
            amount: fundAmount,
            currency: 'NGN',
            redirect_url: `trustconnect://wallet/verify?tx_ref=${txRef}`,
            customer: {
              email: customerEmail,
              name: user.name || 'TrustConnect User',
              phonenumber: user.phone || '',
            },
            customizations: {
              title: 'TrustConnect Wallet Top-Up',
              description: `Fund wallet with ₦${fundAmount.toLocaleString()}`,
              logo: 'https://trustconnect.ng/logo.png',
            },
            meta: { userId: Number(userId), txId, type: 'wallet_fund' },
          },
          {
            headers: {
              Authorization: `Bearer ${FLW_SECRET}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (flwRes.data.status === 'success') {
          return res.json({
            success: true,
            message: 'Payment link generated',
            paymentUrl: flwRes.data.data.link,
            txRef,
            txId,
          });
        } else {
          throw new Error(flwRes.data.message || 'Flutterwave error');
        }
      } catch (flwError: any) {
        console.error('Flutterwave fund error:', flwError?.response?.data || flwError.message);
        // Fall through to dev mode
      }
    }

    // DEV MODE: Auto-complete the funding
    await collections.transactions().updateOne(
      { id: txId },
      { $set: { status: 'completed', updatedAt: new Date().toISOString() } }
    );
    await collections.users().updateOne(
      { id: Number(userId) },
      { $inc: { walletBalance: fundAmount } }
    );

    console.log(`💰 DEV: Auto-funded wallet for user ${userId} with ₦${fundAmount}`);

    return res.json({
      success: true,
      message: 'Wallet funded successfully (dev mode)',
      devMode: true,
      txRef,
      txId,
      newBalance: (user.walletBalance || 0) + fundAmount,
    });
  } catch (error) {
    console.error('Fund wallet error:', error);
    return res.status(500).json({ success: false, message: 'Failed to initialize funding' });
  }
}

/**
 * POST /api/wallet/verify-funding
 * Verify wallet funding after Flutterwave redirect
 */
export async function verifyFunding(req: Request, res: Response) {
  try {
    const { tx_ref, transaction_id, status } = req.body;

    if (!tx_ref) {
      return res.status(400).json({ success: false, message: 'Transaction reference is required' });
    }

    // Find the pending transaction
    const txn = await collections.transactions().findOne({ paymentRef: tx_ref, type: 'wallet_fund' });
    if (!txn) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (txn.status === 'completed') {
      return res.json({ success: true, message: 'Transaction already completed', transaction: txn });
    }

    const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY || process.env.FLW_SECRET_KEY || '';

    // Verify with Flutterwave
    if (transaction_id && FLW_SECRET && !FLW_SECRET.includes('xxxxx')) {
      try {
        const verifyRes = await axios.get(
          `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
          { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
        );

        const data = verifyRes.data.data;
        if (
          data.status === 'successful' &&
          data.tx_ref === tx_ref &&
          data.amount >= txn.amount &&
          data.currency === 'NGN'
        ) {
          // Credit wallet
          await collections.transactions().updateOne(
            { id: txn.id },
            {
              $set: {
                status: 'completed',
                flutterwaveId: transaction_id,
                updatedAt: new Date().toISOString(),
              },
            }
          );
          await collections.users().updateOne(
            { id: txn.toUserId },
            { $inc: { walletBalance: txn.amount } }
          );

          const user = await collections.users().findOne({ id: txn.toUserId });

          return res.json({
            success: true,
            message: 'Wallet funded successfully',
            amount: txn.amount,
            newBalance: user?.walletBalance || txn.amount,
          });
        } else {
          await collections.transactions().updateOne(
            { id: txn.id },
            { $set: { status: 'failed', updatedAt: new Date().toISOString() } }
          );
          return res.status(400).json({ success: false, message: 'Payment verification failed' });
        }
      } catch (verifyError: any) {
        console.error('Flutterwave verify error:', verifyError?.response?.data || verifyError.message);
        return res.status(500).json({ success: false, message: 'Payment verification failed' });
      }
    }

    // If no Flutterwave verification possible, check if status was sent
    if (status === 'successful') {
      await collections.transactions().updateOne(
        { id: txn.id },
        { $set: { status: 'completed', updatedAt: new Date().toISOString() } }
      );
      await collections.users().updateOne(
        { id: txn.toUserId },
        { $inc: { walletBalance: txn.amount } }
      );

      return res.json({
        success: true,
        message: 'Wallet funded successfully',
        amount: txn.amount,
      });
    }

    return res.status(400).json({ success: false, message: 'Unable to verify payment' });
  } catch (error) {
    console.error('Verify funding error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify funding' });
  }
}
