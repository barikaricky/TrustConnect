import express, { Application } from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { config } from './config';
import routes from './routes';
import { connectDB, collections } from './database/connection';
import { execSync } from 'child_process';
import os from 'os';
import { processAutoReleases } from './services/escrowStateMachine';

const app: Application = express();
const server = http.createServer(app);

// Socket.io setup for real-time chat
let io: any;
try {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: any) => {
    console.log('🔌 Socket connected:', socket.id);

    // User joins their personal room for notifications
    socket.on('join_user', (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`👤 User ${userId} joined personal room`);
    });

    // Join a conversation room
    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`💬 Socket joined conversation:${conversationId}`);
    });

    // Leave a conversation room
    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    // Real-time typing indicator
    socket.on('typing', (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      socket.to(`conversation:${data.conversationId}`).emit('user_typing', data);
    });

    // Message delivered confirmation
    socket.on('message_delivered', async (data: { messageId: number }) => {
      try {
        await collections.messages().updateOne(
          { id: data.messageId, status: 'sent' },
          { $set: { status: 'delivered' } }
        );
      } catch (e) { /* ignore */ }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected:', socket.id);
    });
  });

  // Attach io to app for use in controllers
  (app as any).io = io;
  console.log('✅ Socket.io initialized');
} catch (e) {
  console.log('⚠️ Socket.io not available, chat will use polling only');
}

// Get the real WiFi/LAN IP (not VirtualBox/VPN adapters)
function getLocalIP(): string {
  const interfaces = os.networkInterfaces();
  let fallbackIP = 'localhost';
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      if (iface.family === 'IPv4' && !iface.internal) {
        // Prefer WiFi/WLAN interfaces
        const lowerName = name.toLowerCase();
        if (lowerName.includes('wi-fi') || lowerName.includes('wifi') || lowerName.includes('wlan') || lowerName.includes('wireless')) {
          return iface.address;
        }
        // Save as fallback but skip VirtualBox/VPN adapters
        if (!lowerName.includes('virtualbox') && !lowerName.includes('vmware') && !lowerName.includes('hotspot') && !lowerName.includes('bluetooth')) {
          fallbackIP = iface.address;
        }
      }
    }
  }
  return fallbackIP;
}

const LOCAL_IP = getLocalIP();

// Try to open firewall port (requires admin, but won't crash if it fails)
function tryOpenFirewall(port: number) {
  try {
    // Check if rule already exists
    execSync(`netsh advfirewall firewall show rule name="TrustConnect Backend Port ${port}" >nul 2>&1`, { stdio: 'ignore' });
    console.log('✅ Firewall rule already exists for port', port);
  } catch {
    try {
      execSync(
        `netsh advfirewall firewall add rule name="TrustConnect Backend Port ${port}" dir=in action=allow protocol=TCP localport=${port}`,
        { stdio: 'ignore' }
      );
      console.log('✅ Firewall rule added for port', port);
    } catch {
      console.log('⚠️  Could not add firewall rule (need admin). Run VS Code as Admin once, or manually allow port', port);
    }
  }
}

// Middleware - Allow ALL origins during development
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-token'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files – __dirname is backend/src/, so ../uploads → backend/uploads/
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve admin panel
app.use('/admin', express.static(path.join(__dirname, '../public')));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', routes);

// Server info endpoint - mobile app can use this to verify connectivity
app.get('/api/server-info', (req, res) => {
  res.json({ 
    ip: LOCAL_IP,
    port: PORT,
    apiUrl: `http://${LOCAL_IP}:${PORT}/api`,
    status: 'running'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'TrustConnect API',
    version: '1.0.0',
    status: 'running',
    networkUrl: `http://${LOCAL_IP}:${PORT}`,
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
    },
  });
});

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

// Start server
const PORT: number = Number(config.port) || 3000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

async function startServer() {
  try {
    // Connect to MongoDB first
    await connectDB();
    
    // Try to open firewall on Windows
    if (process.platform === 'win32') {
      tryOpenFirewall(PORT);
    }
    
    // Write the current IP to a config file for the mobile app
    const fs = require('fs');
    const path = require('path');
    const mobileConfigPath = path.join(__dirname, '../../trustconnect-mobile/tunnel-url.json');
    try {
      fs.writeFileSync(mobileConfigPath, JSON.stringify({ 
        url: `http://${LOCAL_IP}:${PORT}`,
        ip: LOCAL_IP,
        port: PORT,
        timestamp: new Date().toISOString()
      }));
      console.log('✅ Mobile config written to tunnel-url.json');
    } catch (e) { /* ignore */ }
    
    // Then start the server on all network interfaces
    server.listen(PORT, HOST, () => {
      // Start auto-release cron (check every hour for 7-day-old job-done bookings)
      setInterval(async () => {
        try {
          const released = await processAutoReleases(io);
          if (released > 0) console.log(`⏱ Auto-released ${released} overdue booking(s)`);
        } catch (e) { console.error('Auto-release check error:', e); }
      }, 60 * 60 * 1000); // every hour

      console.log(`
╔═══════════════════════════════════════════════════════╗
║  🚀 TrustConnect Backend API                         ║
║                                                       ║
║  Status: Running                                      ║
║  Port: ${PORT}                                          ║
║  Local: http://localhost:${PORT}                         ║
║  Network: http://${LOCAL_IP}:${PORT}
║  Environment: ${config.nodeEnv}                       ║
║  Database: MongoDB ✅                                  ║
║                                                       ║
║  📱 Mobile App: Use http://${LOCAL_IP}:${PORT}/api
║     (Phone must be on same WiFi network)              ║
║                                                       ║
║  API Endpoints:                                       ║
║  └─ POST /api/auth/register                           ║
║  └─ POST /api/auth/login                              ║
║  └─ POST /api/auth/verify-otp                         ║
║  └─ GET  /api/auth/me                                 ║
║  └─ GET  /api/server-info                             ║
║  └─ GET  /api/health                                  ║
╚═══════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
