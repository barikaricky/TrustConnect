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
  role: 'customer' | 'artisan' | 'company';
  verified: boolean;
  password?: string; // Hashed password for authentication
  email?: string;
  avatar?: string; // Profile picture URL
  location?: string; // User location/address
  walletBalance?: number; // Wallet balance in Naira
  escrowAmount?: number; // Amount in escrow
  pushToken?: string; // Expo push notification token
  pushPlatform?: string;
  pushTokenUpdatedAt?: string;
  averageRating?: number;
  totalReviews?: number;
  trustBadge?: string;
  ratingUpdatedAt?: string;
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
  // Geospatial location data
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
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

export interface CompanyProfile {
  _id?: ObjectId;
  id: number;
  userId: number;
  companyName: string;
  rcNumber: string;                  // CAC Registration Number
  companyType: 'limited_liability' | 'sole_proprietorship' | 'partnership' | 'enterprise';
  industry: string;
  description?: string;
  yearEstablished?: number;
  numberOfEmployees?: string;
  serviceCategories: string[];
  tin?: string;                      // Tax Identification Number
  companyEmail?: string;
  companyPhone?: string;
  website?: string;
  address: string;
  state: string;
  lga: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  logoUrl?: string;
  cacDocumentUrl?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  verificationStatus: 'unsubmitted' | 'pending' | 'verified' | 'rejected' | 'suspended';
  adminNotes?: string;
  submittedAt?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  _id?: ObjectId;
  id: number;
  customerId: number;
  artisanId: number;        // artisanProfile id
  artisanUserId: number;    // user id of the artisan
  serviceType: string;      // e.g., 'Plumbing', 'Electrician'
  description: string;
  status: 'pending' | 'accepted' | 'rejected' | 'on-the-way' | 'in-progress' | 'completed' | 'cancelled' | 'quoted' | 'funded' | 'job-done' | 'disputed' | 'released';
  scheduledDate: string;
  scheduledTime: string;
  location: {
    address: string;
    latitude?: number;
    longitude?: number;
  };
  estimatedPrice?: number;
  finalPrice?: number;
  customerNotes?: string;
  artisanNotes?: string;
  rating?: number;
  review?: string;
  // Escrow fields
  quoteId?: number;
  escrowTransactionId?: number;
  escrowAmount?: number;           // Amount held in escrow (grandTotal)
  artisanPayout?: number;          // Amount artisan receives (totalCost - 10% commission)
  platformCommission?: number;     // 10% of totalCost
  jobDoneAt?: string;
  releasedAt?: string;
  workProofPhotos?: string[];  // 3 photos artisan uploads as proof of completion
  workProofSubmittedAt?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface Review {
  _id?: ObjectId;
  id: number;
  bookingId: number;
  customerId: number;
  artisanId: number;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ChatConversation {
  _id?: ObjectId;
  id: number;
  customerId: number;
  artisanUserId: number;
  bookingId?: number;
  lastMessage?: string;
  lastMessageAt?: string;
  customerUnread: number;
  artisanUnread: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  _id?: ObjectId;
  id: number;
  conversationId: number;
  senderId: number;
  senderRole: 'customer' | 'artisan' | 'system';
  type: 'text' | 'image' | 'system' | 'quote' | 'work_proof';
  content: string;
  imageUrl?: string;
  quoteId?: number; // Reference to quote when type === 'quote'
  workProofPhotos?: string[]; // 3 proof photos when type === 'work_proof'
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
}

// ─── Module 4: Digital Quotation & Escrow ─────────────────────────

export interface Quote {
  _id?: ObjectId;
  id: number;
  bookingId?: number;
  conversationId: number;
  artisanUserId: number;
  customerId: number;
  workDescription: string;
  laborCost: number;        // e.g. 5000
  materialsCost: number;    // e.g. 3500
  totalCost: number;        // laborCost + materialsCost = 8500
  serviceFee: number;       // 5% of totalCost = 425
  grandTotal: number;       // totalCost + serviceFee = 8925
  duration: string;         // e.g. "2 days"
  status: 'sent' | 'accepted' | 'rejected' | 'expired' | 'superseded';
  version: number;          // For quote revisions
  previousQuoteId?: number; // Links to previous version
  acceptedAt?: string;
  rejectedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  _id?: ObjectId;
  id: number;
  bookingId?: number;
  quoteId?: number;
  type: 'escrow_fund' | 'escrow_release' | 'commission' | 'withdrawal' | 'refund' | 'dispute_split' | 'wallet_fund';
  amount: number;
  fromUserId?: number;
  toUserId?: number;
  paymentRef?: string;       // Internal reference
  paystackRef?: string;      // Paystack transaction reference
  paystackAccessCode?: string;
  status: 'pending' | 'completed' | 'failed' | 'held_in_escrow' | 'released' | 'refunded';
  idempotencyKey?: string;   // Prevent double charges
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// ─── Module 5: Dispute Management ─────────────────────────────────

export interface Dispute {
  _id?: ObjectId;
  id: number;
  bookingId: number;
  quoteId?: number;
  transactionId?: number;
  raisedBy: number;          // userId who raised the dispute
  raisedByRole: 'customer' | 'artisan';
  category: 'incomplete_work' | 'poor_quality' | 'overcharge' | 'no_show' | 'damage' | 'other';
  description: string;
  evidenceUrls: string[];    // Min 2 photos required
  artisanEvidenceUrls: string[];
  artisanResponse?: string;
  status: 'open' | 'negotiating' | 'escalated' | 'resolved';
  negotiationDeadline?: string;  // 48hr from dispute raised
  // Settlement offers
  settlementOffers: DisputeSettlementOffer[];
  // Admin verdict
  adminVerdict?: 'release_to_artisan' | 'refund_to_customer' | 'split_payment';
  adminVerdictBy?: number;
  adminVerdictNote?: string;
  splitPercentage?: number;  // For split verdicts (artisan's share %)
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DisputeSettlementOffer {
  offeredBy: number;
  offeredByRole: 'customer' | 'artisan';
  amount: number;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected';
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
    await db.collection('bookings').createIndex({ customerId: 1 });
    await db.collection('bookings').createIndex({ artisanUserId: 1 });
    await db.collection('bookings').createIndex({ status: 1 });
    await db.collection('reviews').createIndex({ artisanId: 1 });
    await db.collection('conversations').createIndex({ customerId: 1, artisanUserId: 1 });
    await db.collection('messages').createIndex({ conversationId: 1, createdAt: 1 });
    
    // Module 4 & 5 indexes
    await db.collection('quotes').createIndex({ conversationId: 1 });
    await db.collection('quotes').createIndex({ artisanUserId: 1, customerId: 1 });
    await db.collection('transactions').createIndex({ bookingId: 1 });
    await db.collection('transactions').createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true });
    await db.collection('transactions').createIndex({ paystackRef: 1 }, { sparse: true });
    await db.collection('disputes').createIndex({ bookingId: 1 });
    await db.collection('disputes').createIndex({ status: 1 });
    await db.collection('companyProfiles').createIndex({ userId: 1 }, { unique: true });
    await db.collection('companyProfiles').createIndex({ rcNumber: 1 }, { sparse: true });
    
    // Initialize counters — sync them with actual collection max IDs
    const counters = db.collection<CounterDocument>('counters');
    const counterConfigs: { id: string; collection: string }[] = [
      { id: 'userId', collection: 'users' },
      { id: 'otpId', collection: 'otpSessions' },
      { id: 'artisanProfileId', collection: 'artisanProfiles' },
      { id: 'historyId', collection: 'verificationHistory' },
      { id: 'bookingId', collection: 'bookings' },
      { id: 'reviewId', collection: 'reviews' },
      { id: 'conversationId', collection: 'conversations' },
      { id: 'messageId', collection: 'messages' },
      { id: 'quoteId', collection: 'quotes' },
      { id: 'transactionId', collection: 'transactions' },
      { id: 'disputeId', collection: 'disputes' },
      { id: 'notificationId', collection: 'notifications' },
      { id: 'companyProfileId', collection: 'companyProfiles' },
    ];
    
    for (const cfg of counterConfigs) {
      // Find the current max id in the collection
      const maxDoc = await db.collection(cfg.collection)
        .find({}, { projection: { id: 1 } })
        .sort({ id: -1 })
        .limit(1)
        .toArray();
      const maxId = maxDoc.length > 0 && maxDoc[0].id ? maxDoc[0].id : 0;

      const current = await counters.findOne({ _id: cfg.id });
      const currentSeq = current?.seq || 0;

      // If counter is behind the actual max, fix it
      if (currentSeq <= maxId) {
        await counters.updateOne(
          { _id: cfg.id },
          { $set: { seq: maxId + 1 } },
          { upsert: true }
        );
        if (currentSeq < maxId) {
          console.log(`  🔧 Fixed counter '${cfg.id}': ${currentSeq} → ${maxId + 1}`);
        }
      } else if (!current) {
        await counters.insertOne({ _id: cfg.id, seq: 1 });
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
  companyProfiles: () => getDB().collection<CompanyProfile>('companyProfiles'),
  verificationHistory: () => getDB().collection<VerificationHistory>('verificationHistory'),
  bookings: () => getDB().collection<Booking>('bookings'),
  reviews: () => getDB().collection<Review>('reviews'),
  conversations: () => getDB().collection<ChatConversation>('conversations'),
  messages: () => getDB().collection<ChatMessage>('messages'),
  admins: () => getDB().collection('admins'),
  adminSessions: () => getDB().collection('adminSessions'),
  auditLogs: () => getDB().collection('auditLogs'),
  quotes: () => getDB().collection<Quote>('quotes'),
  transactions: () => getDB().collection<Transaction>('transactions'),
  disputes: () => getDB().collection<Dispute>('disputes'),
  notifications: () => getDB().collection('notifications'),
  favorites: () => getDB().collection('favorites'),
  db: () => getDB(),
};

// Close connection
export async function closeDB(): Promise<void> {
  if (client) {
    await client.close();
    console.log('MongoDB connection closed');
  }
}
