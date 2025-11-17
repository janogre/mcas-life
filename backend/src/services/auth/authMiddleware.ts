/**
 * Auth Middleware - MCAS-Life Authentication
 * 
 * Express middleware for JWT token validation and user authorization.
 * Provides role-based access control and request rate limiting.
 */

import { Request, Response, NextFunction } from 'express';
import { authService } from './authService.js';

// Extend Express Request interface to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
        role: string;
      };
    }
  }
}

/**
 * JWT Authentication Middleware
 * Validates Bearer token and attaches user info to request
 */
export async function authenticateToken(
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No authorization header provided',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown'
        }
      });
      return;
    }

    const token = authHeader.split(' ')[1]; // Remove 'Bearer ' prefix
    
    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No token provided',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown'
        }
      });
      return;
    }

    // Verify token and get user info
    const userInfo = await authService.verifyToken(token);
    
    // Attach user info to request
    req.user = userInfo;
    
    next();

  } catch (error) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
}

/**
 * Optional Authentication Middleware
 * Attaches user info if token is present, but doesn't require it
 */
export async function optionalAuth(
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      
      if (token) {
        try {
          const userInfo = await authService.verifyToken(token);
          req.user = userInfo;
        } catch (error) {
          // Ignore token errors for optional auth
          console.warn('Optional auth token validation failed:', error);
        }
      }
    }
    
    next();

  } catch (error) {
    // Continue without authentication for optional auth
    next();
  }
}

/**
 * Role-based Authorization Middleware Factory
 * Creates middleware that checks if user has required role
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown'
        }
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown'
        }
      });
      return;
    }

    next();
  };
}

/**
 * Admin Only Middleware
 * Shorthand for requiring admin role
 */
export const requireAdmin = requireRole('admin');

/**
 * Expert or Admin Middleware
 * For endpoints that require medical expertise
 */
export const requireExpert = requireRole('expert', 'admin');

/**
 * Researcher Access Middleware
 * For research data endpoints
 */
export const requireResearcher = requireRole('researcher', 'admin');

/**
 * Self or Admin Authorization Middleware
 * Allows users to access their own data or admins to access any data
 */
export function requireSelfOrAdmin(userIdParam: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction): void => {
    
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown'
        }
      });
      return;
    }

    const targetUserId = parseInt(req.params[userIdParam]);
    const isAdmin = req.user.role === 'admin';
    const isSelf = req.user.userId === targetUserId;

    if (!isAdmin && !isSelf) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. You can only access your own data',
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown'
        }
      });
      return;
    }

    next();
  };
}

/**
 * API Key Authentication Middleware
 * For external integrations and webhooks
 */
export function authenticateApiKey(
  req: Request, 
  res: Response, 
  next: NextFunction
): void {
  
  const apiKey = req.headers['x-api-key'] as string;
  const expectedApiKey = process.env['API_KEY'];
  
  if (!expectedApiKey) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'API key authentication not configured',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
    return;
  }

  if (!apiKey || apiKey !== expectedApiKey) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing API key',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
    return;
  }

  next();
}

/**
 * Request Rate Limiting by User
 * More granular than global rate limiting
 */
const userRequestCounts = new Map<number, { count: number; resetTime: number }>();

export function rateLimitByUser(maxRequests: number = 5000, windowMs: number = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    
    if (!req.user) {
      // If no user, fall back to IP-based limiting (handled by global middleware)
      next();
      return;
    }

    const now = Date.now();
    const userId = req.user.userId;
    const userLimit = userRequestCounts.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // Reset or initialize counter
      userRequestCounts.set(userId, {
        count: 1,
        resetTime: now + windowMs
      });
      next();
      return;
    }

    if (userLimit.count >= maxRequests) {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Too many requests. Limit: ${maxRequests} per ${windowMs / 1000} seconds`,
          timestamp: new Date().toISOString(),
          request_id: req.headers['x-request-id'] || 'unknown'
        }
      });
      return;
    }

    // Increment counter
    userLimit.count++;
    next();
  };
}

/**
 * MCAS-specific role validation
 * Ensures user has completed MCAS profile setup
 */
export async function requireMcasProfile(
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
    return;
  }

  try {
    // Check if user has completed MCAS profile setup
    // This would typically query the mcas_profiles table
    // For now, we'll assume all authenticated users have profiles
    
    next();

  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Error validating MCAS profile',
        timestamp: new Date().toISOString(),
        request_id: req.headers['x-request-id'] || 'unknown'
      }
    });
  }
}

/**
 * Cleanup expired rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [userId, limit] of userRequestCounts.entries()) {
    if (now > limit.resetTime) {
      userRequestCounts.delete(userId);
    }
  }
}, 5 * 60 * 1000); // Cleanup every 5 minutes