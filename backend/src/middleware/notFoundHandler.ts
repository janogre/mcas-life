import { Request, Response, NextFunction } from 'express';

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `The requested endpoint ${req.method} ${req.originalUrl} was not found`,
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /api/health',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/sighi/foods',
      'GET /api/diary/entries',
      'POST /api/diary/entries'
    ]
  });
};