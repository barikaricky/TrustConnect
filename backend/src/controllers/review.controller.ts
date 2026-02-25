import { Request, Response } from 'express';
import { getNextSequence, collections } from '../database/connection';
import { notifyUser } from './notification.controller';

/**
 * Review & Rating Controller
 * Enhanced engagement: ratings, reviews, trust scores, favorites
 */

export interface Review {
  id: number;
  bookingId: number;
  reviewerId: number;       // customer who wrote the review
  artisanUserId: number;    // artisan being reviewed
  rating: number;           // 1-5 stars
  comment: string;
  tags: string[];           // ['punctual', 'skilled', 'friendly', 'clean-work']
  response?: string;        // artisan's reply
  responseAt?: string;
  createdAt: string;
  updatedAt: string;
}

/* ── POST /api/reviews ────────────────────────────────────────
 * Customer submits a review after job completion
 * ───────────────────────────────────────────────────────────── */
export async function createReview(req: Request, res: Response) {
  try {
    const { bookingId, reviewerId, artisanUserId, rating, comment, tags } = req.body;

    if (!bookingId || !reviewerId || !artisanUserId || !rating) {
      return res.status(400).json({ success: false, message: 'bookingId, reviewerId, artisanUserId, and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be 1-5' });
    }

    // Check booking exists and is completed/released
    const booking = await collections.bookings().findOne({ id: Number(bookingId) });
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (!['released', 'completed', 'job-done'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Can only review completed jobs' });
    }

    // Check no duplicate review
    const existing = await collections.db().collection('reviews').findOne({
      bookingId: Number(bookingId),
      reviewerId: Number(reviewerId),
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this job' });
    }

    const id = await getNextSequence('reviewId');
    const now = new Date().toISOString();

    const review: Review = {
      id,
      bookingId: Number(bookingId),
      reviewerId: Number(reviewerId),
      artisanUserId: Number(artisanUserId),
      rating: Number(rating),
      comment: comment || '',
      tags: tags || [],
      createdAt: now,
      updatedAt: now,
    };

    await collections.db().collection('reviews').insertOne(review);

    // Update artisan's average rating
    await updateArtisanRating(Number(artisanUserId));

    // Notify the artisan
    const io = (req.app as any).io;
    const reviewer = await collections.users().findOne({ id: Number(reviewerId) });
    await notifyUser(
      Number(artisanUserId),
      '⭐ New Review',
      `${reviewer?.name || 'A customer'} rated you ${rating}/5 stars!`,
      'review',
      { bookingId, reviewId: id },
      io
    );

    return res.status(201).json({ success: true, review });
  } catch (error) {
    console.error('Create review error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create review' });
  }
}

/* ── POST /api/reviews/:reviewId/respond ─────────────────────
 * Artisan responds to a review
 * ───────────────────────────────────────────────────────────── */
export async function respondToReview(req: Request, res: Response) {
  try {
    const reviewId = parseInt(
      Array.isArray(req.params.reviewId) ? req.params.reviewId[0] : req.params.reviewId
    );
    const { artisanUserId, response } = req.body;

    if (!response || !artisanUserId) {
      return res.status(400).json({ success: false, message: 'response and artisanUserId required' });
    }

    const review = await collections.db().collection('reviews').findOne({ id: reviewId });
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    if (review.artisanUserId !== Number(artisanUserId)) {
      return res.status(403).json({ success: false, message: 'Only the reviewed artisan can respond' });
    }

    await collections.db().collection('reviews').updateOne(
      { id: reviewId },
      { $set: { response, responseAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }
    );

    return res.json({ success: true, message: 'Response added' });
  } catch (error) {
    console.error('Respond to review error:', error);
    return res.status(500).json({ success: false, message: 'Failed to respond' });
  }
}

/* ── GET /api/reviews/artisan/:artisanUserId ─────────────────
 * Get all reviews for an artisan
 * ───────────────────────────────────────────────────────────── */
export async function getArtisanReviews(req: Request, res: Response) {
  try {
    const artisanUserId = parseInt(
      Array.isArray(req.params.artisanUserId) ? req.params.artisanUserId[0] : req.params.artisanUserId
    );

    const reviews = await collections
      .db()
      .collection('reviews')
      .find({ artisanUserId })
      .sort({ createdAt: -1 })
      .toArray();

    // Enrich with reviewer names
    const enriched = await Promise.all(
      reviews.map(async (r: any) => {
        const reviewer = await collections.users().findOne({ id: r.reviewerId });
        return { ...r, reviewerName: reviewer?.name || 'Customer' };
      })
    );

    // Summary stats
    const total = reviews.length;
    const avgRating = total > 0
      ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / total
      : 0;

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((r: any) => { distribution[r.rating] = (distribution[r.rating] || 0) + 1; });

    return res.json({
      success: true,
      reviews: enriched,
      summary: {
        totalReviews: total,
        averageRating: Math.round(avgRating * 10) / 10,
        distribution,
      },
    });
  } catch (error) {
    console.error('Get artisan reviews error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get reviews' });
  }
}

/* ── Helper: Update artisan's average rating + trust badge ──── */
async function updateArtisanRating(artisanUserId: number) {
  const reviews = await collections
    .db()
    .collection('reviews')
    .find({ artisanUserId })
    .toArray();

  const total = reviews.length;
  const avg = total > 0
    ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / total
    : 0;

  // Trust badge tiers
  let trustBadge = 'new';
  if (total >= 50 && avg >= 4.5) trustBadge = 'platinum';
  else if (total >= 25 && avg >= 4.0) trustBadge = 'gold';
  else if (total >= 10 && avg >= 3.5) trustBadge = 'silver';
  else if (total >= 5) trustBadge = 'bronze';

  await collections.users().updateOne(
    { id: artisanUserId },
    {
      $set: {
        averageRating: Math.round(avg * 10) / 10,
        totalReviews: total,
        trustBadge,
        ratingUpdatedAt: new Date().toISOString(),
      },
    }
  );
}

/* ──────── Favorites / Saved Artisans ────────────────────────── */

/* ── POST /api/reviews/favorite ──────────────────────────────── */
export async function toggleFavorite(req: Request, res: Response) {
  try {
    const { customerId, artisanUserId } = req.body;

    if (!customerId || !artisanUserId) {
      return res.status(400).json({ success: false, message: 'customerId and artisanUserId required' });
    }

    const existing = await collections.db().collection('favorites').findOne({
      customerId: Number(customerId),
      artisanUserId: Number(artisanUserId),
    });

    if (existing) {
      await collections.db().collection('favorites').deleteOne({ _id: existing._id });
      return res.json({ success: true, favorited: false, message: 'Removed from favorites' });
    }

    await collections.db().collection('favorites').insertOne({
      customerId: Number(customerId),
      artisanUserId: Number(artisanUserId),
      createdAt: new Date().toISOString(),
    });

    return res.json({ success: true, favorited: true, message: 'Added to favorites' });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    return res.status(500).json({ success: false, message: 'Failed to toggle favorite' });
  }
}

/* ── GET /api/reviews/favorites/:customerId ──────────────────── */
export async function getFavorites(req: Request, res: Response) {
  try {
    const customerId = parseInt(
      Array.isArray(req.params.customerId) ? req.params.customerId[0] : req.params.customerId
    );

    const favs = await collections
      .db()
      .collection('favorites')
      .find({ customerId })
      .toArray();

    const artisanIds = favs.map((f: any) => f.artisanUserId);
    const artisans = artisanIds.length > 0
      ? await collections.users().find({ id: { $in: artisanIds } }).toArray()
      : [];

    const enriched = artisans.map((a: any) => ({
      id: a.id,
      fullName: a.name,
      primaryTrade: a.primaryTrade,
      averageRating: a.averageRating || 0,
      totalReviews: a.totalReviews || 0,
      trustBadge: a.trustBadge || 'new',
      workLocation: a.workLocation,
    }));

    return res.json({ success: true, favorites: enriched });
  } catch (error) {
    console.error('Get favorites error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get favorites' });
  }
}
