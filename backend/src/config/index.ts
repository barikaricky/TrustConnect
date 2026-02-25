import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'trustconnect',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expiry: parseInt(process.env.JWT_EXPIRY || '604800'), // Default: 7 days in seconds
  },
  
  otp: {
    mockValue: process.env.OTP_MOCK_VALUE || '1234',
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES || '5'),
  },
  
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:8081',  // Mobile app
      'http://localhost:5173',  // Admin portal
    ],
  },
};
