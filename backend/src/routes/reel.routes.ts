import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { ReelController } from '../controllers/reel.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdminAuth } from '../middleware/admin/auth.middleware';

const router = Router();

// Setup multer for reel video uploads
const reelsDir = path.join(__dirname, '../../uploads/reels');
if (!fs.existsSync(reelsDir)) fs.mkdirSync(reelsDir, { recursive: true });

const reelStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, reelsDir),
  filename: (_req, file, cb) => {
    const uniqueName = `reel-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const ALLOWED_VIDEO_TYPES = /mp4|quicktime|webm|x-matroska/;
const ALLOWED_EXTENSIONS = /mp4|mov|webm|mkv/;
const MAX_SIZE = 100 * 1024 * 1024; // 100MB

const reelUpload = multer({
  storage: reelStorage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    const extOk = ALLOWED_EXTENSIONS.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = ALLOWED_VIDEO_TYPES.test(file.mimetype);
    if (extOk && mimeOk) return cb(null, true);
    cb(new Error('Only video files (MP4, MOV, WebM) are allowed'));
  },
});

// ═══ PUBLIC ROUTES ═══
router.get('/feed', ReelController.getFeed);
router.get('/:id', ReelController.getReel);

// ═══ AUTHENTICATED USER ROUTES ═══
router.post('/create', authMiddleware, reelUpload.single('video'), ReelController.createReel);
router.post('/:id/like', authMiddleware, ReelController.toggleLike);
router.post('/:id/comment', authMiddleware, ReelController.addComment);
router.delete('/:id', authMiddleware, ReelController.deleteReel);
router.get('/user/my-reels', authMiddleware, ReelController.getMyReels);

// ═══ ADMIN ROUTES ═══
router.get('/admin/all', requireAdminAuth, ReelController.adminGetAllReels);
router.get('/admin/stats', requireAdminAuth, ReelController.adminGetStats);
router.patch('/admin/:id/flag', requireAdminAuth, ReelController.adminToggleFlag);
router.delete('/admin/:id', requireAdminAuth, ReelController.adminRemoveReel);

// ═══ ADMIN JOB FEED ROUTES ═══
router.get('/admin/jobs', requireAdminAuth, ReelController.adminGetJobPosts);
router.get('/admin/jobs/:id', requireAdminAuth, ReelController.adminGetJobDetail);

export default router;
