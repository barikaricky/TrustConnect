import pool from './connection';

/**
 * Database setup script
 * Creates users table for TrustConnect MVP
 */

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Setting up TrustConnect database...');
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'artisan')),
        verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Users table created');
    
    // Create OTP sessions table (for temporary OTP storage)
    await client.query(`
      CREATE TABLE IF NOT EXISTS otp_sessions (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ OTP sessions table created');
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
      CREATE INDEX IF NOT EXISTS idx_otp_sessions_phone ON otp_sessions(phone);
    `);
    
    console.log('✅ Indexes created');
    console.log('🎉 Database setup complete!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default setupDatabase;
