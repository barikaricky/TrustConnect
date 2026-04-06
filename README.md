<p align="center">
  <img src="assets/banner.svg" alt="TrustConnect" width="100%"/>
</p>

<p align="center">
  <b>A full-stack platform connecting customers with verified artisans — secured by escrow, protected by trust.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=flat-square&color=2c7be5" alt="Version"/>
  <img src="https://img.shields.io/badge/license-ISC-green?style=flat-square&color=27ae60" alt="License"/>
  <img src="https://img.shields.io/badge/platform-iOS%20%7C%20Android%20%7C%20Web-lightgrey?style=flat-square" alt="Platform"/>
  <img src="https://img.shields.io/badge/backend-Node.js%20%2B%20TypeScript-informational?style=flat-square&color=1a7abf" alt="Backend"/>
  <img src="https://img.shields.io/badge/mobile-React%20Native%20%2F%20Expo-blueviolet?style=flat-square&color=6c3ddb" alt="Mobile"/>
  <img src="https://img.shields.io/badge/database-MongoDB-success?style=flat-square&color=13aa52" alt="Database"/>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Backend](#backend-setup)
  - [Mobile App](#mobile-app-setup)
  - [Admin Portal](#admin-portal-setup)
- [API Reference](#api-reference)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**TrustConnect** is a peer-to-peer service marketplace that bridges the gap between customers seeking skilled artisans and professionals looking for legitimate work. The platform enforces accountability through an **escrow payment system**, real-time **dispute resolution**, biometric-backed **NIN verification**, and live **Socket.io chat** — all wrapped in a polished React Native mobile experience and a React-based admin console.

> Built for the Nigerian market with international scalability in mind.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        TrustConnect                         │
│                                                             │
│  ┌───────────────┐   ┌───────────────┐   ┌──────────────┐  │
│  │  Mobile App   │   │  Admin Portal │   │   Backend    │  │
│  │ React Native  │──▶│    React/TS   │──▶│ Express + TS │  │
│  │     Expo      │   │     Vite      │   │  Socket.io   │  │
│  └───────────────┘   └───────────────┘   └──────┬───────┘  │
│                                                  │          │
│                              ┌───────────────────┘          │
│                              ▼                              │
│                     ┌────────────────┐                      │
│                     │    MongoDB     │                      │
│                     │   (Atlas /     │                      │
│                     │   self-hosted) │                      │
│                     └────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Features

### Customer
- Phone-based OTP registration & login
- Browse and search verified artisans by trade & location
- Book services, track job status in real-time
- **Escrow Wallet** — funds held securely until job completion
- In-app messaging with artisans (Socket.io)
- Rate, review, and dispute resolution
- Saved addresses, payment methods, and transaction history
- Referral programme, emergency contacts

### Artisan
- Professional profile with portfolio uploads
- NIN / government ID verification
- Job request management & quote system
- Earnings dashboard and wallet withdrawal
- AI-generated voice announcements for new jobs
- KYC document upload

### Admin Portal
- Secure JWT-authenticated admin console
- User management (customers, artisans, companies)
- Transaction & escrow monitoring
- Dispute moderation and resolution
- Real-time notification dashboard
- Audit logs and reporting

### Platform
- Real-time notifications via Socket.io
- QR code shareable artisan profiles
- Profanity filter on all user-generated content
- PDF contract generation
- Ngrok / tunnel support for local mobile development

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native, Expo SDK 54, Expo Router |
| Admin UI | React 18, TypeScript, Vite, React Router |
| Backend | Node.js, Express 5, TypeScript |
| Database | MongoDB (via official driver) |
| Real-time | Socket.io 4 |
| Auth | JWT, bcrypt, OTP (phone-based) |
| Payments | Internal escrow state machine |
| File Storage | Multer (local), categorized upload dirs |
| Voice | Microsoft Edge TTS (`msedge-tts`) |
| Tunneling | Ngrok, Localtunnel |
| PDF | pdf-lib |
| QR | qrcode |

---

## Project Structure

```
TrustConnect/
├── assets/                   # Shared assets (SVG banner, images)
├── backend/                  # Node.js / Express API server
│   ├── src/
│   │   ├── config/           # App configuration
│   │   ├── controllers/      # Route controllers (auth, booking, escrow…)
│   │   ├── database/         # MongoDB connection & collections
│   │   ├── middleware/        # Auth, upload, rate-limit middleware
│   │   ├── routes/           # Express route definitions (18 route files)
│   │   ├── services/         # Business logic layer
│   │   ├── types/            # Shared TypeScript types
│   │   └── utils/            # Helpers (profanity filter, image URL…)
│   └── uploads/              # Uploaded files (gitignored)
├── trustconnect-mobile/      # Expo React Native app
│   ├── app/                  # File-based routing (40+ screens)
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── config/           # Theme, design tokens
│   │   ├── services/         # API client services
│   │   └── utils/            # Utility helpers
│   └── assets/               # App icons and images
├── admin-portal/             # React + Vite admin console
│   ├── src/
│   │   ├── components/       # Layout, loaders
│   │   ├── context/          # AuthContext
│   │   ├── pages/            # Dashboard, users, disputes…
│   │   └── services/         # Admin API calls
└── starter-for-react-native/ # Clean Expo template (reference)
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** 9+ or **yarn**
- **MongoDB** instance (local or Atlas)
- **Expo CLI** (`npm install -g expo-cli`) for mobile
- **Android Studio** or **Xcode** for mobile emulators

---

### Backend Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env — set MONGO_URI, JWT_SECRET, PORT

# 4. Start development server (hot-reload)
npm run dev

# 5. (Optional) Seed admin account
npm run seed-admin
```

The server starts at `http://localhost:3000` by default.

---

### Mobile App Setup

```bash
# 1. Navigate to mobile app
cd trustconnect-mobile

# 2. Install dependencies
npm install

# 3. Configure API URL
# Edit src/config/ or tunnel-url.json to point to your backend

# 4. Start Expo dev server
npx expo start

# 5. Open on device
#   Press 'a' for Android emulator
#   Press 'i' for iOS simulator
#   Scan QR code with Expo Go for physical device
```

> **Physical device?** Run the backend with Ngrok: see `start-ngrok.bat` or `NETWORK_SETUP.md` for tunnel setup.

---

### Admin Portal Setup

```bash
# 1. Navigate to admin portal
cd admin-portal

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Build for production
npm run build
```

Admin portal runs at `http://localhost:5173` by default.

---

## API Reference

All API routes are prefixed with `/api`.

| Module | Base Path | Description |
|---|---|---|
| Auth | `/api/auth` | Register, login, OTP, logout |
| Customer | `/api/customer` | Profile, preferences |
| Artisan | `/api/artisan` | Profile, portfolio, KYC |
| Booking | `/api/booking` | Create, accept, complete jobs |
| Escrow | `/api/escrow` | Fund, release, refund payments |
| Wallet | `/api/wallet` | Balance, withdrawal, top-up |
| Chat | `/api/chat` | Conversations, messages |
| Review | `/api/review` | Ratings and reviews |
| Dispute | `/api/dispute` | File and resolve disputes |
| Notification | `/api/notification` | Push notifications |
| Payment | `/api/payment` | Payment methods |
| Quote | `/api/quote` | Artisan quotes |
| Referral | `/api/referral` | Referral codes |
| Verification | `/api/verification` | NIN / ID verification |
| Settings | `/api/settings` | User settings |
| Company | `/api/company` | Company accounts |
| Admin | `/api/admin` | Admin management |

---

## Environment Variables

### Backend (`.env`)

```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/trustconnect

# Authentication
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d

# OTP (mocked for MVP)
OTP_EXPIRY_MINUTES=10

# File Uploads
UPLOAD_BASE_URL=http://localhost:3000
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Commit with conventional commits: `git commit -m "feat: add your feature"`
4. Push the branch: `git push origin feat/your-feature`
5. Open a Pull Request

Please ensure code passes TypeScript checks and follows the existing code style before submitting a PR.

---

## License

This project is licensed under the **ISC License**. See [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with dedication by the <strong>TrustConnect Team</strong>
  <br/>
  <sub>Connecting trust · Securing work · Empowering artisans</sub>
</p>
