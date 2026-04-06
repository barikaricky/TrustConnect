import axios from 'axios';
import { API_BASE_URL } from '../config/api';

/**
 * Dispute Service
 * Module 5: Dispute Management System
 */

// ─── Types ──────────────────────────────────────────────────

export interface DisputeSettlementOffer {
  offeredBy: number;
  offeredByRole: 'customer' | 'artisan';
  amount: number;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface Dispute {
  id: number;
  bookingId: number;
  quoteId?: number;
  transactionId?: number;
  raisedBy: number;
  raisedByRole: 'customer' | 'artisan';
  category: 'incomplete_work' | 'poor_quality' | 'overcharge' | 'no_show' | 'damage' | 'other';
  description: string;
  evidenceUrls: string[];
  artisanEvidenceUrls: string[];
  artisanResponse?: string;
  status: 'open' | 'negotiating' | 'escalated' | 'resolved';
  negotiationDeadline?: string;
  settlementOffers: DisputeSettlementOffer[];
  adminVerdict?: 'release_to_artisan' | 'refund_to_customer' | 'split_payment';
  adminVerdictNote?: string;
  splitPercentage?: number;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Enriched fields
  raiserName?: string;
  customerName?: string;
  artisanName?: string;
  booking?: {
    id: number;
    serviceType: string;
    escrowAmount: number;
    status: string;
  };
  quote?: {
    laborCost: number;
    materialsCost: number;
    totalCost: number;
    serviceFee: number;
    grandTotal: number;
  };
}

export type DisputeCategory = 'incomplete_work' | 'poor_quality' | 'overcharge' | 'no_show' | 'damage' | 'other';

export const DISPUTE_CATEGORIES: { value: DisputeCategory; label: string; icon: string }[] = [
  { value: 'incomplete_work', label: 'Incomplete Work', icon: 'construct-outline' },
  { value: 'poor_quality', label: 'Poor Quality', icon: 'thumbs-down-outline' },
  { value: 'overcharge', label: 'Overcharged', icon: 'cash-outline' },
  { value: 'no_show', label: 'No Show', icon: 'person-remove-outline' },
  { value: 'damage', label: 'Property Damage', icon: 'warning-outline' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

// ─── API ────────────────────────────────────────────────────

export const raiseDispute = async (data: {
  bookingId: number;
  raisedBy: number;
  raisedByRole: 'customer' | 'artisan';
  category: DisputeCategory;
  description: string;
  evidenceUrls: string[];
}): Promise<Dispute> => {
  const response = await axios.post(`${API_BASE_URL}/dispute/raise`, data, { timeout: 15000 });
  return response.data.dispute;
};

export const getDispute = async (disputeId: number): Promise<Dispute> => {
  const response = await axios.get(`${API_BASE_URL}/dispute/${disputeId}`, { timeout: 10000 });
  return response.data.dispute;
};

export const getDisputeByBooking = async (bookingId: number): Promise<Dispute | null> => {
  const response = await axios.get(`${API_BASE_URL}/dispute/booking/${bookingId}`, { timeout: 10000 });
  return response.data.dispute;
};

export const respondToDispute = async (
  disputeId: number,
  artisanUserId: number,
  response: string,
  evidenceUrls?: string[]
): Promise<void> => {
  await axios.post(`${API_BASE_URL}/dispute/${disputeId}/respond`, {
    artisanUserId, response, evidenceUrls,
  }, { timeout: 10000 });
};

export const makeSettlementOffer = async (
  disputeId: number,
  offeredBy: number,
  offeredByRole: 'customer' | 'artisan',
  amount: number,
  message?: string
): Promise<void> => {
  await axios.post(`${API_BASE_URL}/dispute/${disputeId}/offer`, {
    offeredBy, offeredByRole, amount, message,
  }, { timeout: 10000 });
};

export const acceptSettlementOffer = async (
  disputeId: number,
  acceptedBy: number,
  offerIndex: number
): Promise<void> => {
  await axios.post(`${API_BASE_URL}/dispute/${disputeId}/accept-offer`, {
    acceptedBy, offerIndex,
  }, { timeout: 10000 });
};

export const escalateDispute = async (disputeId: number): Promise<void> => {
  await axios.post(`${API_BASE_URL}/dispute/${disputeId}/escalate`, {}, { timeout: 10000 });
};

export const uploadDisputeEvidence = async (imageUri: string): Promise<string> => {
  const formData = new FormData();
  const filename = imageUri.split('/').pop() || 'evidence.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';
  formData.append('image', { uri: imageUri, name: filename, type } as any);
  const response = await axios.post(`${API_BASE_URL}/dispute/upload-evidence`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  });
  return response.data.imageUrl;
};

export default {
  raiseDispute, getDispute, getDisputeByBooking, respondToDispute,
  makeSettlementOffer, acceptSettlementOffer, escalateDispute, uploadDisputeEvidence,
};
