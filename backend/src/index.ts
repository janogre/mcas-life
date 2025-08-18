import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
// Import services (new microservices architecture)
import { authRoutes, authenticateToken } from './services/auth/index.js';

// Import legacy routes (to be migrated to services)
import { sighiRoutes } from './routes/sighi.js';
import { healthRoutes } from './routes/health.js';
import { diaryRoutes } from './routes/diary.js';
import { usersRoutes } from './routes/users.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));

// CORS configuration
const corsOptions = {
  origin: process.env['CORS_ORIGIN'] || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '900000'), // 15 minutes
  max: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '100'), // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env['NODE_ENV'] !== 'test') {
  app.use(morgan('combined'));
}

// Health check endpoint (before auth middleware)
app.use('/api/health', healthRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/sighi', sighiRoutes);
app.use('/api/diary', authenticateToken, diaryRoutes);
app.use('/api/users', authenticateToken, usersRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'MCAS-life API Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/api/health',
      '/api/auth',
      '/api/sighi',
      '/api/diary',
      '/api/users'
    ]
  });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
if (process.env['NODE_ENV'] !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 MCAS-life API server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env['NODE_ENV'] || 'development'}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📚 API documentation: http://localhost:${PORT}/api`);
    console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
  });
}

export { app };