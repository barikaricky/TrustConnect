import express, { Application } from 'express';
import cors from 'cors';
import { config } from './config';
import routes from './routes';
import './database/connection'; // Initialize database connection

const app: Application = express();

// Middleware
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║  🚀 TrustConnect Backend API             ║
║                                           ║
║  Status: Running                          ║
║  Port: ${PORT}                              ║
║  Environment: ${config.nodeEnv}           ║
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

export default app;
