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
import { foodRoutes } from './services/food/foodRoutes.js';
import { analyticsRoutes } from './services/analytics/analyticsRoutes.js';
import { recipeRoutes } from './services/recipes/recipeRoutes.js';

// Import legacy routes (to be migrated to services)
import { sighiRoutes } from './routes/sighi.js';
import { healthRoutes } from './routes/health.js';
import { symptomRoutes } from './routes/symptoms.js';
import symptomTemplateRoutes from './routes/symptomTemplates.js';
import { diaryRoutes } from './routes/diary.js';
import { usersRoutes } from './routes/users.js';
import { weatherRoutes } from './routes/weather.js';
import { airthingsRoutesV2 } from './routes/airthingsV2.js';
import { settingsRoutes } from './routes/settings.js';
import medicationRoutes from './routes/medications.js';
import activityRoutes from './routes/activities.js';
import illnessRoutes from './routes/illness.js';
import mealRoutes from './routes/meals.js';
import { preferencesRoutes } from './routes/preferences.js';

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
  origin: process.env['CORS_ORIGIN']?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005', 'http://localhost:3006', 'http://localhost:3007'],
  credentials: true,
  optionsSuccessStatus: 200,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  preflightContinue: false
};
app.use(cors(corsOptions));

// Debug middleware for CORS
if (process.env['NODE_ENV'] === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - Origin: ${req.get('Origin')}`);
    next();
  });
}

// Rate limiting - Very generous limits for development to avoid issues with bulk operations
const limiter = rateLimit({
  windowMs: parseInt(process.env['RATE_LIMIT_WINDOW_MS'] || '60000'), // 1 minute (faster reset)
  max: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS'] || '1000'), // 1000 requests per minute for development
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for certain paths in development
  skip: (req) => {
    if (process.env['NODE_ENV'] === 'development') {
      // Skip rate limiting for health checks, auth refresh, and food detail fetching
      return req.path === '/api/health'
        || req.path === '/api/auth/refresh'
        || req.path.startsWith('/api/foods/') && /\/api\/foods\/\d+$/.test(req.path); // Skip /api/foods/:id
    }
    return false;
  }
});
app.use('/api/', limiter);

// Compression middleware (temporarily disabled due to issues with Chrome)
// app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env['NODE_ENV'] !== 'test') {
  app.use(morgan('combined'));
}

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/foods', foodRoutes); // Food management and approved foods
app.use('/api/analytics', analyticsRoutes); // AI-driven correlation analysis and trigger detection
app.use('/api/recipes', authenticateToken, recipeRoutes); // Recipe search and management with Spoonacular API
app.use('/api/sighi', foodRoutes); // Legacy compatibility for existing SIGHI endpoints
app.use('/api/health', healthRoutes); // Enhanced health context and metrics
app.use('/api/symptoms', authenticateToken, symptomRoutes); // Enhanced symptom tracking
app.use('/api/symptom-templates', symptomTemplateRoutes); // Symptom templates for registration flow
app.use('/api/diary', authenticateToken, diaryRoutes);
app.use('/api/users', authenticateToken, usersRoutes);
app.use('/api/weather', weatherRoutes); // Weather data for symptom correlation
app.use('/api/airthings', airthingsRoutesV2); // Airthings indoor air quality integration (Client Credentials)
app.use('/api/settings', authenticateToken, settingsRoutes); // System settings management
app.use('/api/medications', medicationRoutes); // Medication tracking with FEST integration
app.use('/api/activities', activityRoutes); // Activity tracking (temperature, social, physical)
app.use('/api/illness', illnessRoutes); // Illness tracking with MCAS impact
app.use('/api/meals', mealRoutes); // Meal tracking with food correlation
app.use('/api/preferences', authenticateToken, preferencesRoutes); // User preferences including analysis mode

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
      '/api/foods',
      '/api/analytics',
      '/api/recipes',
      '/api/symptoms',
      '/api/symptom-templates',
      '/api/sighi',
      '/api/diary',
      '/api/users',
      '/api/weather',
      '/api/airthings',
      '/api/settings',
      '/api/medications',
      '/api/activities',
      '/api/illness',
      '/api/meals'
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