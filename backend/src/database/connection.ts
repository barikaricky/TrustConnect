// MongoDB connection for production-ready backend
import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

// MongoDB connection URL - use environment variable or default to local
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'trustconnect';

let db: Db;
let client: MongoClient;

// Database structure interfaces
export interface User {
  _id?: ObjectId;
  id: number;
  phone: string;
  name: string;
  role: 'customer' | 'artisan';
  verified: boolean;
  password?: string; // Hashed password for authentication
  email?: string;
  avatar?: string; // Profile picture URL
  location?: string; // User location/address
  walletBalance?: number; // Wallet balance in Naira
  escrowAmount?: number; // Amount in escrow
  createdAt: string;
  updatedAt: string;
}

export interface OTPSession {
  _id?: ObjectId;
  id: number;
  phone: string;
  otp: string;
  expiresAt: string;
  createdAt: string;
}

export interface ArtisanProfile {
  _id?: ObjectId;
  id: number;
  userId: number;
  skillCategory: string;
  primarySkill: string;
  profilePhotoUrl?: string;
  governmentIdUrl?: string;
  idType?: 'NIN' | 'BVN';
  idNumber?: string;
  fullName?: string;
  yearsExperience?: number;
  workshopAddress?: string;
  portfolioPhotos?: string[];
  accountNumber?: string;
  bankName?: string;
  accountName?: string;
  trustAccepted?: boolean;
  verificationStatus: 'unsubmitted' | 'pending' | 'verified' | 'rejected' | 'suspended';
  adminNotes?: string;
  submittedAt?: string;
  verifiedAt?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationHistory {
  _id?: ObjectId;
  id: number;
  artisanProfileId: number;
  previousStatus: string;
  newStatus: string;
  changedBy: string;
  reason?: string;
  createdAt: string;
}

export interface CounterDocument {
  _id: string;
  seq: number;
}

// Connect to MongoDB
export async function connectDB(): Promise<Db> {
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    
    // Create indexes for better performance
    await db.collection('users').createIndex({ phone: 1 }, { unique: true });
    await db.collection('users').createIndex({ id: 1 }, { unique: true });
    await db.collection('artisanProfiles').createIndex({ userId: 1 }, { unique: true });
    await db.collection('otpSessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    
    // Initialize counters if they don't exist
    const counters = db.collection<CounterDocument>('counters');
    const counterIds = ['userId', 'otpId', 'artisanProfileId', 'historyId'];
    
    for (const counterId of counterIds) {
      const exists = await counters.findOne({ _id: counterId });
      if (!exists) {
        await counters.insertOne({ _id: counterId, seq: 1 });
      }
    }
    
    console.log('✅ Connected to MongoDB');
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

// Get next sequence number for auto-increment IDs
export async function getNextSequence(name: string): Promise<number> {
  const result = await db.collection<CounterDocument>('counters').findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  return result!.seq;
}

// Get database instance
export function getDB(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return db;
}

// Collections helper
export const collections = {
  users: () => getDB().collection<User>('users'),
  otpSessions: () => getDB().collection<OTPSession>('otpSessions'),
  artisanProfiles: () => getDB().collection<ArtisanProfile>('artisanProfiles'),
  verificationHistory: () => getDB().collection<VerificationHistory>('verificationHistory'),
};

// Close connection
export async function closeDB(): Promise<void> {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}
