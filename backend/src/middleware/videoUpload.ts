import multer from 'multer';
import path from 'path';
import fs from 'fs';

// ── Video upload directories ────────────────────────────────
const jobVideosDir = path.join(__dirname, '../../uploads/videos/jobs');
const proofVideosDir = path.join(__dirname, '../../uploads/videos/proofs');

if (!fs.existsSync(jobVideosDir)) fs.mkdirSync(jobVideosDir, { recursive: true });
if (!fs.existsSync(proofVideosDir)) fs.mkdirSync(proofVideosDir, { recursive: true });

// ── Allowed video MIME types ────────────────────────────────
const ALLOWED_VIDEO_TYPES = /mp4|quicktime|webm/;
const ALLOWED_VIDEO_EXTENSIONS = /mp4|mov|webm/;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB

// ── File filter (shared) ────────────────────────────────────
const videoFileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const extname = ALLOWED_VIDEO_EXTENSIONS.test(path.extname(file.originalname).toLowerCase());
  const mimetype = ALLOWED_VIDEO_TYPES.test(file.mimetype);
  if (mimetype && extname) return cb(null, true);
  cb(new Error('Only video files (MP4, MOV, WebM) are allowed'));
};

// ── Job video upload (client posts job description video) ───
const jobVideoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, jobVideosDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'job-' + uniqueSuffix + path.extname(file.originalname));
  },
});

export const jobVideoUpload = multer({
  storage: jobVideoStorage,
  limits: { fileSize: MAX_VIDEO_SIZE },
  fileFilter: videoFileFilter,
});

// ── Proof video upload (worker submits completion proof) ────
const proofVideoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, proofVideosDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
  },
});

export const proofVideoUpload = multer({
  storage: proofVideoStorage,
  limits: { fileSize: MAX_VIDEO_SIZE },
  fileFilter: videoFileFilter,
});
