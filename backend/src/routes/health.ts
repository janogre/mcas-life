import express from 'express';

const router = express.Router();

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