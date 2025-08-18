import express from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to SIGHI data file
const SIGHI_DATA_PATH = path.join(__dirname, '../../..', 'database', 'sighi-foods-data.json');

// Validation schemas
const searchQuerySchema = z.object({
  q: z.string().optional(),
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

// Load SIGHI data
let sighiData: any = null;

function loadSighiData() {
  try {
    if (!fs.existsSync(SIGHI_DATA_PATH)) {
      throw new Error('SIGHI data file not found');
    }
    
    const rawData = fs.readFileSync(SIGHI_DATA_PATH, 'utf8');
    sighiData = JSON.parse(rawData);
    console.log(`✅ Loaded ${sighiData.foods.length} SIGHI foods`);
  } catch (error) {
    console.error('❌ Error loading SIGHI data:', error);
    throw error;
  }
}

// Initialize data on startup
loadSighiData();

// GET /api/sighi/foods - Search foods
router.get('/foods', (req, res, next) => {
  try {
    const query = searchQuerySchema.parse(req.query);
    
    if (!sighiData) {
      throw new Error('SIGHI data not loaded');
    }
    
    let foods = [...sighiData.foods];
    
    // Apply search filter
    if (query.q) {
      const searchTerm = query.q.toLowerCase();
      foods = foods.filter(food => 
        food.name_no.toLowerCase().includes(searchTerm) ||
        food.name_en.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply category filter
    if (query.category) {
      foods = foods.filter(food => 
        food.category.toLowerCase() === query.category.toLowerCase()
      );
    }
    
    // Apply compatibility filter
    if (query.compatibility !== undefined) {
      foods = foods.filter(food => food.compatibility === query.compatibility);
    }
    
    // Apply triggers filter
    if (query.triggers) {
      const triggerFilter = query.triggers.toUpperCase();
      foods = foods.filter(food => 
        food.triggers.includes(triggerFilter)
      );
    }
    
    // Apply pagination
    const total = foods.length;
    const offset = query.offset || 0;
    const limit = query.limit || 50;
    const paginatedFoods = foods.slice(offset, offset + limit);
    
    res.json({
      success: true,
      data: {
        foods: paginatedFoods,
        pagination: {
          total,
          offset,
          limit,
          hasMore: offset + limit < total
        },
        filters: {
          query: query.q,
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

// GET /api/sighi/foods/:id - Get single food by ID
router.get('/foods/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      throw new ValidationError('Invalid food ID');
    }
    
    if (!sighiData) {
      throw new Error('SIGHI data not loaded');
    }
    
    const food = sighiData.foods.find((f: any) => f.id === id);
    
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

// GET /api/sighi/categories - Get all categories
router.get('/categories', (req, res, next) => {
  try {
    if (!sighiData) {
      throw new Error('SIGHI data not loaded');
    }
    
    const categories = sighiData.metadata.categories || [];
    
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
    if (!sighiData) {
      throw new Error('SIGHI data not loaded');
    }
    
    const triggers = sighiData.metadata.triggers || {};
    const triggersFound = sighiData.metadata.triggers_found || [];
    
    res.json({
      success: true,
      data: { 
        triggers,
        available: triggersFound
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/sighi/stats - Get statistics about the SIGHI database
router.get('/stats', (req, res, next) => {
  try {
    if (!sighiData) {
      throw new Error('SIGHI data not loaded');
    }
    
    const stats = {
      total_foods: sighiData.metadata.total_foods,
      categories_count: sighiData.metadata.categories_count,
      compatibility_distribution: sighiData.metadata.compatibility_distribution,
      triggers_found: sighiData.metadata.triggers_found,
      last_updated: sighiData.metadata.extracted_at
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
router.get('/metadata', (req, res, next) => {
  try {
    if (!sighiData) {
      throw new Error('SIGHI data not loaded');
    }
    
    res.json({
      success: true,
      data: { metadata: sighiData.metadata }
    });
  } catch (error) {
    next(error);
  }
});

export { router as sighiRoutes };