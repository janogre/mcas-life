import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError } from './errorHandler.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
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
      id: string;
      email: string;
      name: string;
      iat: number;
      exp: number;
    };
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name
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
      id: string;
      email: string;
      name: string;
    };
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name
    };
    
    next();
  } catch (error) {
    // For optional auth, ignore token errors and continue without user
    next();
  }
};