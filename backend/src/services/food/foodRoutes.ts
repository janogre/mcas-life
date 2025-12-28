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
import { personalRatingService } from './personalRatingService.js';
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
  max: 100, // 100 requests per minute (increased for better UX)
  message: { error: 'Too many search requests, please try again later' }
});

const importRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 imports per 15 minutes
  message: { error: 'Too many import requests, please try again later' }
});

const personalRatingRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 rating updates per minute (generous for user interaction)
  message: { error: 'Too many rating requests, please slow down' }
});

// Validation schemas
const FoodSearchSchema = z.object({
  query: z.string().optional(),
  compatibility_filter: z.number().min(0).max(3).optional(),
  category_filter: z.string().optional(),
  trigger_filter: z.string().min(1).max(2).optional(),
  include_approved: z.boolean().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional()
});

const ApprovedFoodSchema = z.object({
  food_id: z.number().int().positive(),
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

const PersonalRatingSchema = z.object({
  food_id: z.number().int().positive(),
  personal_rating: z.number().min(0).max(3),
  notes: z.string().max(500).optional()
});

const UpdatePersonalRatingSchema = z.object({
  personal_rating: z.number().min(0).max(3),
  notes: z.string().max(500).optional()
});

const CustomFoodSchema = z.object({
  name_no: z.string().min(1).max(255),
  name_en: z.string().min(1).max(255),
  category: z.string().min(1).max(100),
  compatibility: z.number().min(0).max(3),
  triggers: z.array(z.string().min(1).max(2)).optional().default([]),
  remarks_no: z.string().max(1000).optional(),
  remarks_en: z.string().max(1000).optional()
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
 * POST /api/foods/batch
 * Get multiple foods by IDs in a single request
 * Body: { food_ids: number[] }
 */
router.post('/batch', searchRateLimit, async (req, res) => {
  try {
    const { food_ids } = req.body;

    if (!Array.isArray(food_ids)) {
      return res.status(400).json({ error: 'food_ids must be an array' });
    }

    if (food_ids.length === 0) {
      return res.json({ success: true, data: [] });
    }

    if (food_ids.length > 100) {
      return res.status(400).json({ error: 'Cannot fetch more than 100 foods at once' });
    }

    // Validate all IDs are numbers
    if (!food_ids.every(id => typeof id === 'number' && Number.isInteger(id) && id > 0)) {
      return res.status(400).json({ error: 'All food_ids must be positive integers' });
    }

    const foods = await foodService.getFoodsByIds(food_ids);

    res.json({
      success: true,
      data: foods
    });

  } catch (error) {
    console.error('Batch food fetch error:', error);
    res.status(500).json({
      error: 'Failed to fetch foods',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================== USER-SPECIFIC ENDPOINTS ====================

// Generous rate limit for approved foods (frequently accessed by diary page)
const approvedFoodsRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too many approved foods requests, please try again later' }
});

/**
 * GET /api/foods/approved
 * Get user's approved foods with optional food details
 * Requires authentication
 * Query params: ?include_details=true to include full food information
 */
router.get('/approved', approvedFoodsRateLimit, authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const includeDetails = req.query.include_details === 'true';

    const approvedFoods = includeDetails
      ? await foodService.getUserApprovedFoodsWithDetails(userId)
      : await foodService.getUserApprovedFoods(userId);

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

/**
 * DELETE /api/foods/approved/:id
 * Remove user-approved food
 * Requires authentication
 */
router.delete('/approved/:id', authenticateToken, async (req, res) => {
  try {
    const approvedFoodId = parseInt(req.params.id);
    if (isNaN(approvedFoodId)) {
      return res.status(400).json({ error: 'Invalid approved food ID' });
    }

    const userId = req.user!.userId;
    const success = await foodService.removeUserApprovedFood(userId, approvedFoodId);

    if (!success) {
      return res.status(404).json({ error: 'Approved food not found or not owned by user' });
    }

    res.json({
      success: true,
      message: 'Approved food removed successfully'
    });

  } catch (error) {
    console.error('Remove approved food error:', error);
    res.status(500).json({
      error: 'Failed to remove approved food',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/foods/custom
 * Create custom user-defined food
 * Requires authentication
 */
router.post('/custom', authenticateToken, async (req, res) => {
  try {
    const validation = CustomFoodSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid custom food data',
        details: validation.error.errors
      });
    }

    const userId = req.user!.userId;
    const customFood = await foodService.createCustomFood(userId, {
      ...validation.data,
      compatibility: validation.data.compatibility as FoodCompatibility
    });

    res.status(201).json({
      success: true,
      data: customFood
    });

  } catch (error) {
    console.error('Create custom food error:', error);
    res.status(500).json({
      error: 'Failed to create custom food',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================== PERSONAL RATINGS ENDPOINTS ====================

/**
 * GET /api/foods/ratings
 * Get user's personal food ratings
 * Requires authentication
 */
router.get('/ratings', personalRatingRateLimit, authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const ratings = await personalRatingService.getUserFoodRatings(userId);

    res.json({
      success: true,
      data: ratings
    });

  } catch (error) {
    console.error('Get personal ratings error:', error);
    res.status(500).json({
      error: 'Failed to retrieve personal ratings',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/foods/ratings/:foodId
 * Get user's personal rating for a specific food
 * Requires authentication
 */
router.get('/ratings/:foodId', authenticateToken, async (req, res) => {
  try {
    const foodId = parseInt(req.params.foodId);
    if (isNaN(foodId)) {
      return res.status(400).json({ error: 'Invalid food ID' });
    }

    const userId = req.user!.userId;
    const rating = await personalRatingService.getUserFoodRating(userId, foodId);

    if (!rating) {
      return res.status(404).json({ error: 'No personal rating found for this food' });
    }

    res.json({
      success: true,
      data: rating
    });

  } catch (error) {
    console.error('Get personal rating error:', error);
    res.status(500).json({
      error: 'Failed to retrieve personal rating',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/foods/ratings
 * Set personal rating for a food
 * Requires authentication
 */
router.post('/ratings', personalRatingRateLimit, authenticateToken, async (req, res) => {
  try {
    const validation = PersonalRatingSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid personal rating data',
        details: validation.error.errors
      });
    }

    const userId = req.user!.userId;
    const { food_id, personal_rating, notes } = validation.data;
    
    const rating = await personalRatingService.setFoodRating(userId, food_id, personal_rating, notes);

    res.json({
      success: true,
      data: rating
    });

  } catch (error) {
    console.error('Set personal rating error:', error);
    res.status(500).json({
      error: 'Failed to set personal rating',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/foods/ratings/:foodId
 * Update personal rating for a food
 * Requires authentication
 */
router.put('/ratings/:foodId', personalRatingRateLimit, authenticateToken, async (req, res) => {
  try {
    const foodId = parseInt(req.params.foodId);
    if (isNaN(foodId)) {
      return res.status(400).json({ error: 'Invalid food ID' });
    }

    const validation = UpdatePersonalRatingSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid update data',
        details: validation.error.errors
      });
    }

    const userId = req.user!.userId;
    const { personal_rating, notes } = validation.data;
    
    const rating = await personalRatingService.setFoodRating(userId, foodId, personal_rating, notes);

    res.json({
      success: true,
      data: rating
    });

  } catch (error) {
    console.error('Update personal rating error:', error);
    res.status(500).json({
      error: 'Failed to update personal rating',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/foods/ratings/:foodId
 * Remove personal rating for a food
 * Requires authentication
 */
router.delete('/ratings/:foodId', authenticateToken, async (req, res) => {
  try {
    const foodId = parseInt(req.params.foodId);
    if (isNaN(foodId)) {
      return res.status(400).json({ error: 'Invalid food ID' });
    }

    const userId = req.user!.userId;
    const success = await personalRatingService.removeFoodRating(userId, foodId);

    if (!success) {
      return res.status(404).json({ error: 'Personal rating not found' });
    }

    res.json({
      success: true,
      message: 'Personal rating removed successfully'
    });

  } catch (error) {
    console.error('Remove personal rating error:', error);
    res.status(500).json({
      error: 'Failed to remove personal rating',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/foods/triggers
 * Get all available trigger codes with Norwegian descriptions
 */
router.get('/triggers', async (req, res) => {
  try {
    // Official SIGHI trigger descriptions in Norwegian
    const triggerDescriptions = {
      'H!': 'Lett bedervelig - rask histamindannelse',
      'H': 'Høyt histamininnhold',
      'A': 'Andre biogene aminer',
      'L': 'Liberatorer av mastcellemediatorer (histamin-liberatorer)',
      'B': 'Blokkere av histaminnedbrytende enzymer (DAO-hemmere)'
    };
    
    const availableTriggers = ['H!', 'H', 'A', 'L', 'B'];
    
    res.json({
      success: true,
      data: { 
        triggers: triggerDescriptions,
        available: availableTriggers
      }
    });
    
  } catch (error) {
    console.error('Get triggers error:', error);
    res.status(500).json({
      error: 'Failed to retrieve trigger descriptions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generous rate limit for food detail fetching (used by diary page)
const foodDetailRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute (generous for bulk loading)
  message: { error: 'Too many food detail requests, please try again later' }
});

/**
 * GET /api/foods/:id
 * Get detailed food information by ID
 * Public endpoint
 */
router.get('/:id', foodDetailRateLimit, async (req, res) => {
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
    // Support H! (highly perishable) trigger as well as single letters
    if (!/^(H!|[HLABSTPNDC])$/.test(trigger)) {
      return res.status(400).json({ 
        error: 'Invalid trigger. Use H!, H, L, A, B, S, T, P, N, D, or C' 
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