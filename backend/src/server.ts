import express, { Application } from 'express';
import cors from 'cors';
import { config } from './config';
import routes from './routes';
import { connectDB } from './database/connection';

const app: Application = express();

// Middleware
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Serve admin panel
app.use('/admin', express.static('public'));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'TrustConnect API',
    version: '1.0.0',
    status: 'running',
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
    
    // Then start the server on all network interfaces
    app.listen(PORT, HOST, () => {
      console.log(`
╔═══════════════════════════════════════════╗
║  🚀 TrustConnect Backend API             ║
║                                           ║
║  Status: Running                          ║
║  Port: ${PORT}                              ║
║  Host: ${HOST} (all interfaces)           ║
║  Local: http://localhost:${PORT}             ║
║  Network: http://10.80.246.216:${PORT}       ║
║  Environment: ${config.nodeEnv}           ║
║  Database: MongoDB                        ║
║                                           ║
║  API Endpoints:                           ║
║  └─ POST /api/auth/register               ║
║  └─ POST /api/auth/login                  ║
║  └─ POST /api/auth/verify-otp             ║
║  └─ GET  /api/auth/me                     ║
║                                           ║
║  ⚠️  OTP is MOCKED: ${config.otp.mockValue}              ║
╚═══════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
