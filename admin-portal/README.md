# TrustConnect Admin Portal

Professional web-based admin console for TrustConnect platform management.

## Features

- 🔐 **Multi-Layer Security**
  - Email & password authentication
  - Two-Factor Authentication (2FA) with Google Authenticator
  - Device tracking and approval
  - IP address restrictions
  - Automatic session timeout (30 minutes)

- 👥 **Role-Based Access Control**
  - Super Administrator (Full Access)
  - Verification Officer (Artisan Verification)
  - Support Administrator (Customer Support)
  - Finance Administrator (Escrow & Payouts)

- 📋 **Audit Logging**
  - All actions logged with timestamp
  - IP address and device tracking
  - Exportable audit trail

- 🎨 **Professional Dark Theme**
  - Command center aesthetic
  - Optimized for desktop/laptop
  - Responsive design

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your backend API URL
```

3. Start development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

## Default Access

Contact system administrator to create your admin account.

## Security Features

- SSL/TLS encryption required
- Session-based authentication
- CSRF protection
- Rate limiting
- Automated logout on inactivity

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

---

**⚠️ AUTHORIZED PERSONNEL ONLY**  
All actions are logged and monitored.
