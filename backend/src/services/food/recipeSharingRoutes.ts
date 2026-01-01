/**
 * Recipe Sharing Routes - Community recipe sharing API endpoints
 *
 * Endpoints for the shared recipes feature:
 * - GET /api/recipes/community - Browse public recipes
 * - GET /api/users/:userId/recipes - Get user's public recipes
 * - POST /api/recipes/:id/like - Like a recipe
 * - DELETE /api/recipes/:id/like - Unlike a recipe
 * - POST /api/recipes/:id/save-copy - Save copy of recipe
 * - GET /api/recipes/:id/public - Get recipe with extended info
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { userRecipeService } from './userRecipeService.js';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.js';

const router = Router();

// Rate limiting: 200 operations per 15 minutes (more lenient for browsing)
const sharingRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: 'For mange forespørsler. Prøv igjen om 15 minutter.',
  standardHeaders: true,
  legacyHeaders: false
});

// Zod validation schemas
const communityRecipesQuerySchema = z.object({
  sortBy: z.enum(['created_at', 'mcas_score', 'likes', 'times_made']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().max(255).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional()
});

const userRecipesQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional()
});

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
router.use(sharingRateLimiter);

/**
 * GET /api/recipes/community
 * Browse public recipes from community with pagination and filtering
 */
router.get(
  '/community',
  validateQuery(communityRecipesQuerySchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?.userId; // Optional for checking likes
      const params = req.query as {
        sortBy?: 'created_at' | 'mcas_score' | 'likes' | 'times_made';
        order?: 'asc' | 'desc';
        search?: string;
        page?: number;
        limit?: number;
      };

      const result = await userRecipeService.getPublicRecipes(params, currentUserId);

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/recipes/:id/like
 * Like a recipe
 */
router.post(
  '/:id/like',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const recipeId = parseInt(req.params.id, 10);

      if (isNaN(recipeId)) {
        return res.status(400).json({ error: 'Ugyldig oppskrift-ID' });
      }

      await userRecipeService.likeRecipe(recipeId, userId);
      const likesCount = await userRecipeService.getRecipeLikesCount(recipeId);

      res.json({
        message: 'Oppskrift likt',
        liked: true,
        likes_count: likesCount
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Recipe not found') {
          return res.status(404).json({ error: 'Oppskrift ikke funnet' });
        }
        if (error.message === 'Cannot like a private recipe') {
          return res.status(403).json({ error: 'Kan ikke like en privat oppskrift' });
        }
        if (error.message === 'Cannot like your own recipe') {
          return res.status(403).json({ error: 'Du kan ikke like din egen oppskrift' });
        }
      }
      next(error);
    }
  }
);

/**
 * DELETE /api/recipes/:id/like
 * Unlike a recipe
 */
router.delete(
  '/:id/like',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const recipeId = parseInt(req.params.id, 10);

      if (isNaN(recipeId)) {
        return res.status(400).json({ error: 'Ugyldig oppskrift-ID' });
      }

      await userRecipeService.unlikeRecipe(recipeId, userId);
      const likesCount = await userRecipeService.getRecipeLikesCount(recipeId);

      res.json({
        message: 'Like fjernet',
        liked: false,
        likes_count: likesCount
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/recipes/:id/save-copy
 * Save (copy) a shared recipe to user's collection
 */
router.post(
  '/:id/save-copy',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const recipeId = parseInt(req.params.id, 10);

      if (isNaN(recipeId)) {
        return res.status(400).json({ error: 'Ugyldig oppskrift-ID' });
      }

      const savedRecipe = await userRecipeService.saveRecipeCopy(recipeId, userId);

      res.status(201).json({
        message: 'Oppskrift lagret til dine oppskrifter',
        saved_recipe: savedRecipe
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Recipe not found') {
          return res.status(404).json({ error: 'Oppskrift ikke funnet' });
        }
        if (error.message === 'Cannot save a private recipe') {
          return res.status(403).json({ error: 'Kan ikke lagre en privat oppskrift' });
        }
        if (error.message === 'You already own this recipe') {
          return res.status(409).json({ error: 'Du eier allerede denne oppskriften' });
        }
      }
      next(error);
    }
  }
);

/**
 * GET /api/recipes/:id/public
 * Get recipe with extended info (for public recipe detail view)
 */
router.get(
  '/:id/public',
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const currentUserId = req.user?.userId;
      const recipeId = parseInt(req.params.id, 10);

      if (isNaN(recipeId)) {
        return res.status(400).json({ error: 'Ugyldig oppskrift-ID' });
      }

      const extendedInfo = await userRecipeService.getRecipeWithExtendedInfo(recipeId, currentUserId);

      res.json(extendedInfo);
    } catch (error) {
      if (error instanceof Error && error.message === 'Recipe not found') {
        return res.status(404).json({ error: 'Oppskrift ikke funnet' });
      }
      next(error);
    }
  }
);

/**
 * GET /api/users/:userId/recipes
 * Get user's public recipes (for profile page)
 */
router.get(
  '/users/:userId',
  validateQuery(userRecipesQuerySchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = parseInt(req.params.userId, 10);

      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Ugyldig bruker-ID' });
      }

      const { page = 1, limit = 20 } = req.query as { page?: number; limit?: number };

      const result = await userRecipeService.getUserPublicRecipes(userId, page, limit);

      res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        return res.status(404).json({ error: 'Bruker ikke funnet' });
      }
      next(error);
    }
  }
);

export default router;
