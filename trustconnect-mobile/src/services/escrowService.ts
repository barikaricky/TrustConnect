import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

/**
 * Quote & Escrow Service
 * Module 4: Digital Quotation & Escrow System
 */

// Helper: read stored JWT and return Authorization header
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  try {
    const token = await AsyncStorage.getItem('@trustconnect_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

// ─── Types ──────────────────────────────────────────────────

export interface Milestone {
  index: number;
  label: string;
  percent: number;
  amount: number;
  status: 'pending' | 'funded' | 'released' | 'disputed';
  releasedAt?: string;
}

export interface Quote {
  id: number;
  conversationId: number;
  artisanUserId: number;
  customerId: number;
  bookingId?: number;
  workDescription: string;
  laborCost: number;
  materialsCost: number;
  totalCost: number;
  serviceFee: number;
  grandTotal: number;
  duration: string;
  status: 'sent' | 'accepted' | 'rejected' | 'expired' | 'superseded' | 'negotiating';
  version: number;
  previousQuoteId?: number;
  milestones?: Milestone[];
  pdfUrl?: string;
  securityHash?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
  artisanName?: string;
  customerName?: string;
}

export interface Transaction {
  id: number;
  bookingId?: number;
  quoteId?: number;
  type: 'escrow_fund' | 'escrow_release' | 'commission' | 'withdrawal' | 'refund' | 'dispute_split';
  amount: number;
  fromUserId?: number;
  toUserId?: number;
  paymentRef?: string;
  paystackRef?: string;
  status: 'pending' | 'completed' | 'failed' | 'held_in_escrow' | 'released';
  idempotencyKey?: string;
  direction?: 'credit' | 'debit';
  displayAmount?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface WalletInfo {
  balance: number;
  escrowHeld: number;
  pendingEscrow: number;
  totalEarnings: number;
  totalWithdrawals: number;
  availableForWithdrawal: number;
}

export interface EscrowStatus {
  bookingId: number;
  status: string;
  escrowAmount: number;
  milestones?: Milestone[];
  currentMilestone?: number;
  autoReleaseAt?: string;
  quote: {
    laborCost: number;
    materialsCost: number;
    totalCost: number;
    serviceFee: number;
    grandTotal: number;
    pdfUrl?: string;
    securityHash?: string;
  } | null;
  artisanPayout?: number;
  platformCommission?: number;
  transactions: Transaction[];
}

export interface PaymentInit {
  authorization_url: string;
  access_code: string;
  reference: string;
  payment_link?: string;
  tx_ref?: string;
}

/** @deprecated Use PaymentInit */
export type PaystackInit = PaymentInit;

// ─── Quote API ──────────────────────────────────────────────

export const createQuote = async (data: {
  conversationId: number;
  artisanUserId: number;
  customerId: number;
  bookingId?: number;
  workDescription: string;
  laborCost: number;
  materialsCost: number;
  duration: string;
  milestones?: { label: string; percent: number }[];
}): Promise<{ quote: Quote; chatMessage: any }> => {
  const response = await axios.post(`${API_BASE_URL}/quote/create`, data, { timeout: 15000 });
  return response.data;
};

export const getQuote = async (quoteId: number): Promise<Quote> => {
  const response = await axios.get(`${API_BASE_URL}/quote/${quoteId}`, { timeout: 10000 });
  return response.data.quote;
};

export const getConversationQuote = async (conversationId: number): Promise<Quote | null> => {
  const response = await axios.get(`${API_BASE_URL}/quote/conversation/${conversationId}`, { timeout: 10000 });
  return response.data.quote;
};

export const acceptQuote = async (quoteId: number, customerId: number): Promise<Quote> => {
  const response = await axios.post(`${API_BASE_URL}/quote/${quoteId}/accept`, { customerId }, { timeout: 10000 });
  return response.data.quote;
};

export const rejectQuote = async (quoteId: number, customerId: number, reason?: string): Promise<void> => {
  await axios.post(`${API_BASE_URL}/quote/${quoteId}/reject`, { customerId, reason }, { timeout: 10000 });
};

export const requestNegotiation = async (
  quoteId: number,
  customerId: number,
  reason?: string
): Promise<{ bookingStatus: string }> => {
  const response = await axios.post(
    `${API_BASE_URL}/quote/${quoteId}/negotiate`,
    { customerId, reason },
    { timeout: 10000 }
  );
  return response.data;
};

// ─── Escrow API ─────────────────────────────────────────────

export const fundEscrow = async (
  quoteId: number,
  customerId: number,
  idempotencyKey?: string
): Promise<{ transaction: { id: number; paymentRef: string; amount: number }; paystack: PaymentInit; flutterwave?: { payment_link: string; tx_ref: string } }> => {
  const headers = await getAuthHeaders();
  const response = await axios.post(`${API_BASE_URL}/escrow/fund`, {
    quoteId,
    customerId,
    idempotencyKey: idempotencyKey || `idem-${quoteId}-${Date.now()}`,
  }, { headers, timeout: 15000 });
  return response.data;
};

export const verifyPayment = async (paymentRef: string): Promise<Transaction> => {
  const headers = await getAuthHeaders();
  const response = await axios.post(`${API_BASE_URL}/escrow/verify`, { paymentRef }, { headers, timeout: 10000 });
  return response.data.transaction;
};

export const markJobDone = async (bookingId: number, artisanUserId: number, workProofPhotos?: string[]): Promise<void> => {
  const headers = await getAuthHeaders();
  await axios.post(`${API_BASE_URL}/escrow/job-done`, { bookingId, artisanUserId, workProofPhotos: workProofPhotos || [] }, { headers, timeout: 10000 });
};

export const confirmAndRelease = async (bookingId: number, customerId: number): Promise<{
  totalCost: number;
  serviceFee: number;
  grandTotal: number;
  commission: number;
  commissionRate: string;
  artisanPayout: number;
}> => {
  const headers = await getAuthHeaders();
  const response = await axios.post(`${API_BASE_URL}/escrow/confirm-release`, { bookingId, customerId }, { headers, timeout: 15000 });
  return response.data.payout;
};

export const getEscrowStatus = async (bookingId: number): Promise<EscrowStatus> => {
  const headers = await getAuthHeaders();
  const response = await axios.get(`${API_BASE_URL}/escrow/status/${bookingId}`, { headers, timeout: 10000 });
  return response.data.escrow;
};

// ─── Wallet API ─────────────────────────────────────────────

export const getWalletBalance = async (userId: number): Promise<WalletInfo> => {
  const headers = await getAuthHeaders();
  const response = await axios.get(`${API_BASE_URL}/wallet/balance/${userId}`, { headers, timeout: 10000 });
  return response.data.wallet;
};

export const getTransactionHistory = async (
  userId: number,
  type?: string,
  page: number = 1,
  limit: number = 20
): Promise<{ transactions: Transaction[]; total: number; page: number; totalPages: number }> => {
  const params: any = { page, limit };
  if (type) params.type = type;
  const headers = await getAuthHeaders();
  const response = await axios.get(`${API_BASE_URL}/wallet/transactions/${userId}`, { headers, params, timeout: 10000 });
  return response.data;
};

export const requestWithdrawal = async (
  userId: number,
  amount: number,
  bankName?: string,
  accountNumber?: string,
  accountName?: string
): Promise<{ id: number; amount: number; status: string; paymentRef: string }> => {
  const headers = await getAuthHeaders();
  const response = await axios.post(`${API_BASE_URL}/wallet/withdraw`, {
    userId, amount, bankName, accountNumber, accountName,
  }, { headers, timeout: 15000 });
  return response.data.transaction;
};

// ─── Wallet Fund (Top-Up) API ───────────────────────────────

export const fundWallet = async (
  userId: number,
  amount: number,
  email: string
): Promise<{
  paymentUrl?: string;
  txRef: string;
  transactionId: number;
  devMode?: boolean;
  newBalance?: number;
}> => {
  const headers = await getAuthHeaders();
  const response = await axios.post(`${API_BASE_URL}/wallet/fund`, {
    userId, amount, email,
  }, { headers, timeout: 15000 });
  return response.data;
};

export const verifyWalletFunding = async (
  txRef: string,
  transactionId: string
): Promise<{ transaction: any; newBalance: number }> => {
  const headers = await getAuthHeaders();
  const response = await axios.post(`${API_BASE_URL}/wallet/verify-funding`, {
    tx_ref: txRef,
    transaction_id: transactionId,
    status: 'successful',
  }, { headers, timeout: 15000 });
  return response.data;
};

// ─── Dev Mode Helper ────────────────────────────────────────

export const devSimulatePayment = async (paymentRef: string): Promise<Transaction> => {
  const response = await axios.get(`${API_BASE_URL}/escrow/dev-pay?ref=${paymentRef}`, { timeout: 10000 });
  return response.data.transaction;
};

// ─── Escrow Revision & Milestone API ────────────────────────

export const requestRevision = async (
  bookingId: number,
  customerId: number,
  reason: string
): Promise<{ success: boolean; message: string }> => {
  const headers = await getAuthHeaders();
  const response = await axios.post(
    `${API_BASE_URL}/escrow/revision`,
    { bookingId, customerId, reason },
    { headers, timeout: 10000 }
  );
  return response.data;
};

export const releaseMilestone = async (
  bookingId: number,
  customerId: number,
  milestoneIndex: number
): Promise<{ success: boolean; message: string; payout?: any }> => {
  const headers = await getAuthHeaders();
  const response = await axios.post(
    `${API_BASE_URL}/escrow/milestone-release`,
    { bookingId, customerId, milestoneIndex },
    { headers, timeout: 10000 }
  );
  return response.data;
};

export const getQuotePdfUrl = (quoteId: number, securityHash?: string): string => {
  const base = `${API_BASE_URL}/escrow/quote-pdf/${quoteId}`;
  return securityHash ? `${base}?hash=${encodeURIComponent(securityHash)}` : base;
};

export default {
  createQuote, getQuote, getConversationQuote, acceptQuote, rejectQuote,
  fundEscrow, verifyPayment, markJobDone, confirmAndRelease, getEscrowStatus,
  getWalletBalance, getTransactionHistory, requestWithdrawal, fundWallet, verifyWalletFunding, devSimulatePayment,
  requestRevision, releaseMilestone, getQuotePdfUrl,
};
