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

// === Customer bookings ===
router.get('/customer/:customerId', getCustomerBookings);

// === Artisan bookings ===
router.get('/artisan/:artisanId/bookings', getArtisanBookings);

export default router;
