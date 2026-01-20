import pool from './connection';

/**
 * Artisan Profile & Verification Schema Setup
 * Sprint 4: Artisan Onboarding & Verification Pipeline
 */

async function setupArtisanTables() {
  let client;
  
  try {
    console.log('🚀 Setting up Artisan verification tables...');
    
    client = await pool.connect();
    console.log('✅ Database connected');
    
    // Create artisan_profiles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS artisan_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        skill_category VARCHAR(100) NOT NULL,
        primary_skill VARCHAR(100) NOT NULL,
        profile_photo_url TEXT,
        government_id_url TEXT,
        id_type VARCHAR(20) CHECK (id_type IN ('NIN', 'BVN')),
        verification_status VARCHAR(20) NOT NULL DEFAULT 'unsubmitted' 
          CHECK (verification_status IN ('unsubmitted', 'pending', 'verified', 'rejected', 'suspended')),
        admin_notes TEXT,
        submitted_at TIMESTAMP,
        verified_at TIMESTAMP,
        rejected_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      );
    `);
    
    console.log('✅ Artisan profiles table created');
    
    // Create verification_history table (audit log)
    await client.query(`
      CREATE TABLE IF NOT EXISTS verification_history (
        id SERIAL PRIMARY KEY,
        artisan_profile_id INTEGER NOT NULL REFERENCES artisan_profiles(id) ON DELETE CASCADE,
        previous_status VARCHAR(20),
        new_status VARCHAR(20) NOT NULL,
        changed_by VARCHAR(100),
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Verification history table created');
    
    // Create indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_artisan_profiles_user_id ON artisan_profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_artisan_profiles_status ON artisan_profiles(verification_status);
      CREATE INDEX IF NOT EXISTS idx_verification_history_artisan_id ON verification_history(artisan_profile_id);
    `);
    
    console.log('✅ Indexes created');
    console.log('🎉 Artisan verification setup complete!');
    
  } catch (error) {
    console.error('❌ Artisan setup failed:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupArtisanTables()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default setupArtisanTables;
