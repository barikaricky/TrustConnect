import bcrypt from 'bcrypt';
import { connectDB, getNextSequence, collections } from './database/connection';
import { Admin } from './services/admin/admin.service';

/**
 * Seed initial Super Admin account
 * Run with: ts-node src/seedAdmin.ts
 */

async function seedSuperAdmin() {
  try {
    console.log('🌱 Seeding Super Admin account...');
    
    await connectDB();

    // Check if super admin already exists
    const existing = await collections.admins().findOne({ role: 'super-admin' });
    
    if (existing) {
      console.log('✅ Super Admin already exists');
      console.log(`   Email: ${existing.email}`);
      console.log(`   Staff ID: ${existing.staffId}`);
      process.exit(0);
    }

    // Create Super Admin
    const password = process.env.SUPER_ADMIN_PASSWORD || 'TrustConnect@2026!';
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const id = await getNextSequence('adminId');
    
    const superAdmin: Admin = {
      id,
      email: 'admin@trustconnect.com',
      staffId: 'SA-001',
      name: 'System Administrator',
      password: hashedPassword,
      role: 'super-admin',
      twoFactorEnabled: false,
      approvedDevices: [],
      approvedIPs: [],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await collections.admins().insertOne(superAdmin);

    console.log('\n✅ Super Admin created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Staff ID: ${superAdmin.staffId}`);
    console.log(`   Password: ${password}`);
    console.log('\n⚠️  IMPORTANT: Change this password after first login!');
    console.log('\n🔐 Next Steps:');
    console.log('   1. Login to the admin portal');
    console.log('   2. Setup 2FA (Two-Factor Authentication)');
    console.log('   3. Change your password');
    console.log('   4. Create additional admin accounts');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding Super Admin:', error);
    process.exit(1);
  }
}

seedSuperAdmin();
