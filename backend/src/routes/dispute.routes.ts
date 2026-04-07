import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  raiseDispute,
  getDispute,
  getDisputeByBooking,
  respondToDispute,
  makeSettlementOffer,
  acceptSettlementOffer,
  escalateDispute,
  adminVerdict,
  getAllDisputes,
  uploadDisputeEvidence,
} from '../controllers/dispute.controller';

// Multer config for dispute evidence uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'disputes');
    const fs = require('fs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `evidence-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max (supports video evidence)
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|mp4|quicktime|webm/;
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype) return cb(null, true);
    cb(new Error('Only image (JPEG, PNG, WebP) and video (MP4, MOV, WebM) files are allowed'));
  },
});

const router = Router();

// Raise a new dispute
router.post('/raise', raiseDispute);

// Upload evidence (photo or video)
router.post('/upload-evidence', upload.single('evidence'), uploadDisputeEvidence);

// Get a specific dispute
router.get('/:disputeId', getDispute);

// Get dispute for a booking
router.get('/booking/:bookingId', getDisputeByBooking);

// Artisan responds to dispute
router.post('/:disputeId/respond', respondToDispute);

// Make a settlement offer
router.post('/:disputeId/offer', makeSettlementOffer);

// Accept a settlement offer
router.post('/:disputeId/accept-offer', acceptSettlementOffer);

// Escalate to admin
router.post('/:disputeId/escalate', escalateDispute);

// Admin verdict
router.post('/:disputeId/verdict', adminVerdict);

// Admin: Get all disputes
router.get('/admin/all', getAllDisputes);

export default router;
