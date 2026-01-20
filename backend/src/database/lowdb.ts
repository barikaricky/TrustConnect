import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'path';
import fs from 'fs';

// Database structure
interface User {
  id: number;
  phone: string;
  name: string;
  role: 'customer' | 'artisan';
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface OTPSession {
  id: number;
  phone: string;
  otp: string;
  expiresAt: string;
  createdAt: string;
}

interface ArtisanProfile {
  id: number;
  userId: number;
  skillCategory: string;
  primarySkill: string;
  profilePhotoUrl?: string;
  governmentIdUrl?: string;
  idType?: 'NIN' | 'BVN';
  verificationStatus: 'unsubmitted' | 'pending' | 'verified' | 'rejected' | 'suspended';
  adminNotes?: string;
  submittedAt?: string;
  verifiedAt?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface VerificationHistory {
  id: number;
  artisanProfileId: number;
  previousStatus: string;
  newStatus: string;
  changedBy: string;
  reason?: string;
  createdAt: string;
}

interface Database {
  users: User[];
  otpSessions: OTPSession[];
  artisanProfiles: ArtisanProfile[];
  verificationHistory: VerificationHistory[];
  _meta: {
    nextUserId: number;
    nextOtpId: number;
    nextArtisanProfileId: number;
    nextHistoryId: number;
  };
}

// Create data directory if doesn't exist
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const file = path.join(dataDir, 'db.json');
const adapter = new JSONFile<Database>(file);
const db = new Low(adapter, {
  users: [],
  otpSessions: [],
  artisanProfiles: [],
  verificationHistory: [],
  _meta: {
    nextUserId: 1,
    nextOtpId: 1,
    nextArtisanProfileId: 1,
    nextHistoryId: 1,
  },
});

// Initialize database
async function initDb() {
  await db.read();
  if (!db.data) {
    db.data = {
      users: [],
      otpSessions: [],
      artisanProfiles: [],
      verificationHistory: [],
      _meta: {
        nextUserId: 1,
        nextOtpId: 1,
        nextArtisanProfileId: 1,
        nextHistoryId: 1,
      },
    };
    await db.write();
  }
}

initDb();

export { db, User, OTPSession, ArtisanProfile, VerificationHistory };
export default db;
