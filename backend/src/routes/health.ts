/**
 * Health Context API Routes
 * Handles daily context logging and health metrics
 */

import express from 'express';
import { z } from 'zod';
import { HealthService, type DailyContextInput } from '../services/health/healthService.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Validation schemas
const dailyContextSchema = z.object({
  // Sleep and wellness
  sleep_hours: z.number().min(0).max(24).optional(),
  sleep_quality: z.number().int().min(1).max(10).optional(),
  energy_level: z.number().int().min(1).max(10).optional(),
  stress_level: z.number().int().min(1).max(10).optional(),
  
  // MCAS-specific triggers
  dao_supplement_taken: z.boolean().optional(),
  compression_worn: z.boolean().optional(),
  sensory_environment_controlled: z.boolean().optional(),
  physical_activity_level: z.number().int().min(0).max(10).optional(),
  
  // Weather context
  weather_temperature: z.number().optional(),
  weather_humidity: z.number().int().min(0).max(100).optional(),
  weather_barometric_pressure: z.number().optional(),
  
  // Health status
  infection_symptoms: z.boolean().optional(),
  incubating_illness: z.boolean().optional(),
  menstrual_cycle_day: z.number().int().min(1).max(40).optional(),
  perimenopause_symptoms: z.boolean().optional(),
  
  // Previous day influence
  had_reactions_yesterday: z.boolean().optional(),
  physical_activity_yesterday: z.number().int().min(0).max(10).optional(),
  fatigue_level_yesterday: z.number().int().min(0).max(10).optional(),
  stress_level_yesterday: z.number().int().min(0).max(10).optional(),
  
  // Today's context
  ate_heavy_food: z.boolean().optional(),
  current_concerns: z.string().optional(),
  controlled_stimuli: z.boolean().optional(),
  physically_tired_when_eating: z.boolean().optional(),
  psychologically_tired_when_eating: z.boolean().optional(),
  
  notes: z.string().optional(),
});

const healthMetricsQuerySchema = z.object({
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.string().transform(val => parseInt(val)).refine(val => val > 0 && val <= 100).optional()
});

// Apply authentication to all routes
router.use(authMiddleware);

/**
 * POST /health/daily-context
 * Log daily health context
 */
router.post('/daily-context', async (req, res) => {
  try {
    const contextData = dailyContextSchema.parse(req.body);
    const userId = req.user!.id;
    const date = new Date().toISOString().split('T')[0]; // Today's date
    
    const healthMetric = await HealthService.logDailyContext(userId, date, contextData);
    
    res.json({
      success: true,
      data: healthMetric,
      message: 'Daglig kontekst lagret'
    });
  } catch (error) {
    console.error('Error logging daily context:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : 'Kunne ikke lagre daglig kontekst'
    });
  }
});

/**
 * PUT /health/daily-context/:date
 * Update daily context for specific date
 */
router.put('/daily-context/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const contextData = dailyContextSchema.parse(req.body);
    const userId = req.user!.id;
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'Ugyldig datoformat. Bruk YYYY-MM-DD'
      });
    }
    
    const healthMetric = await HealthService.logDailyContext(userId, date, contextData);
    
    res.json({
      success: true,
      data: healthMetric,
      message: `Kontekst for ${date} oppdatert`
    });
  } catch (error) {
    console.error('Error updating daily context:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : 'Kunne ikke oppdatere daglig kontekst'
    });
  }
});

/**
 * GET /health/metrics
 * Get health metrics history
 */
router.get('/metrics', async (req, res) => {
  try {
    const query = healthMetricsQuerySchema.parse(req.query);
    const userId = req.user!.id;
    
    const metrics = await HealthService.getHealthMetrics(
      userId,
      query.start_date,
      query.end_date,
      query.limit
    );
    
    res.json({
      success: true,
      data: metrics,
      count: metrics.length
    });
  } catch (error) {
    console.error('Error getting health metrics:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : 'Kunne ikke hente helse-data'
    });
  }
});

/**
 * GET /health/today
 * Get today's health context
 */
router.get('/today', async (req, res) => {
  try {
    const userId = req.user!.id;
    const today = new Date().toISOString().split('T')[0];
    
    const context = await HealthService.getTodaysContext(userId, today);
    
    res.json({
      success: true,
      data: context,
      message: context ? 'Dagens kontekst funnet' : 'Ingen kontekst registrert for i dag'
    });
  } catch (error) {
    console.error('Error getting today context:', error);
    res.status(500).json({
      success: false,
      error: 'Kunne ikke hente dagens kontekst'
    });
  }
});

/**
 * GET /health/risk-analysis
 * Get risk analysis for today
 */
router.get('/risk-analysis', async (req, res) => {
  try {
    const userId = req.user!.id;
    const today = new Date().toISOString().split('T')[0];
    
    const analysis = await HealthService.getRiskAnalysis(userId, today);
    
    if (!analysis) {
      return res.json({
        success: true,
        data: null,
        message: 'Ingen kontekst registrert for risikoanalyse'
      });
    }
    
    res.json({
      success: true,
      data: analysis,
      message: 'Risikoanalyse fullført'
    });
  } catch (error) {
    console.error('Error getting risk analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Kunne ikke utføre risikoanalyse'
    });
  }
});

/**
 * GET /health/context-template
 * Get template for daily context with common values
 */
router.get('/context-template', (req, res) => {
  const template = {
    sleep_hours: null,
    sleep_quality: null,
    energy_level: null,
    stress_level: null,
    dao_supplement_taken: false,
    compression_worn: false,
    sensory_environment_controlled: false,
    physical_activity_level: null,
    infection_symptoms: false,
    incubating_illness: false,
    menstrual_cycle_day: null,
    perimenopause_symptoms: false,
    had_reactions_yesterday: false,
    ate_heavy_food: false,
    controlled_stimuli: false,
    physically_tired_when_eating: false,
    psychologically_tired_when_eating: false,
    notes: ''
  };
  
  res.json({
    success: true,
    data: template,
    message: 'Mal for daglig kontekst'
  });
});

// Basic health check
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  const checks = {
    server: 'healthy',
    database: 'checking...',
    memory: 'healthy',
    disk: 'healthy'
  };

  try {
    // TODO: Add database health check when DB is set up
    // const dbHealth = await checkDatabaseHealth();
    // checks.database = dbHealth ? 'healthy' : 'unhealthy';
    checks.database = 'not_configured';

    // Memory check
    const memUsage = process.memoryUsage();
    const memThreshold = 1024 * 1024 * 1024; // 1GB
    checks.memory = memUsage.rss > memThreshold ? 'warning' : 'healthy';

    const allHealthy = Object.values(checks).every(status => 
      status === 'healthy' || status === 'not_configured'
    );

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: memUsage,
      version: process.version,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export { router as healthRoutes };