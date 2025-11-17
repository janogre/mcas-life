/**
 * Recipe Routes - MCAS-Life Recipe API Endpoints
 *
 * RESTful API endpoints for recipe management:
 * - Search recipes by Safe Foods ingredients
 * - Get recipe details from Spoonacular
 * - Save/manage favorite recipes
 * - Get AI-powered recipe suggestions
 */

import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { recipeService } from './recipeService.js';
import { authenticateToken } from '../auth/authMiddleware.js';

const router = Router();

// Rate limiting for recipe endpoints (Spoonacular has API quotas)
const recipeSearchRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 searches per hour per user
  message: { error: 'Too many recipe searches. Please try again later.' }
});

const recipeSaveRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 saves per 15 minutes
  message: { error: 'Too many recipe saves. Please slow down.' }
});

// Validation schemas
const RecipeSearchSchema = z.object({
  ingredients: z.array(z.string().min(1).max(100)).min(1).max(20),
  number: z.number().min(1).max(20).optional(),
  ranking: z.union([z.literal(1), z.literal(2), z.enum(['1', '2'])]).optional(),
  ignorePantry: z.boolean().optional()
});

const SaveRecipeSchema = z.object({
  spoonacularRecipeId: z.number().int().positive(),
  recipeData: z.object({
    id: z.number(),
    title: z.string(),
    image: z.string().optional(),
    readyInMinutes: z.number().optional(),
    servings: z.number().optional(),
    sourceUrl: z.string().optional(),
    summary: z.string().optional()
  }),
  mcasScore: z.number().min(0).max(100),
  notes: z.string().max(1000).optional()
});

const UpdateSavedRecipeSchema = z.object({
  notes: z.string().max(1000).optional(),
  timesMade: z.number().int().min(0).optional()
});

/**
 * POST /api/recipes/search
 * Search recipes based on Safe Foods ingredients
 * Requires authentication
 */
router.post('/search', authenticateToken, recipeSearchRateLimit, async (req, res) => {
  try {
    console.log('🔍 Recipe search request body:', req.body);

    const validation = RecipeSearchSchema.safeParse(req.body);
    if (!validation.success) {
      console.error('❌ Validation failed:', validation.error.errors);
      return res.status(400).json({
        error: 'Invalid search parameters',
        details: validation.error.errors
      });
    }

    const userId = req.user!.userId;
    const { ingredients, number, ranking, ignorePantry } = validation.data;

    console.log('✅ Validated data:', { ingredients, number, ranking, ignorePantry, userId });

    const result = await recipeService.searchRecipesByIngredients({
      ingredients,
      number,
      ranking: ranking ? parseInt(ranking) as 1 | 2 : undefined,
      ignorePantry,
      userId
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Recipe search error:', error);
    res.status(500).json({
      error: 'Failed to search recipes',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/recipes/suggest
 * Get AI-powered recipe suggestions based on user's Safe Foods
 * Requires authentication
 */
router.get('/suggest', authenticateToken, recipeSearchRateLimit, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const maxRecipes = req.query.number ? parseInt(req.query.number as string) : 10;

    const suggestions = await recipeService.getRecipeSuggestions(userId, maxRecipes);

    res.json({
      success: true,
      data: suggestions,
      message: 'Recipe suggestions based on your most consumed safe foods'
    });

  } catch (error) {
    console.error('Recipe suggestions error:', error);
    res.status(500).json({
      error: 'Failed to get recipe suggestions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/recipes/:id
 * Get detailed recipe information from Spoonacular
 * Requires authentication
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    if (isNaN(recipeId)) {
      return res.status(400).json({ error: 'Invalid recipe ID' });
    }

    const recipeDetails = await recipeService.getRecipeDetails(recipeId);

    res.json({
      success: true,
      data: recipeDetails
    });

  } catch (error) {
    console.error('Get recipe details error:', error);
    res.status(500).json({
      error: 'Failed to retrieve recipe details',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/recipes/saved/all
 * Get user's saved recipes
 * Requires authentication
 */
router.get('/saved/all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const savedRecipes = await recipeService.getSavedRecipes(userId);

    res.json({
      success: true,
      data: savedRecipes
    });

  } catch (error) {
    console.error('Get saved recipes error:', error);
    res.status(500).json({
      error: 'Failed to retrieve saved recipes',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/recipes/saved
 * Save a recipe to user's collection
 * Requires authentication
 */
router.post('/saved', authenticateToken, recipeSaveRateLimit, async (req, res) => {
  try {
    const validation = SaveRecipeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid recipe data',
        details: validation.error.errors
      });
    }

    const userId = req.user!.userId;
    const savedRecipe = await recipeService.saveRecipe({
      userId,
      ...validation.data
    });

    res.status(201).json({
      success: true,
      data: savedRecipe,
      message: 'Recipe saved successfully'
    });

  } catch (error) {
    console.error('Save recipe error:', error);

    if (error instanceof Error && error.message.includes('already saved')) {
      return res.status(409).json({
        error: 'Recipe already saved',
        message: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to save recipe',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/recipes/saved/:id
 * Update saved recipe (notes, times made)
 * Requires authentication
 */
router.put('/saved/:id', authenticateToken, async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    if (isNaN(recipeId)) {
      return res.status(400).json({ error: 'Invalid recipe ID' });
    }

    const validation = UpdateSavedRecipeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid update data',
        details: validation.error.errors
      });
    }

    const userId = req.user!.userId;
    const updatedRecipe = await recipeService.updateSavedRecipe(
      userId,
      recipeId,
      validation.data
    );

    if (!updatedRecipe) {
      return res.status(404).json({ error: 'Saved recipe not found or not owned by user' });
    }

    res.json({
      success: true,
      data: updatedRecipe,
      message: 'Recipe updated successfully'
    });

  } catch (error) {
    console.error('Update saved recipe error:', error);
    res.status(500).json({
      error: 'Failed to update recipe',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/recipes/saved/:id
 * Delete saved recipe
 * Requires authentication
 */
router.delete('/saved/:id', authenticateToken, async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    if (isNaN(recipeId)) {
      return res.status(400).json({ error: 'Invalid recipe ID' });
    }

    const userId = req.user!.userId;
    const success = await recipeService.deleteSavedRecipe(userId, recipeId);

    if (!success) {
      return res.status(404).json({ error: 'Saved recipe not found or not owned by user' });
    }

    res.json({
      success: true,
      message: 'Recipe deleted successfully'
    });

  } catch (error) {
    console.error('Delete saved recipe error:', error);
    res.status(500).json({
      error: 'Failed to delete recipe',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/recipes/saved/:id/increment-made
 * Increment times made counter for a saved recipe
 * Requires authentication
 */
router.post('/saved/:id/increment-made', authenticateToken, async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id);
    if (isNaN(recipeId)) {
      return res.status(400).json({ error: 'Invalid recipe ID' });
    }

    const userId = req.user!.userId;

    // Get current recipe
    const savedRecipes = await recipeService.getSavedRecipes(userId);
    const currentRecipe = savedRecipes.find(r => r.id === recipeId);

    if (!currentRecipe) {
      return res.status(404).json({ error: 'Saved recipe not found' });
    }

    // Increment times made
    const updatedRecipe = await recipeService.updateSavedRecipe(
      userId,
      recipeId,
      { timesMade: currentRecipe.times_made + 1 }
    );

    res.json({
      success: true,
      data: updatedRecipe,
      message: 'Times made incremented'
    });

  } catch (error) {
    console.error('Increment times made error:', error);
    res.status(500).json({
      error: 'Failed to increment times made',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware for this router
router.use((error: Error, req: any, res: any, next: any) => {
  console.error('Recipe router error:', error);
  res.status(500).json({
    error: 'Internal server error in recipe service',
    message: process.env['NODE_ENV'] === 'development' ? error.message : 'Something went wrong'
  });
});

export { router as recipeRoutes };
