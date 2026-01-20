// LowDB connection for MVP (no PostgreSQL needed)
// Using lowdb 1.x for better CommonJS/TypeScript support
import low from 'lowdb';
import FileSync from 'lowdb/adapters/FileSync';
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

// Create data directory
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Default data structure
const defaultData: Database = {
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

// Initialize database
const file = path.join(dataDir, 'db.json');
const adapter = new FileSync<Database>(file);
const db = low(adapter);

// Initialize with default data
db.defaults(defaultData).write();
console.log('✅ Database initialized (LowDB)');

export { db, Database, User, OTPSession, ArtisanProfile, VerificationHistory };
export default db;
