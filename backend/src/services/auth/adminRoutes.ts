/**
 * Admin Routes - MCAS-Life User Management API
 *
 * Admin-only endpoints for managing users and assigning roles.
 * All routes require admin authentication.
 */

import express, { Request, Response } from 'express';
import { z } from 'zod';
import { adminService } from './adminService.js';
import { authenticateToken, requireAdmin } from './authMiddleware.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Validation schemas
const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  username: z.string().min(3).max(100),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
  role: z.enum(['patient', 'expert', 'researcher', 'admin']).optional()
});

const UpdateRoleSchema = z.object({
  role: z.enum(['patient', 'expert', 'researcher', 'admin'])
});

const UpdateStatusSchema = z.object({
  status: z.enum(['active', 'suspended', 'deleted'])
});

const ResetPasswordSchema = z.object({
  new_password: z.string().min(8, 'Password must be at least 8 characters')
});

/**
 * GET /api/admin/users
 * List all users with pagination and filtering
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;
    const role = req.query.role as string;
    const status = req.query.status as string;

    const result = await adminService.listUsers({
      page,
      limit,
      search,
      role,
      status
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to list users',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/admin/users/stats
 * Get user statistics for admin dashboard
 */
router.get('/users/stats', async (req: Request, res: Response) => {
  try {
    const stats = await adminService.getUserStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting user stats:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get user stats',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/admin/users/:id
 * Get single user with full details
 */
router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid user ID',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const user = await adminService.getUserById(userId);

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error getting user:', error);

    if (error instanceof Error && error.message === 'User not found') {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get user',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /api/admin/users
 * Create new user
 */
router.post('/users', async (req: Request, res: Response) => {
  try {
    const validatedData = CreateUserSchema.parse(req.body);

    const newUser = await adminService.createUser(validatedData);

    res.status(201).json({
      success: true,
      data: newUser,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error creating user:', error);

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    if (error instanceof Error && (error.message.includes('already exists'))) {
      res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to create user',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * PUT /api/admin/users/:id/role
 * Update user role
 */
router.put('/users/:id/role', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid user ID',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const validatedData = UpdateRoleSchema.parse(req.body);

    await adminService.updateUserRole(userId, validatedData.role);

    res.json({
      success: true,
      message: `User role updated to ${validatedData.role}`
    });
  } catch (error) {
    console.error('Error updating user role:', error);

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    if (error instanceof Error && error.message === 'User not found') {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update user role',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * PUT /api/admin/users/:id/status
 * Update user account status (active/suspended/deleted)
 */
router.put('/users/:id/status', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid user ID',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const validatedData = UpdateStatusSchema.parse(req.body);

    await adminService.updateAccountStatus(userId, validatedData.status);

    res.json({
      success: true,
      message: `User account status updated to ${validatedData.status}`
    });
  } catch (error) {
    console.error('Error updating user status:', error);

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    if (error instanceof Error && error.message === 'User not found') {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update user status',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /api/admin/users/:id/verify-email
 * Manually verify user email
 */
router.post('/users/:id/verify-email', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid user ID',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    await adminService.verifyUserEmail(userId);

    res.json({
      success: true,
      message: 'User email verified successfully'
    });
  } catch (error) {
    console.error('Error verifying user email:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to verify user email',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * POST /api/admin/users/:id/reset-password
 * Admin reset user password
 */
router.post('/users/:id/reset-password', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid user ID',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    const validatedData = ResetPasswordSchema.parse(req.body);

    await adminService.resetUserPassword(userId, validatedData.new_password);

    res.json({
      success: true,
      message: 'User password reset successfully. All sessions invalidated.'
    });
  } catch (error) {
    console.error('Error resetting user password:', error);

    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors,
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to reset user password',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Permanently delete user
 */
router.delete('/users/:id', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);

    if (isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid user ID',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    // Prevent admin from deleting themselves
    if (req.user && req.user.userId === userId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Cannot delete your own account',
          timestamp: new Date().toISOString()
        }
      });
      return;
    }

    await adminService.deleteUser(userId);

    res.json({
      success: true,
      message: 'User deleted permanently'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete user',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;
