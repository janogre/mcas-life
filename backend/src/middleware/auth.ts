import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError } from './errorHandler.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    userId: number;
    email: string;
    name: string;
    role: string;
  };
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided');
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!process.env['JWT_SECRET']) {
      throw new Error('JWT_SECRET is not configured');
    }
    
    const decoded = jwt.verify(token, process.env['JWT_SECRET']) as {
      userId: number;
      email: string;
      role: string;
      type: string;
      iat: number;
      exp: number;
    };
    
    req.user = {
      id: decoded.userId,
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.email, // Use email as name fallback
      role: decoded.role
    };
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Token has expired'));
    } else {
      next(error);
    }
  }
};

export const optionalAuthMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, but that's OK for optional auth
      return next();
    }
    
    const token = authHeader.substring(7);
    
    if (!process.env['JWT_SECRET']) {
      return next();
    }
    
    const decoded = jwt.verify(token, process.env['JWT_SECRET']) as {
      userId: number;
      email: string;
      role: string;
      type: string;
      iat: number;
      exp: number;
    };
    
    req.user = {
      id: decoded.userId,
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.email, // Use email as name fallback
      role: decoded.role
    };
    
    next();
  } catch (error) {
    // For optional auth, ignore token errors and continue without user
    next();
  }
};

// Alias for compatibility
export const authenticate = authMiddleware;

// Role-based authorization middleware
export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthenticationError('Authentication required'));
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        required_roles: allowedRoles,
        user_role: req.user.role
      });
    }
    
    next();
  };
}