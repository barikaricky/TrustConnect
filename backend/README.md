# TrustConnect Backend API

Professional Node.js/Express backend for TrustConnect MVP with phone-based OTP authentication.

## Tech Stack

- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT + OTP (mocked for MVP)
- **Security**: bcrypt, CORS, environment variables

## Features

- ✅ Phone-based authentication
- ✅ OTP verification (mocked for MVP)
- ✅ JWT token generation
- ✅ Role-based user system (Customer/Artisan)
- ✅ Session persistence
- ✅ Secure password hashing
- ✅ Input validation

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
```

### Database Setup

```bash
# Run database setup script
npm run db:setup
```

This creates:
- `users` table (id, phone, name, role, verified, timestamps)
- `otp_sessions` table (id, phone, otp, expires_at, created_at)
- Indexes for performance

### Development

```bash
# Start development server with hot reload
npm run dev
```

### Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## API Endpoints

### Authentication

#### Register New User
```http
POST /api/auth/register
Content-Type: application/json

{
  "phone": "+2348012345678",
  "name": "John Doe",
  "role": "customer"
}
```

Response:
```json
{
  "success": true,
  "message": "Registration initiated. OTP sent to phone.",
  "data": {
    "userId": 1,
    "phone": "+2348012345678",
    "otpMock": "123456"
  }
}
```

#### Login Existing User
```http
POST /api/auth/login
Content-Type: application/json

{
  "phone": "+2348012345678"
}
```

Response:
```json
{
  "success": true,
  "message": "OTP sent to phone.",
  "data": {
    "userId": 1,
    "phone": "+2348012345678",
    "otpMock": "123456"
  }
}
```

#### Verify OTP
```http
POST /api/auth/verify-otp
Content-Type: application/json

{
  "phone": "+2348012345678",
  "otp": "123456"
}
```

Response:
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "phone": "+2348012345678",
      "name": "John Doe",
      "role": "customer",
      "verified": true
    }
  }
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "phone": "+2348012345678",
      "name": "John Doe",
      "role": "customer",
      "verified": true
    }
  }
}
```

## Security

- JWT tokens with 7-day expiry
- Phone numbers stored as unique identifiers
- OTP expires after 5 minutes
- CORS protection
- Environment variable configuration

## MVP Notice

⚠️ **OTP is MOCKED**: For MVP, all users receive OTP `123456`

This will be replaced with real SMS integration (Twilio/Termii) in production.

## Database Schema

### users
```sql
id          SERIAL PRIMARY KEY
phone       VARCHAR(20) UNIQUE NOT NULL
name        VARCHAR(255) NOT NULL
role        VARCHAR(20) CHECK (role IN ('customer', 'artisan'))
verified    BOOLEAN DEFAULT FALSE
created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### otp_sessions
```sql
id          SERIAL PRIMARY KEY
phone       VARCHAR(20) NOT NULL
otp         VARCHAR(6) NOT NULL
expires_at  TIMESTAMP NOT NULL
created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

## Environment Variables

See `.env.example` for all configuration options.

## License

Private - TrustConnect Team
