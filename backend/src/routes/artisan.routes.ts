import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware } from '../middleware/auth.middleware';
import { ArtisanController } from '../controllers/artisan.controller';

const router = Router();

// Create uploads directory if doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG) and PDF files are allowed'));
    }
  }
});

// Artisan routes (requires authentication)
router.get('/profile', authMiddleware, ArtisanController.getMyProfile);
router.post('/onboarding', authMiddleware, ArtisanController.submitOnboarding);
router.post('/registration/complete', authMiddleware, ArtisanController.completeRegistration);
router.post('/upload', authMiddleware, upload.single('file'), ArtisanController.uploadFile);

// Public artisan routes (for customers)
router.get('/top-rated', ArtisanController.getTopRated);
router.get('/search', ArtisanController.searchArtisans);

// Admin routes (TODO: add admin middleware)
router.get('/admin/profiles', authMiddleware, ArtisanController.getAllProfiles);
router.get('/admin/profiles/:id', authMiddleware, ArtisanController.getProfileById);
router.patch('/admin/profiles/:id/status', authMiddleware, ArtisanController.updateVerificationStatus);

export default router;
