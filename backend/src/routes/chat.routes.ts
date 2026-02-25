import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getOrCreateConversation,
  getConversations,
  sendMessage,
  getMessages,
  markAsRead,
  uploadChatImage,
} from '../controllers/chat.controller';

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/chat');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer config for chat images (max 500KB compression target)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'chat-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max (client compresses to <500KB)
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'));
  },
});

// Conversation routes
router.post('/conversation', getOrCreateConversation);
router.get('/conversations/:userId', getConversations);

// Message routes
router.post('/send', sendMessage);
router.get('/messages/:conversationId', getMessages);
router.post('/messages/:conversationId/read', markAsRead);

// Image upload
router.post('/upload-image', upload.single('image'), uploadChatImage);

export default router;
