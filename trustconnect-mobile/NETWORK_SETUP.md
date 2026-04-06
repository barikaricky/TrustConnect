# Network Connection Setup Guide

## Problem: "Failed to connect to localhost"

When running React Native apps, mobile devices/emulators can't access `localhost` directly because localhost refers to the device itself, not your computer.

## Solutions

### 1. Android Emulator (AVD)
Use the special IP address `10.0.2.2` which maps to your computer's localhost:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api
```

This is the **default configuration** in the `.env` file.

### 2. iOS Simulator
iOS Simulator can use `localhost` directly:

```env
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

### 3. Physical Device (Android or iOS)
You need your computer's actual IP address on your local network.

#### Windows:
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually WiFi or Ethernet).
Example: `192.168.1.100`

#### Mac:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

#### Linux:
```bash
ip addr show
```

Then update `.env`:
```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000/api
```

**Important:** 
- Your phone and computer must be on the **same WiFi network**
- Disable any firewalls blocking port 3000

## Verifying Setup

### 1. Start Backend Server
```bash
cd backend
npm run dev
```

You should see:
```
✅ Connected to MongoDB
🚀 TrustConnect Backend API
Status: Running
Port: 3000
```

### 2. Test Backend Connection
In your browser or Postman, test:
- Android Emulator: `http://10.0.2.2:3000/api/health`
- iOS Simulator: `http://localhost:3000/api/health`
- Physical Device: `http://YOUR_IP:3000/api/health`

You should get a success response.

### 3. Restart Expo App
After changing `.env`, you must:
```bash
# Stop the Expo server (Ctrl+C)
# Clear cache and restart
npx expo start -c
```

## Common Issues

### "Connection Refused"
- Backend server is not running
- Wrong IP address
- Firewall blocking the connection

**Fix:**
1. Start backend: `cd backend && npm run dev`
2. Verify it's running on port 3000
3. Check firewall settings

### "Network Error" on Physical Device
- Phone and computer on different networks
- Firewall blocking port 3000

**Fix:**
1. Connect both to same WiFi
2. Disable firewall temporarily for testing
3. Verify IP address is correct

### Changes Not Taking Effect
- `.env` changes require app restart
- Must clear cache with `-c` flag

**Fix:**
```bash
npx expo start -c
```

## Testing Registration Flow

Once connected, test with these values:
- **Phone:** 8012345678
- **OTP:** 123456 (mock OTP)
- **NIN/BVN:** Any 11 digits
- **Bank Account:** Any 10 digits

The backend will return mock data for testing.

## Production Setup

For production deployment, update `.env` to use your production API:
```env
EXPO_PUBLIC_API_URL=https://api.trustconnect.ng/api
```

## Need Help?

If you're still having connection issues:
1. Check backend logs for errors
2. Verify backend is accessible from browser
3. Try pinging your computer's IP from phone
4. Check if any VPN is interfering
