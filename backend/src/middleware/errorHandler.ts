import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class ValidationError extends Error {
  statusCode = 400;
  isOperational = true;

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  statusCode = 401;
  isOperational = true;

  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  statusCode = 403;
  isOperational = true;

  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  isOperational = true;

  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends Error {
  statusCode = 500;
  isOperational = true;

  constructor(message: string = 'Database operation failed') {
    super(message);
    this.name = 'DatabaseError';
  }
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log error details
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      message: 'Invalid input data',
      details: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
    });
    return;
  }

  // Handle known application errors
  if (error.isOperational) {
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.name,
      message: error.message
    });
    return;
  }

  // Handle database errors
  if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
    res.status(409).json({
      success: false,
      error: 'Conflict',
      message: 'Resource already exists'
    });
    return;
  }

  if (error.message.includes('foreign key constraint')) {
    res.status(400).json({
      success: false,
      error: 'Invalid Reference',
      message: 'Referenced resource does not exist'
    });
    return;
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: 'Authentication Error',
      message: 'Invalid token'
    });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Authentication Error',
      message: 'Token has expired'
    });
    return;
  }

  // Handle multer errors (file upload)
  if (error.name === 'MulterError') {
    res.status(400).json({
      success: false,
      error: 'File Upload Error',
      message: error.message
    });
    return;
  }

  // Default error response for unexpected errors
  const isDevelopment = process.env['NODE_ENV'] === 'development';
  
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: isDevelopment ? error.message : 'Something went wrong',
    ...(isDevelopment && { stack: error.stack })
  });
};