import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { VerificationController } from '../controllers/verification.controller';

const router = Router();

// Create selfies upload directory
const selfiesDir = path.join(__dirname, '../../uploads/selfies');
if (!fs.existsSync(selfiesDir)) {
  fs.mkdirSync(selfiesDir, { recursive: true });
}

// Multer config for selfie uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, selfiesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'selfie-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG and PNG images are allowed'));
    }
  },
});

/**
 * POST /api/verification/verify-id
 * Body: { idType: 'NIN' | 'BVN', idNumber: string }
 */
router.post('/verify-id', VerificationController.verifyID);

/**
 * POST /api/verification/upload-selfie
 * Multipart form: field "selfie" (image file)
 */
router.post('/upload-selfie', upload.single('selfie'), VerificationController.uploadSelfie);

export default router;
