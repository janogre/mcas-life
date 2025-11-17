/**
 * Auth Routes - MCAS-Life Authentication API
 * 
 * RESTful authentication endpoints with comprehensive validation
 * and MCAS-specific user onboarding flow.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authService } from './authService.js';
import { 
  authenticateToken, 
  requireSelfOrAdmin, 
  rateLimitByUser 
} from './authMiddleware.js';
import type { 
  RegisterRequest, 
  LoginCredentials, 
  ChangePasswordRequest,
  ApiResponse,
  AuthResponse 
} from '@mcas-life/shared';

const router = Router();

// Validation schemas using Zod
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  first_name: z.string().min(1, 'First name is required').optional(),
  last_name: z.string().min(1, 'Last name is required').optional(),
  timezone: z.string().min(1, 'Timezone is required'),
  language: z.enum(['no', 'en', 'da', 'sv'], {
    errorMap: () => ({ message: 'Language must be one of: no, en, da, sv' })
  }),
  mcas_severity: z.enum(['mild', 'moderate', 'severe', 'unknown'], {
    errorMap: () => ({ message: 'MCAS severity must be one of: mild, moderate, severe, unknown' })
  }),
  confirmed_diagnosis: z.boolean(),
  accept_terms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions'
  }),
  accept_privacy: z.boolean().refine(val => val === true, {
    message: 'You must accept the privacy policy'
  }),
  join_research: z.boolean().optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  remember_me: z.boolean().optional()
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'New password must contain at least one lowercase letter, one uppercase letter, and one number')
});

const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required')
});

/**
 * Helper function to get client info from request
 */
function getClientInfo(req: Request) {
  return {
    ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    deviceInfo: req.get('X-Device-Info') || req.get('User-Agent') || 'unknown'
  };
}

/**
 * Helper function to handle validation errors
 */
function handleValidationError(error: z.ZodError, res: Response) {
  const validationErrors = error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));

  res.status(400).json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      details: validationErrors,
      timestamp: new Date().toISOString(),
      request_id: res.get('X-Request-ID') || 'unknown'
    }
  });
}

/**
 * POST /auth/register
 * Register new user with MCAS profile
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = registerSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      handleValidationError(validationResult.error, res);
      return;
    }

    const registrationData = validationResult.data as RegisterRequest;
    const clientInfo = getClientInfo(req);

    // Register user
    const authResponse = await authService.register(registrationData, clientInfo);

    res.status(201).json({
      success: true,
      data: authResponse,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: res.get('X-Request-ID') || 'unknown',
        version: 'v1'
      }
    } as ApiResponse<AuthResponse>);

  } catch (error) {
    console.error('Registration error:', error);
    
    res.status(400).json({
      success: false,
      error: {
        code: 'REGISTRATION_FAILED',
        message: error instanceof Error ? error.message : 'Registration failed',
        timestamp: new Date().toISOString(),
        request_id: res.get('X-Request-ID') || 'unknown'
      }
    });
  }
});

/**
 * POST /auth/login
 * Authenticate user and return tokens
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    // Validate request body
    console.log('🔐 Login attempt:', { email: req.body?.email, hasPassword: !!req.body?.password, passwordLength: req.body?.password?.length });

    const validationResult = loginSchema.safeParse(req.body);

    if (!validationResult.success) {
      console.log('❌ Validation failed:', validationResult.error);
      handleValidationError(validationResult.error, res);
      return;
    }

    const credentials = validationResult.data as LoginCredentials;
    const clientInfo = getClientInfo(req);

    console.log('✅ Validation passed, attempting login for:', credentials.email);

    // Authenticate user
    const authResponse = await authService.login(credentials, clientInfo);

    console.log('✅ Login successful, sending response...');

    const response = {
      success: true,
      data: authResponse,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: res.get('X-Request-ID') || 'unknown',
        version: 'v1'
      }
    } as ApiResponse<AuthResponse>;

    console.log('📤 Response size:', JSON.stringify(response).length, 'bytes');
    res.json(response);
    console.log('✨ Response sent!');

  } catch (error) {
    console.error('Login error:', error);
    
    res.status(401).json({
      success: false,
      error: {
        code: 'LOGIN_FAILED',
        message: error instanceof Error ? error.message : 'Login failed',
        timestamp: new Date().toISOString(),
        request_id: res.get('X-Request-ID') || 'unknown'
      }
    });
  }
});

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = refreshTokenSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      handleValidationError(validationResult.error, res);
      return;
    }

    const { refresh_token } = validationResult.data;

    console.log('🔄 Refresh request received with token:', refresh_token ? refresh_token.substring(0, 50) + '...' : 'null');

    // Refresh tokens
    const newTokens = await authService.refreshToken(refresh_token);

    res.json({
      success: true,
      data: newTokens,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: res.get('X-Request-ID') || 'unknown',
        version: 'v1'
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    
    res.status(401).json({
      success: false,
      error: {
        code: 'TOKEN_REFRESH_FAILED',
        message: error instanceof Error ? error.message : 'Token refresh failed',
        timestamp: new Date().toISOString(),
        request_id: res.get('X-Request-ID') || 'unknown'
      }
    });
  }
});

/**
 * POST /auth/logout
 * Logout current session
 */
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (refresh_token) {
      await authService.logout(refresh_token);
    }

    res.json({
      success: true,
      data: { message: 'Successfully logged out' },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: res.get('X-Request-ID') || 'unknown',
        version: 'v1'
      }
    });

  } catch (error) {
    console.error('Logout error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGOUT_FAILED',
        message: 'Logout failed',
        timestamp: new Date().toISOString(),
        request_id: res.get('X-Request-ID') || 'unknown'
      }
    });
  }
});

/**
 * POST /auth/logout-all
 * Logout all sessions for the user
 */
router.post('/logout-all', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: res.get('X-Request-ID') || 'unknown'
        }
      });
      return;
    }

    await authService.logoutAll(req.user.userId);

    res.json({
      success: true,
      data: { message: 'Successfully logged out from all devices' },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: res.get('X-Request-ID') || 'unknown',
        version: 'v1'
      }
    });

  } catch (error) {
    console.error('Logout all error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'LOGOUT_ALL_FAILED',
        message: 'Logout all failed',
        timestamp: new Date().toISOString(),
        request_id: res.get('X-Request-ID') || 'unknown'
      }
    });
  }
});

/**
 * POST /auth/change-password
 * Change user password
 */
router.post('/change-password', 
  authenticateToken, 
  rateLimitByUser(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
            request_id: res.get('X-Request-ID') || 'unknown'
          }
        });
        return;
      }

      // Validate request body
      const validationResult = changePasswordSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        handleValidationError(validationResult.error, res);
        return;
      }

      const passwordData = validationResult.data as ChangePasswordRequest;

      // Change password
      await authService.changePassword(req.user.userId, passwordData);

      res.json({
        success: true,
        data: { message: 'Password changed successfully' },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: res.get('X-Request-ID') || 'unknown',
          version: 'v1'
        }
      });

    } catch (error) {
      console.error('Change password error:', error);
      
      res.status(400).json({
        success: false,
        error: {
          code: 'PASSWORD_CHANGE_FAILED',
          message: error instanceof Error ? error.message : 'Password change failed',
          timestamp: new Date().toISOString(),
          request_id: res.get('X-Request-ID') || 'unknown'
        }
      });
    }
  }
);

/**
 * GET /auth/me
 * Get current user profile
 */
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: res.get('X-Request-ID') || 'unknown'
        }
      });
      return;
    }

    // Return user info (already verified by middleware)
    res.json({
      success: true,
      data: {
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: res.get('X-Request-ID') || 'unknown',
        version: 'v1'
      }
    });

  } catch (error) {
    console.error('Get user profile error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'PROFILE_FETCH_FAILED',
        message: 'Failed to fetch user profile',
        timestamp: new Date().toISOString(),
        request_id: res.get('X-Request-ID') || 'unknown'
      }
    });
  }
});

/**
 * GET /auth/sessions
 * Get user's active sessions
 */
router.get('/sessions', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          request_id: res.get('X-Request-ID') || 'unknown'
        }
      });
      return;
    }

    const sessions = await authService.getUserSessions(req.user.userId);

    res.json({
      success: true,
      data: sessions,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: res.get('X-Request-ID') || 'unknown',
        version: 'v1'
      }
    });

  } catch (error) {
    console.error('Get sessions error:', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'SESSIONS_FETCH_FAILED',
        message: 'Failed to fetch user sessions',
        timestamp: new Date().toISOString(),
        request_id: res.get('X-Request-ID') || 'unknown'
      }
    });
  }
});

/**
 * POST /auth/verify-token
 * Verify if token is valid (for client-side token validation)
 */
router.post('/verify-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Token is required',
          timestamp: new Date().toISOString(),
          request_id: res.get('X-Request-ID') || 'unknown'
        }
      });
      return;
    }

    const userInfo = await authService.verifyToken(token);

    res.json({
      success: true,
      data: {
        valid: true,
        user: userInfo
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: res.get('X-Request-ID') || 'unknown',
        version: 'v1'
      }
    });

  } catch (error) {
    res.json({
      success: true,
      data: {
        valid: false,
        error: error instanceof Error ? error.message : 'Token validation failed'
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: res.get('X-Request-ID') || 'unknown',
        version: 'v1'
      }
    });
  }
});

// Forgot password validation schemas
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format')
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')
});

/**
 * POST /api/auth/forgot-password
 * Initiate password reset process
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const validation = forgotPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: validation.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          })),
          timestamp: new Date().toISOString(),
          request_id: res.get('X-Request-ID') || 'unknown'
        }
      });
    }

    const { email } = validation.data;

    try {
      const resetInfo = await authService.forgotPassword(email);
      
      // In development, return token for testing. In production, send email
      const response: any = {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
        meta: {
          timestamp: new Date().toISOString(),
          request_id: res.get('X-Request-ID') || 'unknown',
          version: 'v1'
        }
      };

      // Include token in development mode for testing
      if (process.env.NODE_ENV === 'development') {
        response.data = {
          resetToken: resetInfo.resetToken,
          email: resetInfo.email,
          emailSent: resetInfo.emailSent
        };
      } else {
        response.data = {
          emailSent: resetInfo.emailSent
        };
      }

      res.status(200).json(response);

    } catch (error: any) {
      if (error.message === 'USER_NOT_FOUND') {
        // Don't reveal if user exists - return same message
        return res.status(200).json({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.',
          meta: {
            timestamp: new Date().toISOString(),
            request_id: res.get('X-Request-ID') || 'unknown',
            version: 'v1'
          }
        });
      }
      throw error;
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to process password reset request',
        timestamp: new Date().toISOString(),
        request_id: res.get('X-Request-ID') || 'unknown'
      }
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using valid token
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const validation = resetPasswordSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: validation.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          })),
          timestamp: new Date().toISOString(),
          request_id: res.get('X-Request-ID') || 'unknown'
        }
      });
    }

    const { token, password } = validation.data;

    try {
      await authService.resetPassword(token, password);

      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully. Please log in with your new password.',
        meta: {
          timestamp: new Date().toISOString(),
          request_id: res.get('X-Request-ID') || 'unknown',
          version: 'v1'
        }
      });

    } catch (error: any) {
      if (error.message === 'INVALID_OR_EXPIRED_TOKEN') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Password reset token is invalid or has expired. Please request a new password reset.',
            timestamp: new Date().toISOString(),
            request_id: res.get('X-Request-ID') || 'unknown'
          }
        });
      }
      throw error;
    }

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to reset password',
        timestamp: new Date().toISOString(),
        request_id: res.get('X-Request-ID') || 'unknown'
      }
    });
  }
});

/**
 * GET /api/auth/validate-reset-token/:token
 * Validate reset token without consuming it
 */
router.get('/validate-reset-token/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Reset token is required',
          timestamp: new Date().toISOString(),
          request_id: res.get('X-Request-ID') || 'unknown'
        }
      });
    }

    try {
      const userInfo = await authService.validateResetToken(token);

      res.status(200).json({
        success: true,
        data: {
          valid: true,
          email: userInfo.email
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: res.get('X-Request-ID') || 'unknown',
          version: 'v1'
        }
      });

    } catch (error: any) {
      if (error.message === 'INVALID_OR_EXPIRED_TOKEN') {
        return res.status(400).json({
          success: false,
          data: {
            valid: false
          },
          error: {
            code: 'INVALID_TOKEN',
            message: 'Password reset token is invalid or has expired',
            timestamp: new Date().toISOString(),
            request_id: res.get('X-Request-ID') || 'unknown'
          }
        });
      }
      throw error;
    }

  } catch (error) {
    console.error('Validate reset token error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to validate reset token',
        timestamp: new Date().toISOString(),
        request_id: res.get('X-Request-ID') || 'unknown'
      }
    });
  }
});

export { router as authRoutes };