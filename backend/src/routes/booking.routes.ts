import { Router } from 'express';
import {
  createBooking,
  getBookingById,
  getCustomerBookings,
  getArtisanBookings,
  updateBookingStatus,
  addReview,
  getArtisanReviews,
  getArtisanDetail,
  releaseFund,
  submitWorkProof,
} from '../controllers/booking.controller';

const router = Router();

// === Artisan Detail (public) ===
router.get('/artisan/:artisanId/detail', getArtisanDetail);
router.get('/artisan/:artisanId/reviews', getArtisanReviews);

// === Booking CRUD ===
router.post('/create', createBooking);
router.get('/:id', getBookingById);
router.put('/:id/status', updateBookingStatus);
router.post('/:id/review', addReview);
router.post('/:id/release-fund', releaseFund);
router.post('/:id/submit-work-proof', submitWorkProof);

// === Customer bookings ===
router.get('/customer/:customerId', getCustomerBookings);

// === Artisan bookings ===
router.get('/artisan/:artisanId/bookings', getArtisanBookings);

export default router;
