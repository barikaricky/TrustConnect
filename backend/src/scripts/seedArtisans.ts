import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'trustconnect';

const sampleArtisans = [
  {
    id: 1,
    userId: 10,
    fullName: 'Chinedu Okafor',
    phone: '08012345671',
    email: 'chinedu.okafor@email.com',
    idType: 'NIN',
    idNumber: '12345678901',
    governmentIdUrl: 'https://example.com/id/chinedu_nin.jpg',
    profilePhotoUrl: 'https://example.com/photos/chinedu.jpg',
    faceMatchScore: 92,
    ninVerified: true,
    primarySkill: 'Electrician',
    skillCategory: 'Electrical',
    yearsExperience: 5,
    workshopAddress: 'Shop 12, Alaba Market, Lagos',
    portfolioPhotos: [
      'https://example.com/portfolio/chinedu_1.jpg',
      'https://example.com/portfolio/chinedu_2.jpg'
    ],
    bankName: 'GTBank',
    accountNumber: '0123456789',
    accountName: 'Chinedu Okafor',
    location: 'Lekki Phase 1, Lagos',
    verificationStatus: 'pending',
    submittedAt: new Date('2025-01-15T10:30:00Z'),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 2,
    userId: 11,
    fullName: 'Blessing Adeyemi',
    phone: '08012345672',
    email: 'blessing.adeyemi@email.com',
    idType: 'BVN',
    idNumber: '22345678901',
    governmentIdUrl: 'https://example.com/id/blessing_bvn.jpg',
    profilePhotoUrl: 'https://example.com/photos/blessing.jpg',
    faceMatchScore: 88,
    ninVerified: true,
    primarySkill: 'Plumber',
    skillCategory: 'Plumbing',
    yearsExperience: 8,
    workshopAddress: 'Shop 5, Ikeja Market, Lagos',
    portfolioPhotos: [
      'https://example.com/portfolio/blessing_1.jpg',
      'https://example.com/portfolio/blessing_2.jpg',
      'https://example.com/portfolio/blessing_3.jpg'
    ],
    bankName: 'Access Bank',
    accountNumber: '9876543210',
    accountName: 'Blessing Adeyemi',
    location: 'Ikeja GRA, Lagos',
    verificationStatus: 'pending',
    submittedAt: new Date('2025-01-15T09:15:00Z'),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 3,
    userId: 12,
    fullName: 'Ibrahim Musa',
    phone: '08012345673',
    email: 'ibrahim.musa@email.com',
    idType: 'NIN',
    idNumber: '32345678901',
    governmentIdUrl: 'https://example.com/id/ibrahim_nin.jpg',
    profilePhotoUrl: 'https://example.com/photos/ibrahim.jpg',
    faceMatchScore: 95,
    ninVerified: true,
    primarySkill: 'Carpenter',
    skillCategory: 'Woodwork',
    yearsExperience: 12,
    workshopAddress: 'Plot 45, Wuse 2, Abuja',
    portfolioPhotos: [
      'https://example.com/portfolio/ibrahim_1.jpg',
      'https://example.com/portfolio/ibrahim_2.jpg',
      'https://example.com/portfolio/ibrahim_3.jpg',
      'https://example.com/portfolio/ibrahim_4.jpg'
    ],
    bankName: 'Zenith Bank',
    accountNumber: '5555666677',
    accountName: 'Ibrahim Musa',
    location: 'Gwarinpa, Abuja',
    verificationStatus: 'pending',
    submittedAt: new Date('2025-01-15T11:45:00Z'),
    unionId: 'NUCA-ABJ-2024-123',
    unionChairman: 'Alhaji Suleiman (+234 803 555 1234)',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 4,
    userId: 13,
    fullName: 'Ngozi Eze',
    phone: '08012345674',
    email: 'ngozi.eze@email.com',
    idType: 'NIN',
    idNumber: '42345678901',
    governmentIdUrl: 'https://example.com/id/ngozi_nin.jpg',
    profilePhotoUrl: 'https://example.com/photos/ngozi.jpg',
    faceMatchScore: 75,
    ninVerified: true,
    primarySkill: 'Painter',
    skillCategory: 'Painting',
    yearsExperience: 6,
    workshopAddress: 'Shop 8, Old Garage, Osogbo',
    portfolioPhotos: [
      'https://example.com/portfolio/ngozi_1.jpg'
    ],
    bankName: 'UBA',
    accountNumber: '1122334455',
    accountName: 'Ngozi P Eze', // Mismatch - middle initial
    location: 'Surulere, Lagos',
    verificationStatus: 'pending',
    submittedAt: new Date('2025-01-14T16:20:00Z'),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 5,
    userId: 14,
    fullName: 'Abubakar Hassan',
    phone: '08012345675',
    email: 'abubakar.hassan@email.com',
    idType: 'BVN',
    idNumber: '52345678901',
    governmentIdUrl: 'https://example.com/id/abubakar_bvn.jpg',
    profilePhotoUrl: 'https://example.com/photos/abubakar.jpg',
    faceMatchScore: 65, // Low match - will be flagged
    ninVerified: false,
    primarySkill: 'Welder',
    skillCategory: 'Metalwork',
    yearsExperience: 3,
    workshopAddress: 'Plot 12, Industrial Area, Kano',
    portfolioPhotos: [],
    bankName: 'First Bank',
    accountNumber: '8888999900',
    accountName: 'Hassan Abubakar', // Name mismatch
    location: 'VI, Lagos',
    verificationStatus: 'pending',
    submittedAt: new Date('2025-01-15T14:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 6,
    userId: 15,
    fullName: 'Funmi Oladele',
    phone: '08012345676',
    email: 'funmi.oladele@email.com',
    idType: 'NIN',
    idNumber: '62345678901',
    governmentIdUrl: 'https://example.com/id/funmi_nin.jpg',
    profilePhotoUrl: 'https://example.com/photos/funmi.jpg',
    faceMatchScore: 91,
    ninVerified: true,
    primarySkill: 'Tailor',
    skillCategory: 'Fashion',
    yearsExperience: 10,
    workshopAddress: 'Shop 20, Balogun Market, Lagos',
    portfolioPhotos: [
      'https://example.com/portfolio/funmi_1.jpg',
      'https://example.com/portfolio/funmi_2.jpg',
      'https://example.com/portfolio/funmi_3.jpg'
    ],
    bankName: 'GTBank',
    accountNumber: '4444333322',
    accountName: 'Funmi Oladele',
    location: 'Ikoyi, Lagos',
    verificationStatus: 'pending',
    submittedAt: new Date('2025-01-15T08:30:00Z'),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 7,
    userId: 16,
    fullName: 'Samuel Okonkwo',
    phone: '08012345677',
    email: 'samuel.okonkwo@email.com',
    idType: 'NIN',
    idNumber: '72345678901',
    governmentIdUrl: 'https://example.com/id/samuel_nin.jpg',
    profilePhotoUrl: 'https://example.com/photos/samuel.jpg',
    faceMatchScore: 89,
    ninVerified: true,
    primarySkill: 'Mason',
    skillCategory: 'Construction',
    yearsExperience: 15,
    workshopAddress: 'Site Office, Banana Island, Lagos',
    portfolioPhotos: [
      'https://example.com/portfolio/samuel_1.jpg',
      'https://example.com/portfolio/samuel_2.jpg'
    ],
    bankName: 'Zenith Bank',
    accountNumber: '7777888899',
    accountName: 'Samuel Okonkwo',
    location: 'Banana Island, Lagos',
    verificationStatus: 'pending',
    submittedAt: new Date('2025-01-15T12:00:00Z'),
    unionId: 'NUBIFPE-LAG-2023-567',
    unionChairman: 'Mr. Peter Nwosu (+234 805 444 5678)',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 8,
    userId: 17,
    fullName: 'Amina Bello',
    phone: '08012345678',
    email: 'amina.bello@email.com',
    idType: 'BVN',
    idNumber: '82345678901',
    governmentIdUrl: 'https://example.com/id/amina_bvn.jpg',
    profilePhotoUrl: 'https://example.com/photos/amina.jpg',
    faceMatchScore: 93,
    ninVerified: true,
    primarySkill: 'Hairdresser',
    skillCategory: 'Beauty',
    yearsExperience: 7,
    workshopAddress: 'Salon 3, Wuse Market, Abuja',
    portfolioPhotos: [
      'https://example.com/portfolio/amina_1.jpg',
      'https://example.com/portfolio/amina_2.jpg',
      'https://example.com/portfolio/amina_3.jpg'
    ],
    bankName: 'Access Bank',
    accountNumber: '3333222211',
    accountName: 'Amina Bello',
    location: 'Maitama, Abuja',
    verificationStatus: 'pending',
    submittedAt: new Date('2025-01-15T07:45:00Z'),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 9,
    userId: 18,
    fullName: 'Tunde Akintola',
    phone: '08012345679',
    email: 'tunde.akintola@email.com',
    idType: 'NIN',
    idNumber: '92345678901',
    verificationStatus: 'rejected',
    adminNotes: 'Fraudulent documents detected',
    rejectedAt: new Date('2025-01-10T15:30:00Z'),
    rejectedBy: 1,
    submittedAt: new Date('2025-01-08T10:00:00Z'),
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function seedArtisans() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const artisanCollection = db.collection('artisanProfiles');
    const usersCollection = db.collection('users');
    
    // Create corresponding user records for artisans
    const sampleUsers = sampleArtisans
      .filter(a => a.userId)
      .map(a => ({
        id: a.userId,
        name: a.fullName,
        phone: a.phone,
        email: a.email,
        role: 'artisan',
        verified: false,
        avatar: a.profilePhotoUrl,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    
    // Clear existing test data
    const artisanIds = sampleArtisans.map(a => a.id);
    const userIds = sampleUsers.map(u => u.id);
    
    await artisanCollection.deleteMany({ id: { $in: artisanIds } });
    await usersCollection.deleteMany({ id: { $in: userIds } });
    console.log('🗑️  Cleared existing test artisans and users');
    
    // Insert sample users
    await usersCollection.insertMany(sampleUsers);
    console.log(`✅ Inserted ${sampleUsers.length} sample users`);
    
    // Insert sample artisans
    await artisanCollection.insertMany(sampleArtisans);
    console.log(`✅ Inserted ${sampleArtisans.length} sample artisan profiles`);
    
    // Display summary
    const pending = await artisanCollection.countDocuments({ verificationStatus: 'pending' });
    const rejected = await artisanCollection.countDocuments({ verificationStatus: 'rejected' });
    
    console.log('\n📊 Summary:');
    console.log(`   Pending: ${pending}`);
    console.log(`   Rejected: ${rejected}`);
    console.log('\n✨ Sample artisans ready for verification testing!');
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await client.close();
  }
}

seedArtisans();
