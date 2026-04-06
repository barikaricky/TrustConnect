import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

export interface ArtisanDetail {
  id: string;
  profileId: number;
  userId: number;
  name: string;
  phone: string;
  email: string;
  avatar: string | null;
  trade: string;
  category: string;
  yearsExperience: number;
  workshopAddress: string;
  portfolioPhotos: string[];
  verified: boolean;
  verificationStatus: string;
  rating: number;
  reviewCount: number;
  completedJobs: number;
  startingPrice: number;
  reviews: ArtisanReview[];
}

export interface ArtisanReview {
  id: number;
  rating: number;
  comment: string;
  customerName: string;
  customerAvatar: string | null;
  createdAt: string;
}

export interface BookingRequest {
  customerId: number | string;
  artisanId: string;
  serviceType: string;
  description: string;
  scheduledDate: string;
  scheduledTime: string;
  location: {
    address: string;
    latitude?: number;
    longitude?: number;
  };
  estimatedPrice?: number;
  customerNotes?: string;
}

export interface BookingResponse {
  id: number;
  customerId: number;
  artisanId: number;
  artisanUserId: number;
  serviceType: string;
  description: string;
  status: string;
  scheduledDate: string;
  scheduledTime: string;
  location: { address: string; latitude?: number; longitude?: number };
  estimatedPrice?: number;
  escrowAmount?: number;
  escrowHeld?: number;
  escrowTransactionId?: number;
  artisanName: string;
  artisanPhone: string;
  artisanTrade: string;
  artisanPhoto: string | null;
  artisanLocation?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get detailed artisan profile for the hire screen
 */
export const getArtisanDetail = async (artisanId: string): Promise<ArtisanDetail> => {
  try {
    console.log('🔍 Fetching artisan detail:', artisanId);
    const response = await axios.get(`${API_BASE_URL}/booking/artisan/${artisanId}/detail`, {
      timeout: 10000,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching artisan detail:', error.message);
    throw error;
  }
};

/**
 * Get reviews for an artisan
 */
export const getArtisanReviews = async (artisanId: string): Promise<{
  reviews: ArtisanReview[];
  averageRating: number;
  totalReviews: number;
}> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/booking/artisan/${artisanId}/reviews`, {
      timeout: 10000,
    });
    return response.data;
  } catch (error: any) {
    console.error('Error fetching reviews:', error.message);
    return { reviews: [], averageRating: 0, totalReviews: 0 };
  }
};

/**
 * Create a new booking (hire an artisan)
 */
export const createBooking = async (booking: BookingRequest): Promise<BookingResponse> => {
  try {
    console.log('📝 Creating booking...');
    const response = await axios.post(`${API_BASE_URL}/booking/create`, booking, {
      timeout: 15000,
    });
    console.log('✅ Booking created:', response.data.booking?.id);
    return response.data.booking;
  } catch (error: any) {
    console.error('Error creating booking:', error.message);
    throw error;
  }
};

/**
 * Get all bookings for a customer
 */
export const getCustomerBookings = async (
  customerId: string | number,
  status?: string
): Promise<BookingResponse[]> => {
  try {
    const params = status ? { status } : {};
    const response = await axios.get(`${API_BASE_URL}/booking/customer/${customerId}`, {
      params,
      timeout: 10000,
    });
    return response.data.bookings || [];
  } catch (error: any) {
    console.error('Error fetching customer bookings:', error.message);
    return [];
  }
};

/**
 * Update booking status (accept, reject, complete, cancel)
 */
export const updateBookingStatus = async (
  bookingId: number,
  status: string,
  notes?: string
): Promise<BookingResponse> => {
  try {
    const response = await axios.put(`${API_BASE_URL}/booking/${bookingId}/status`, {
      status,
      artisanNotes: notes,
    }, { timeout: 10000 });
    return response.data.booking;
  } catch (error: any) {
    console.error('Error updating booking:', error.message);
    throw error;
  }
};

/**
 * Add a review after booking completion
 */
export const addBookingReview = async (
  bookingId: number,
  rating: number,
  comment: string
): Promise<void> => {
  try {
    await axios.post(`${API_BASE_URL}/booking/${bookingId}/review`, {
      rating,
      comment,
    }, { timeout: 10000 });
  } catch (error: any) {
    console.error('Error adding review:', error.message);
    throw error;
  }
};

// ─────────────────────────────────────────────
//  QUOTE FLOW
// ─────────────────────────────────────────────

export interface QuoteResponse {
  id: number;
  bookingId?: number;
  conversationId: number;
  artisanUserId: number;
  customerId: number;
  workDescription: string;
  laborCost: number;
  materialsCost: number;
  totalCost: number;
  serviceFee: number;
  grandTotal: number;
  duration: string;
  status: 'sent' | 'accepted' | 'rejected' | 'superseded';
  version: number;
  createdAt: string;
}

/**
 * Artisan submits a quotation for a booking they have accepted.
 * Booking status must be 'accepted', 'negotiating', or 'confirmed'.
 * Returns the new Quote record.
 */
export const submitBookingQuote = async (
  bookingId: number,
  artisanUserId: number | string,
  amount: number,
  workDetails: string,
  estimatedDays?: string
): Promise<QuoteResponse> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/booking/${bookingId}/submit-quote`,
      { artisanUserId, amount, workDetails, estimatedDays },
      { timeout: 15000 }
    );
    return response.data.quote;
  } catch (error: any) {
    console.error('Error submitting quote:', error.message);
    throw error;
  }
};

/**
 * Get the current active (sent) quote for a booking.
 * Returns null if no active quote exists.
 */
export const getBookingQuote = async (bookingId: number): Promise<QuoteResponse | null> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/booking/${bookingId}/quote`, {
      timeout: 10000,
    });
    return response.data.quote ?? null;
  } catch (error: any) {
    if (error.response?.status === 404) return null;
    console.error('Error fetching booking quote:', error.message);
    return null;
  }
};

/**
 * Customer accepts a quote.
 * Server checks wallet balance, locks funds in escrow, sets booking → 'funded'.
 * On 'INSUFFICIENT_BALANCE' error the server returns { code: 'INSUFFICIENT_BALANCE', required, available, shortfall }.
 */
export const acceptBookingQuote = async (
  quoteId: number,
  customerId: number | string
): Promise<{ escrowLocked: boolean; bookingStatus: string }> => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/quote/${quoteId}/accept`,
      { customerId },
      { timeout: 15000 }
    );
    return response.data;
  } catch (error: any) {
    console.error('Error accepting quote:', error.message);
    throw error;
  }
};

/**
 * Customer rejects a quote. Booking is automatically cancelled.
 */
export const rejectBookingQuote = async (
  quoteId: number,
  customerId: number | string,
  reason?: string
): Promise<void> => {
  try {
    await axios.post(
      `${API_BASE_URL}/quote/${quoteId}/reject`,
      { customerId, reason },
      { timeout: 10000 }
    );
  } catch (error: any) {
    console.error('Error rejecting quote:', error.message);
    throw error;
  }
};

/**
 * Customer requests a revision / negotiation.
 * Sets booking → 'negotiating' so the artisan must submit a new quote.
 */
export const negotiateBookingQuote = async (
  quoteId: number,
  customerId: number | string,
  reason?: string
): Promise<void> => {
  try {
    await axios.post(
      `${API_BASE_URL}/quote/${quoteId}/negotiate`,
      { customerId, reason },
      { timeout: 10000 }
    );
  } catch (error: any) {
    console.error('Error requesting negotiation:', error.message);
    throw error;
  }
};

/**
 * Cancel a booking (customer side, before work starts).
 */
export const cancelBooking = async (bookingId: number, customerId: number | string): Promise<void> => {
  try {
    await axios.put(
      `${API_BASE_URL}/booking/${bookingId}/status`,
      { status: 'cancelled', customerId },
      { timeout: 10000 }
    );
  } catch (error: any) {
    console.error('Error cancelling booking:', error.message);
    throw error;
  }
};

// ─────────────────────────────────────────────
//  ESCROW
// ─────────────────────────────────────────────

/**
 * Customer releases escrowed funds to artisan after confirming work is done
 */
export const releaseFund = async (
  bookingId: number,
  customerId: number | string
): Promise<{
  escrowAmount: number;
  commission: number;
  commissionRate: string;
  artisanPayout: number;
}> => {
  try {
    const token = await AsyncStorage.getItem('@trustconnect_token');
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await axios.post(`${API_BASE_URL}/booking/${bookingId}/release-fund`, {
      customerId,
    }, { headers, timeout: 15000 });
    return response.data.payout;
  } catch (error: any) {
    console.error('Error releasing fund:', error.message);
    throw error;
  }
};

export default {
  getArtisanDetail,
  getArtisanReviews,
  createBooking,
  getCustomerBookings,
  updateBookingStatus,
  addBookingReview,
  releaseFund,
  // Quote flow
  submitBookingQuote,
  getBookingQuote,
  acceptBookingQuote,
  rejectBookingQuote,
  negotiateBookingQuote,
  cancelBooking,
};
