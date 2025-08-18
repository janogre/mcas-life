/**
 * Auth Service Module Exports
 * 
 * Central export point for all authentication-related functionality
 */

// Export auth service
export { authService, AuthService } from './authService.js';

// Export middleware
export {
  authenticateToken,
  optionalAuth,
  requireRole,
  requireAdmin,
  requireExpert,
  requireResearcher,
  requireSelfOrAdmin,
  authenticateApiKey,
  rateLimitByUser,
  requireMcasProfile
} from './authMiddleware.js';

// Export routes
export { authRoutes } from './authRoutes.js';