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
  submitBookingQuote,
  getBookingQuote,
  uploadJobVideo,
  uploadProofVideo,
  getAvailableJobs,
  getClientDetails,
  streamVideo,
} from '../controllers/booking.controller';
import { jobVideoUpload, proofVideoUpload } from '../middleware/videoUpload';

const router = Router();

// === Video endpoints ===
router.post('/upload-job-video', jobVideoUpload.single('video'), uploadJobVideo);
router.get('/video/:filename', streamVideo);
router.get('/available-jobs', getAvailableJobs);

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
router.post('/:id/upload-proof-video', proofVideoUpload.single('video'), uploadProofVideo);
router.get('/:id/client-details', getClientDetails);

// === Quote flow ===
router.post('/:id/submit-quote', submitBookingQuote);
router.get('/:id/quote', getBookingQuote);

// === Customer bookings ===
router.get('/customer/:customerId', getCustomerBookings);

// === Artisan bookings ===
router.get('/artisan/:artisanId/bookings', getArtisanBookings);

export default router;
