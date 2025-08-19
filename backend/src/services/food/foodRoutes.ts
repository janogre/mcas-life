/**
 * Food Routes - MCAS-Life Food API Endpoints
 * 
 * RESTful API endpoints for food management:
 * - Public food search and browsing
 * - User-specific approved foods management
 * - SIGHI data import and management
 * - Food statistics and analytics
 */

import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { foodService } from './foodService.js';
import { authenticateToken, requireRole } from '../auth/authMiddleware.js';
import type { 
  FoodSearchRequest, 
  BulkFoodImportRequest,
  FoodCompatibility 
} from '@mcas-life/shared';

const router = Router();

// Rate limiting for different endpoints
const searchRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: { error: 'Too many search requests, please try again later' }
});

const importRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 imports per 15 minutes
  message: { error: 'Too many import requests, please try again later' }
});

// Validation schemas
const FoodSearchSchema = z.object({
  query: z.string().optional(),
  compatibility_filter: z.number().min(0).max(3).optional(),
  category_filter: z.string().optional(),
  trigger_filter: z.string().length(1).optional(),
  include_approved: z.boolean().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional()
});

const ApprovedFoodSchema = z.object({
  food_name: z.string().min(1).max(255),
  personal_compatibility: z.number().min(0).max(3),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional()
});

const UpdateApprovedFoodSchema = z.object({
  personal_compatibility: z.number().min(0).max(3).optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  reaction_score: z.number().min(0).max(10).optional()
});

const BulkImportSchema = z.object({
  foods: z.array(z.object({
    name_no: z.string().min(1),
    name_en: z.string().min(1),
    category: z.string().optional(),
    compatibility: z.number().min(0).max(3),
    triggers: z.union([z.string(), z.array(z.string())]).optional(),
    remarks_no: z.string().optional(),
    remarks_en: z.string().optional()
  })).min(1).max(1000),
  overwrite_existing: z.boolean().optional()
});

/**
 * GET /api/foods - Legacy compatibility route
 * Handles old frontend requests and translates to new format
 */
router.get('/foods', searchRateLimit, async (req, res) => {
  try {
    // Translate legacy parameters to new format
    const translatedQuery = {
      query: req.query.search as string || req.query.q as string,
      compatibility_filter: req.query.compatibility ? parseInt(req.query.compatibility as string) : undefined,
      category_filter: req.query.category as string,
      trigger_filter: req.query.triggers as string,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      page: req.query.page ? parseInt(req.query.page as string) : 1
    };

    // Validate translated parameters
    const validation = FoodSearchSchema.safeParse(translatedQuery);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid search parameters',
        details: validation.error.errors
      });
    }

    const searchRequest: FoodSearchRequest = {
      ...validation.data,
      user_id: req.user?.userId
    };

    const result = await foodService.searchFoods(searchRequest);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Food search error:', error);
    res.status(500).json({
      error: 'Failed to search foods',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/foods/search
 * Search foods with advanced filtering
 * Public endpoint with optional authentication for personalized results
 */
router.get('/search', searchRateLimit, async (req, res) => {
  try {
    // Validate query parameters
    const validation = FoodSearchSchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid search parameters',
        details: validation.error.errors
      });
    }

    const searchRequest: FoodSearchRequest = {
      ...validation.data,
      user_id: req.user?.userId // From optional auth middleware
    };

    const result = await foodService.searchFoods(searchRequest);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Food search error:', error);
    res.status(500).json({
      error: 'Failed to search foods',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/foods/:id
 * Get detailed food information by ID
 * Public endpoint
 */
router.get('/:id', async (req, res) => {
  try {
    const foodId = parseInt(req.params.id);
    if (isNaN(foodId)) {
      return res.status(400).json({ error: 'Invalid food ID' });
    }

    const food = await foodService.getFoodById(foodId);
    if (!food) {
      return res.status(404).json({ error: 'Food not found' });
    }

    res.json({
      success: true,
      data: food
    });

  } catch (error) {
    console.error('Get food error:', error);
    res.status(500).json({
      error: 'Failed to retrieve food',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/foods/compatibility/:level
 * Get foods by compatibility level (0=safe, 1=medium, 2=avoid)
 * Public endpoint
 */
router.get('/compatibility/:level', async (req, res) => {
  try {
    const level = parseInt(req.params.level);
    if (![0, 1, 2, 3].includes(level)) {
      return res.status(400).json({ error: 'Invalid compatibility level. Use 0, 1, 2, or 3' });
    }

    const foods = await foodService.getFoodsByCompatibility(level as FoodCompatibility);

    res.json({
      success: true,
      data: foods,
      compatibility: level === 0 ? 'Safe' : level === 1 ? 'Medium' : level === 2 ? 'Incompatible' : 'Severe'
    });

  } catch (error) {
    console.error('Get foods by compatibility error:', error);
    res.status(500).json({
      error: 'Failed to retrieve foods by compatibility',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/foods/trigger/:trigger
 * Get foods containing specific SIGHI trigger
 * Public endpoint
 */
router.get('/trigger/:trigger', async (req, res) => {
  try {
    const trigger = req.params.trigger.toUpperCase();
    if (!/^[HLABSTPNDC]$/.test(trigger)) {
      return res.status(400).json({ 
        error: 'Invalid trigger. Use H, L, A, B, S, T, P, N, D, or C' 
      });
    }

    const foods = await foodService.getFoodsByTrigger(trigger as any);

    res.json({
      success: true,
      data: foods,
      trigger: trigger
    });

  } catch (error) {
    console.error('Get foods by trigger error:', error);
    res.status(500).json({
      error: 'Failed to retrieve foods by trigger',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/foods/statistics
 * Get food database statistics
 * Public endpoint
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = await foodService.getFoodStatistics();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get food statistics error:', error);
    res.status(500).json({
      error: 'Failed to retrieve food statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================== USER-SPECIFIC ENDPOINTS ====================

/**
 * GET /api/foods/approved
 * Get user's approved foods
 * Requires authentication
 */
router.get('/approved', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const approvedFoods = await foodService.getUserApprovedFoods(userId);

    res.json({
      success: true,
      data: approvedFoods
    });

  } catch (error) {
    console.error('Get approved foods error:', error);
    res.status(500).json({
      error: 'Failed to retrieve approved foods',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/foods/approved
 * Add new user-approved food
 * Requires authentication
 */
router.post('/approved', authenticateToken, async (req, res) => {
  try {
    const validation = ApprovedFoodSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid approved food data',
        details: validation.error.errors
      });
    }

    const userId = req.user!.userId;
    const approvedFood = await foodService.addUserApprovedFood(userId, validation.data);

    res.status(201).json({
      success: true,
      data: approvedFood
    });

  } catch (error) {
    console.error('Add approved food error:', error);
    res.status(500).json({
      error: 'Failed to add approved food',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/foods/approved/:id
 * Update user-approved food
 * Requires authentication
 */
router.put('/approved/:id', authenticateToken, async (req, res) => {
  try {
    const approvedFoodId = parseInt(req.params.id);
    if (isNaN(approvedFoodId)) {
      return res.status(400).json({ error: 'Invalid approved food ID' });
    }

    const validation = UpdateApprovedFoodSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid update data',
        details: validation.error.errors
      });
    }

    const userId = req.user!.userId;
    const updatedFood = await foodService.updateUserApprovedFood(
      userId, 
      approvedFoodId, 
      validation.data
    );

    if (!updatedFood) {
      return res.status(404).json({ error: 'Approved food not found or not owned by user' });
    }

    res.json({
      success: true,
      data: updatedFood
    });

  } catch (error) {
    console.error('Update approved food error:', error);
    res.status(500).json({
      error: 'Failed to update approved food',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================== ADMIN ENDPOINTS ====================

/**
 * POST /api/foods/import
 * Bulk import foods (SIGHI data)
 * Requires admin role
 */
router.post('/import', importRateLimit, requireRole('admin'), async (req, res) => {
  try {
    const validation = BulkImportSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid import data',
        details: validation.error.errors
      });
    }

    const importRequest: BulkFoodImportRequest = validation.data;
    const result = await foodService.bulkImportFoods(importRequest);

    res.json({
      success: true,
      data: result,
      message: `Import completed: ${result.imported} imported, ${result.skipped} skipped`
    });

  } catch (error) {
    console.error('Bulk import error:', error);
    res.status(500).json({
      error: 'Failed to import foods',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/foods/:id
 * Delete food (admin only)
 * Requires admin role
 */
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const foodId = parseInt(req.params.id);
    if (isNaN(foodId)) {
      return res.status(400).json({ error: 'Invalid food ID' });
    }

    // Note: Implementation would need to be added to foodService
    // For now, return not implemented
    res.status(501).json({
      error: 'Delete food functionality not yet implemented'
    });

  } catch (error) {
    console.error('Delete food error:', error);
    res.status(500).json({
      error: 'Failed to delete food',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware for this router
router.use((error: Error, req: any, res: any, next: any) => {
  console.error('Food router error:', error);
  res.status(500).json({
    error: 'Internal server error in food service',
    message: process.env['NODE_ENV'] === 'development' ? error.message : 'Something went wrong'
  });
});

export { router as foodRoutes };