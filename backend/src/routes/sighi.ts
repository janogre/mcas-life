import express from 'express';
import { z } from 'zod';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { db } from '../db/connection.js';
import { foods } from '../db/schema.js';
import { eq, like, or, sql, and } from 'drizzle-orm';

const router = express.Router();

// Validation schemas
const searchQuerySchema = z.object({
  q: z.string().optional(),
  search: z.string().optional(), // Alternative name for query
  category: z.string().optional(),
  compatibility: z.string().transform((val) => {
    if (val === undefined || val === '') return undefined;
    const num = parseInt(val);
    if (isNaN(num) || num < 0 || num > 3) {
      throw new Error('Compatibility must be between 0 and 3');
    }
    return num;
  }).optional(),
  triggers: z.string().optional(),
  limit: z.string().transform((val) => {
    if (val === undefined || val === '') return 50;
    const num = parseInt(val);
    if (isNaN(num) || num < 1 || num > 1000) {
      throw new Error('Limit must be between 1 and 1000');
    }
    return num;
  }).optional(),
  offset: z.string().transform((val) => {
    if (val === undefined || val === '') return 0;
    const num = parseInt(val);
    if (isNaN(num) || num < 0) {
      throw new Error('Offset must be 0 or greater');
    }
    return num;
  }).optional()
});

// GET /api/sighi/foods - Search foods from database
router.get('/foods', async (req, res, next) => {
  try {
    // Disable ETag caching to ensure fresh data after schema changes
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const query = searchQuerySchema.parse(req.query);
    const searchTerm = query.q || query.search;

    // Build query conditions
    const conditions = [];

    // Search filter (Norwegian or English name)
    if (searchTerm) {
      conditions.push(
        or(
          like(foods.name_no, `%${searchTerm}%`),
          like(foods.name_en, `%${searchTerm}%`)
        )
      );
    }

    // Category filter
    if (query.category) {
      conditions.push(eq(foods.category, query.category));
    }

    // Compatibility filter (convert to string for enum)
    if (query.compatibility !== undefined) {
      conditions.push(eq(foods.compatibility, query.compatibility.toString()));
    }

    // Triggers filter - check if JSONB array contains trigger
    if (query.triggers) {
      const triggerFilter = query.triggers.toUpperCase();
      conditions.push(
        sql`${foods.triggers}::jsonb @> ${JSON.stringify([triggerFilter])}::jsonb`
      );
    }

    // Get total count
    const countQuery = conditions.length > 0
      ? db.select({ count: sql<number>`count(*)` }).from(foods).where(and(...conditions))
      : db.select({ count: sql<number>`count(*)` }).from(foods);

    const [{ count: total }] = await countQuery;

    // Get paginated results
    const offset = query.offset || 0;
    const limit = query.limit || 50;

    const foodsQuery = conditions.length > 0
      ? db.select().from(foods).where(and(...conditions)).limit(limit).offset(offset)
      : db.select().from(foods).limit(limit).offset(offset);

    const foodsResult = await foodsQuery;

    // Debug: Log first food to check if display names are included
    if (foodsResult.length > 0) {
      console.log('🔍 First food result:', {
        id: foodsResult[0].id,
        name_en: foodsResult[0].name_en,
        display_name_en: foodsResult[0].display_name_en,
        display_name_no: foodsResult[0].display_name_no,
        sighi_uncertainty_level: foodsResult[0].sighi_uncertainty_level
      });
    }

    res.json({
      success: true,
      data: {
        foods: foodsResult,
        pagination: {
          total,
          offset,
          limit,
          hasMore: offset + limit < total
        },
        filters: {
          query: searchTerm,
          category: query.category,
          compatibility: query.compatibility,
          triggers: query.triggers
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      next(new ValidationError('Invalid search parameters'));
    } else {
      next(error);
    }
  }
});

// GET /api/sighi/foods/:id - Get single food by ID from database
router.get('/foods/:id', async (req, res, next) => {
  try {
    // Disable ETag caching to ensure fresh data after schema changes
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      throw new ValidationError('Invalid food ID');
    }

    const [food] = await db.select().from(foods).where(eq(foods.id, id)).limit(1);

    if (!food) {
      throw new NotFoundError('Food not found');
    }

    res.json({
      success: true,
      data: { food }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/sighi/categories - Get all categories from database
router.get('/categories', async (req, res, next) => {
  try {
    const categoriesResult = await db
      .selectDistinct({ category: foods.category })
      .from(foods)
      .orderBy(foods.category);

    const categories = categoriesResult.map(row => row.category);

    res.json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/sighi/triggers - Get all triggers with descriptions
router.get('/triggers', (req, res, next) => {
  try {
    // SIGHI trigger descriptions from official PDF
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
    next(error);
  }
});

// GET /api/sighi/stats - Get statistics about the SIGHI database
router.get('/stats', async (req, res, next) => {
  try {
    // Get total foods count
    const [{ count: totalFoods }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(foods);

    // Get categories count
    const categoriesResult = await db
      .selectDistinct({ category: foods.category })
      .from(foods);
    const categoriesCount = categoriesResult.length;

    // Get compatibility distribution
    const compatibilityDistribution = await db
      .select({
        compatibility: foods.compatibility,
        count: sql<number>`count(*)`
      })
      .from(foods)
      .groupBy(foods.compatibility);

    // Get unique triggers
    const triggersResult = await db
      .select({ triggers: foods.triggers })
      .from(foods);

    const uniqueTriggers = new Set<string>();
    triggersResult.forEach(row => {
      if (Array.isArray(row.triggers)) {
        row.triggers.forEach(trigger => uniqueTriggers.add(trigger));
      }
    });

    const stats = {
      total_foods: totalFoods,
      categories_count: categoriesCount,
      compatibility_distribution: Object.fromEntries(
        compatibilityDistribution.map(d => [d.compatibility, d.count])
      ),
      triggers_found: Array.from(uniqueTriggers),
      last_updated: new Date().toISOString()
    };

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/sighi/metadata - Get full metadata
router.get('/metadata', async (req, res, next) => {
  try {
    // Get comprehensive metadata from database
    const [{ count: totalFoods }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(foods);

    const categoriesResult = await db
      .selectDistinct({ category: foods.category })
      .from(foods);

    const metadata = {
      total_foods: totalFoods,
      categories: categoriesResult.map(r => r.category),
      categories_count: categoriesResult.length,
      source: 'SIGHI Database',
      version: '1.0',
      last_updated: new Date().toISOString()
    };

    res.json({
      success: true,
      data: { metadata }
    });
  } catch (error) {
    next(error);
  }
});

export { router as sighiRoutes };