import { Router } from 'express';
import {
  createReview,
  respondToReview,
  getArtisanReviews,
  toggleFavorite,
  getFavorites,
} from '../controllers/review.controller';

const router = Router();

// Submit a review
router.post('/', createReview);

// Artisan responds to a review
router.post('/:reviewId/respond', respondToReview);

// Get all reviews for an artisan
router.get('/artisan/:artisanUserId', getArtisanReviews);

// Toggle favorite artisan
router.post('/favorite', toggleFavorite);

// Get user's favorite artisans
router.get('/favorites/:customerId', getFavorites);

export default router;
