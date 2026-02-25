# TrustConnect - Complete Setup Guide

## ✅ BEST PRACTICE SOLUTION (Recommended)

Use **Expo Tunnel** - works from ANY network, no configuration needed!

### Step 1: Start Backend Server
```bash
cd backend
npm run dev
```
Backend runs on: `http://localhost:3000`

### Step 2: Start Expo with Tunnel Mode
```bash
cd trustconnect-mobile
npx expo start --tunnel
```

### Step 3: Scan QR Code on Your Phone
- Open Expo Go app on your phone
- Scan the QR code from the terminal
- ✅ It will work from ANY WiFi, 4G, 5G!

---

## 🔧 How Expo Tunnel Works

Expo creates a secure tunnel (like ngrok) automatically:
- Your phone → Expo servers → Your laptop
- No firewall issues
- No WiFi requirements
- Works everywhere!

---

## 📱 Alternative: Manual Network Configuration

If tunnel doesn't work, use local network:

### Step 1: Find Your Laptop's IP
```bash
ipconfig
```
Look for "IPv4 Address" (e.g., 192.168.x.x)

### Step 2: Update Mobile App
Edit `trustconnect-mobile/src/config/api.ts`:
```typescript
const LAPTOP_IP = '192.168.x.x'; // Your actual IP
```

### Step 3: Allow Firewall (Run as Admin)
Right-click `setup-firewall.ps1` → "Run with PowerShell as Administrator"

### Step 4: Connect
- Ensure phone and laptop on SAME WiFi
- Restart Expo: `npx expo start`
- Scan QR code

---

## 🚀 Quick Start (Copy-Paste These Commands)

### Terminal 1 - Backend:
```bash
cd "c:/Users/Hp/Documents/programing project/TrustConnect/backend"
npm run dev
```

### Terminal 2 - Mobile App with Tunnel:
```bash
cd "c:/Users/Hp/Documents/programing project/TrustConnect/trustconnect-mobile"
npx expo start --tunnel
```

### Terminal 3 - Admin Portal:
```bash
cd "c:/Users/Hp/Documents/programing project/TrustConnect/admin-portal"
npm run dev
```

---

## ✅ Verification

Test backend is running:
```bash
curl http://localhost:3000/api/auth/login
```

Should return: `{"success":false,"message":"..."}`

---

## 🐛 Troubleshooting

**"Network Error" on phone:**
- ✅ Use `--tunnel` mode (recommended)
- ✅ Check backend is running (`npm run dev`)
- ✅ Restart Expo if you changed config files

**"Tunnel connection failed":**
- Install @expo/ngrok: `npm install -g @expo/ngrok`
- Try again: `npx expo start --tunnel`

**"Cannot connect to backend":**
- Verify backend logs show: "Status: Running"
- Check port 3000 is not used by another app
- Try restarting backend

---

## 📖 Best Practices

1. **Always use `--tunnel` for mobile testing** (most reliable)
2. Keep backend running in separate terminal
3. Restart Expo after config changes
4. Use same Expo account on all devices
5. Check backend logs for API calls

---

## 🔗 URLs Reference

- **Backend API**: http://localhost:3000/api
- **Admin Portal**: http://localhost:5173
- **Expo Dev**: http://localhost:8081
- **Expo Tunnel**: https://xxx.expo.dev (generated automatically)

---

## Need Help?

1. Check backend terminal for errors
2. Check Expo terminal for connection status
3. Verify phone has internet connection
4. Try restarting both backend and Expo
