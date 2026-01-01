/**
 * User Recipe Routes - API endpoints for custom user-created recipes
 *
 * Endpoints:
 * - POST /api/user-recipes - Create new recipe
 * - GET /api/user-recipes - Get all user's recipes (with sorting)
 * - GET /api/user-recipes/:id - Get single recipe
 * - PUT /api/user-recipes/:id - Update recipe
 * - DELETE /api/user-recipes/:id - Delete recipe
 * - POST /api/user-recipes/:id/increment-made - Increment times_made counter
 * - POST /api/user-recipes/:id/calculate-portions - Calculate portion ingredients
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { userRecipeService } from './userRecipeService.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.js';

const router = Router();

// Rate limiting: 100 operations per 15 minutes
const recipeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'For mange oppskriftsoperasjoner. Prøv igjen om 15 minutter.',
  standardHeaders: true,
  legacyHeaders: false
});

// Zod validation schemas
const recipeIngredientSchema = z.object({
  food_id: z.number().int().positive({ message: 'food_id må være et positivt heltall' }),
  amount: z.number().positive({ message: 'Mengde må være positiv' }),
  unit: z.enum(['g', 'kg', 'ml', 'dl', 'l', 'stk', 'ss', 'ts', 'kopp'], {
    errorMap: () => ({ message: 'Ugyldig enhet' })
  }),
  custom_name: z.string().max(255, 'Tilpasset navn kan ikke være lengre enn 255 tegn').optional()
});

const createRecipeSchema = z.object({
  title: z.string()
    .min(1, 'Tittel er påkrevd')
    .max(255, 'Tittel kan ikke være lengre enn 255 tegn'),
  description: z.string().max(1000, 'Beskrivelse kan ikke være lengre enn 1000 tegn').optional(),
  prep_time_minutes: z.number().int().min(0).max(1440).optional(),
  servings: z.number().int().min(1, 'Oppskriften må gi minst 1 porsjon').max(100),
  ingredients: z.array(recipeIngredientSchema)
    .min(1, 'Oppskriften må ha minst 1 ingrediens')
    .max(30, 'Oppskriften kan ikke ha mer enn 30 ingredienser'),
  instructions: z.string().max(5000, 'Instruksjoner kan ikke være lengre enn 5000 tegn').optional(),
  notes: z.string().max(1000, 'Notater kan ikke være lengre enn 1000 tegn').optional()
});

const updateRecipeSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  prep_time_minutes: z.number().int().min(0).max(1440).optional(),
  servings: z.number().int().min(1).max(100).optional(),
  ingredients: z.array(recipeIngredientSchema).min(1).max(30).optional(),
  instructions: z.string().max(5000).optional(),
  notes: z.string().max(1000).optional()
});

const recipeSortOptionsSchema = z.object({
  sortBy: z.enum(['created_at', 'times_made', 'mcas_score']).optional(),
  order: z.enum(['asc', 'desc']).optional()
});

const calculatePortionsSchema = z.object({
  portions_consumed: z.number()
    .positive('Porsjoner må være positiv')
    .min(0.25, 'Minimum porsjon er 0.25')
    .max(20, 'Maksimum porsjoner er 20')
});

// Sharing feature schema
const toggleSharingSchema = z.object({
  is_public: z.boolean()
});

// Middleware for validating request body
const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Valideringsfeil',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
};

// Middleware for validating query parameters
const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Valideringsfeil i query-parametere',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
};

// Apply authentication and rate limiting to all routes
router.use(authMiddleware);
router.use(recipeRateLimiter);

/**
 * POST /api/user-recipes
 * Create new recipe with automatic MCAS calculation
 */
router.post(
  '/',
  validateBody(createRecipeSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const recipe = await userRecipeService.createRecipe(userId, req.body);

      res.status(201).json({
        message: 'Oppskrift opprettet',
        recipe
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/user-recipes
 * Get all user's recipes with optional sorting
 */
router.get(
  '/',
  validateQuery(recipeSortOptionsSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const options = req.query as { sortBy?: 'created_at' | 'times_made' | 'mcas_score', order?: 'asc' | 'desc' };

      const recipes = await userRecipeService.getUserRecipes(userId, options);

      res.json({
        recipes,
        count: recipes.length
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/user-recipes/:id
 * Get single recipe by ID
 */
router.get(
  '/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const recipeId = parseInt(req.params.id, 10);

      if (isNaN(recipeId)) {
        return res.status(400).json({ error: 'Ugyldig oppskrift-ID' });
      }

      const recipe = await userRecipeService.getRecipeById(userId, recipeId);

      if (!recipe) {
        return res.status(404).json({ error: 'Oppskrift ikke funnet' });
      }

      console.log('🔍 Recipe ingredients:', JSON.stringify(recipe.ingredients, null, 2));
      res.json({ recipe });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/user-recipes/:id
 * Update recipe and recalculate MCAS score if ingredients changed
 */
router.put(
  '/:id',
  validateBody(updateRecipeSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const recipeId = parseInt(req.params.id, 10);

      if (isNaN(recipeId)) {
        return res.status(400).json({ error: 'Ugyldig oppskrift-ID' });
      }

      const recipe = await userRecipeService.updateRecipe(userId, recipeId, req.body);

      res.json({
        message: 'Oppskrift oppdatert',
        recipe
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Recipe not found') {
        return res.status(404).json({ error: 'Oppskrift ikke funnet' });
      }
      next(error);
    }
  }
);

/**
 * DELETE /api/user-recipes/:id
 * Delete recipe
 */
router.delete(
  '/:id',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const recipeId = parseInt(req.params.id, 10);

      if (isNaN(recipeId)) {
        return res.status(400).json({ error: 'Ugyldig oppskrift-ID' });
      }

      const deleted = await userRecipeService.deleteRecipe(userId, recipeId);

      if (!deleted) {
        return res.status(404).json({ error: 'Oppskrift ikke funnet' });
      }

      res.json({ message: 'Oppskrift slettet' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/user-recipes/:id/increment-made
 * Increment times_made counter when recipe is used for meal logging
 */
router.post(
  '/:id/increment-made',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const recipeId = parseInt(req.params.id, 10);

      if (isNaN(recipeId)) {
        return res.status(400).json({ error: 'Ugyldig oppskrift-ID' });
      }

      await userRecipeService.incrementTimesMade(userId, recipeId);

      res.json({ message: 'Teller oppdatert' });
    } catch (error) {
      if (error instanceof Error && error.message === 'Recipe not found') {
        return res.status(404).json({ error: 'Oppskrift ikke funnet' });
      }
      next(error);
    }
  }
);

/**
 * POST /api/user-recipes/:id/calculate-portions
 * Calculate ingredient amounts for specified portions (preview before meal logging)
 */
router.post(
  '/:id/calculate-portions',
  validateBody(calculatePortionsSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const recipeId = parseInt(req.params.id, 10);

      if (isNaN(recipeId)) {
        return res.status(400).json({ error: 'Ugyldig oppskrift-ID' });
      }

      const recipe = await userRecipeService.getRecipeById(userId, recipeId);

      if (!recipe) {
        return res.status(404).json({ error: 'Oppskrift ikke funnet' });
      }

      const portionIngredients = userRecipeService.calculatePortionIngredients(
        recipe,
        req.body.portions_consumed
      );

      res.json({
        recipe_title: recipe.title,
        total_servings: recipe.servings,
        portions_consumed: req.body.portions_consumed,
        ingredients: portionIngredients
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== SHARING FEATURE ROUTE ====================

/**
 * PUT /api/user-recipes/:id/sharing
 * Toggle recipe sharing (public/private)
 */
router.put(
  '/:id/sharing',
  validateBody(toggleSharingSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const recipeId = parseInt(req.params.id, 10);

      if (isNaN(recipeId)) {
        return res.status(400).json({ error: 'Ugyldig oppskrift-ID' });
      }

      const recipe = await userRecipeService.toggleRecipeSharing(recipeId, userId, req.body.is_public);

      res.json({
        message: req.body.is_public ? 'Oppskrift er nå offentlig' : 'Oppskrift er nå privat',
        recipe
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Recipe not found') {
        return res.status(404).json({ error: 'Oppskrift ikke funnet' });
      }
      next(error);
    }
  }
);

export default router;
