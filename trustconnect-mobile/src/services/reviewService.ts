import axios from 'axios';
import { API_BASE_URL } from '../config/api';

// ─── Types ──────────────────────────────────────────────────────

export interface Review {
  id: number;
  bookingId: number;
  reviewerId: number;
  artisanUserId: number;
  rating: number;
  comment: string;
  tags: string[];
  response?: string;
  responseAt?: string;
  reviewerName?: string;
  reviewerAvatar?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewSummary {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<string, number>;
  trustBadge?: string;
}

export type ReviewTag =
  | 'punctual'
  | 'skilled'
  | 'friendly'
  | 'clean-work'
  | 'fair-price'
  | 'professional'
  | 'communicative'
  | 'reliable';

export const REVIEW_TAGS: { value: ReviewTag; label: string; icon: string }[] = [
  { value: 'skilled', label: 'Skilled', icon: 'construct-outline' },
  { value: 'punctual', label: 'Punctual', icon: 'time-outline' },
  { value: 'friendly', label: 'Friendly', icon: 'happy-outline' },
  { value: 'clean-work', label: 'Clean Work', icon: 'sparkles-outline' },
  { value: 'fair-price', label: 'Fair Price', icon: 'cash-outline' },
  { value: 'professional', label: 'Professional', icon: 'briefcase-outline' },
  { value: 'communicative', label: 'Communicative', icon: 'chatbubble-outline' },
  { value: 'reliable', label: 'Reliable', icon: 'shield-checkmark-outline' },
];

// ─── API ────────────────────────────────────────────────────────

/**
 * Submit a review for a completed job
 */
export const createReview = async (data: {
  bookingId: number;
  reviewerId: number;
  artisanUserId: number;
  rating: number;
  comment: string;
  tags: ReviewTag[];
}): Promise<Review> => {
  const response = await axios.post(`${API_BASE_URL}/reviews`, data, { timeout: 15000 });
  return response.data.review;
};

/**
 * Get all reviews for an artisan with summary stats
 */
export const getArtisanReviews = async (artisanUserId: number | string): Promise<ReviewSummary> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/reviews/artisan/${artisanUserId}`, { timeout: 10000 });
    return response.data;
  } catch (error: any) {
    console.error('Get artisan reviews error:', error.message);
    return { reviews: [], averageRating: 0, totalReviews: 0, ratingDistribution: {} };
  }
};

/**
 * Artisan responds to a review
 */
export const respondToReview = async (reviewId: number, artisanUserId: number, response: string): Promise<void> => {
  await axios.post(`${API_BASE_URL}/reviews/${reviewId}/respond`, {
    artisanUserId,
    response,
  }, { timeout: 10000 });
};

/**
 * Toggle favorite artisan
 */
export const toggleFavorite = async (customerId: number, artisanUserId: number): Promise<{ favorited: boolean }> => {
  const response = await axios.post(`${API_BASE_URL}/reviews/favorite`, {
    customerId,
    artisanUserId,
  }, { timeout: 10000 });
  return response.data;
};

/**
 * Get customer's favorite artisans
 */
export const getFavorites = async (customerId: number): Promise<any[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/reviews/favorites/${customerId}`, { timeout: 10000 });
    return response.data.favorites || [];
  } catch (error: any) {
    console.error('Get favorites error:', error.message);
    return [];
  }
};

export default {
  createReview,
  getArtisanReviews,
  respondToReview,
  toggleFavorite,
  getFavorites,
};
