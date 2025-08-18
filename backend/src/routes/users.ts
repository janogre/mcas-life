import express from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';

const router = express.Router();

// Validation schemas
const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long').optional(),
  email: z.string().email('Invalid email format').optional(),
  preferences: z.object({
    language: z.enum(['no', 'en']).optional(),
    timezone: z.string().optional(),
    notifications: z.object({
      meal_reminders: z.boolean().optional(),
      symptom_tracking: z.boolean().optional(),
      supplement_reminders: z.boolean().optional()
    }).optional(),
    dietary_restrictions: z.array(z.string()).optional(),
    emergency_contacts: z.array(z.object({
      name: z.string(),
      phone: z.string(),
      relationship: z.string()
    })).optional()
  }).optional()
});

const approvedFoodSchema = z.object({
  sighi_id: z.number().optional(),
  name: z.string().min(1, 'Food name is required'),
  category: z.string().optional(),
  personal_notes: z.string().optional(),
  tolerance_level: z.enum(['excellent', 'good', 'moderate', 'poor']),
  tested_date: z.string().datetime().optional()
});

// Temporary in-memory storage (replace with database later)
const userProfiles: Array<{
  userId: string;
  preferences: any;
  updatedAt: Date;
}> = [];

const approvedFoods: Array<{
  id: string;
  userId: string;
  sighi_id?: number;
  name: string;
  category?: string;
  personal_notes?: string;
  tolerance_level: string;
  tested_date: Date;
  createdAt: Date;
  updatedAt: Date;
}> = [];

// GET /api/users/profile - Get user profile
router.get('/profile', (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    
    const profile = userProfiles.find(p => p.userId === req.user!.id);
    
    res.json({
      success: true,
      data: {
        user: req.user,
        preferences: profile?.preferences || {},
        last_updated: profile?.updatedAt || null
      }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/profile - Update user profile
router.put('/profile', (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    
    const profileData = updateProfileSchema.parse(req.body);
    
    const existingProfileIndex = userProfiles.findIndex(p => p.userId === req.user!.id);
    
    if (existingProfileIndex >= 0) {
      userProfiles[existingProfileIndex] = {
        userId: req.user.id,
        preferences: {
          ...userProfiles[existingProfileIndex].preferences,
          ...profileData.preferences
        },
        updatedAt: new Date()
      };
    } else {
      userProfiles.push({
        userId: req.user.id,
        preferences: profileData.preferences || {},
        updatedAt: new Date()
      });
    }
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        preferences: userProfiles.find(p => p.userId === req.user!.id)?.preferences
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/approved-foods - Get user's approved foods
router.get('/approved-foods', (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    
    const { category, tolerance_level, limit, offset } = req.query;
    
    let userFoods = approvedFoods.filter(food => food.userId === req.user!.id);
    
    // Apply filters
    if (category && typeof category === 'string') {
      userFoods = userFoods.filter(food => food.category === category);
    }
    
    if (tolerance_level && typeof tolerance_level === 'string') {
      userFoods = userFoods.filter(food => food.tolerance_level === tolerance_level);
    }
    
    // Sort by created date (newest first)
    userFoods.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    // Apply pagination
    const limitNum = limit ? parseInt(limit as string) : 50;
    const offsetNum = offset ? parseInt(offset as string) : 0;
    const total = userFoods.length;
    const paginatedFoods = userFoods.slice(offsetNum, offsetNum + limitNum);
    
    res.json({
      success: true,
      data: {
        approved_foods: paginatedFoods,
        pagination: {
          total,
          limit: limitNum,
          offset: offsetNum,
          hasMore: offsetNum + limitNum < total
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/users/approved-foods - Add approved food
router.post('/approved-foods', (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    
    const foodData = approvedFoodSchema.parse(req.body);
    
    const newApprovedFood = {
      id: `approved_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: req.user.id,
      sighi_id: foodData.sighi_id,
      name: foodData.name,
      category: foodData.category,
      personal_notes: foodData.personal_notes,
      tolerance_level: foodData.tolerance_level,
      tested_date: foodData.tested_date ? new Date(foodData.tested_date) : new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    approvedFoods.push(newApprovedFood);
    
    res.status(201).json({
      success: true,
      message: 'Approved food added successfully',
      data: { approved_food: newApprovedFood }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/users/approved-foods/:id - Update approved food
router.put('/approved-foods/:id', (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    
    const foodIndex = approvedFoods.findIndex(
      f => f.id === req.params.id && f.userId === req.user!.id
    );
    
    if (foodIndex === -1) {
      throw new NotFoundError('Approved food not found');
    }
    
    const foodData = approvedFoodSchema.parse(req.body);
    
    approvedFoods[foodIndex] = {
      ...approvedFoods[foodIndex],
      sighi_id: foodData.sighi_id,
      name: foodData.name,
      category: foodData.category,
      personal_notes: foodData.personal_notes,
      tolerance_level: foodData.tolerance_level,
      tested_date: foodData.tested_date ? new Date(foodData.tested_date) : approvedFoods[foodIndex].tested_date,
      updatedAt: new Date()
    };
    
    res.json({
      success: true,
      message: 'Approved food updated successfully',
      data: { approved_food: approvedFoods[foodIndex] }
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/users/approved-foods/:id - Remove approved food
router.delete('/approved-foods/:id', (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    
    const foodIndex = approvedFoods.findIndex(
      f => f.id === req.params.id && f.userId === req.user!.id
    );
    
    if (foodIndex === -1) {
      throw new NotFoundError('Approved food not found');
    }
    
    approvedFoods.splice(foodIndex, 1);
    
    res.json({
      success: true,
      message: 'Approved food removed successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/users/approved-foods/statistics - Get approved foods statistics
router.get('/approved-foods/statistics', (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    
    const userFoods = approvedFoods.filter(food => food.userId === req.user!.id);
    
    const stats = {
      total_approved_foods: userFoods.length,
      by_tolerance_level: {
        excellent: userFoods.filter(f => f.tolerance_level === 'excellent').length,
        good: userFoods.filter(f => f.tolerance_level === 'good').length,
        moderate: userFoods.filter(f => f.tolerance_level === 'moderate').length,
        poor: userFoods.filter(f => f.tolerance_level === 'poor').length
      },
      categories: [...new Set(userFoods.map(f => f.category).filter(Boolean))],
      last_added: userFoods.length > 0 ? 
        userFoods.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0].createdAt : null
    };
    
    res.json({
      success: true,
      data: { statistics: stats }
    });
  } catch (error) {
    next(error);
  }
});

export { router as usersRoutes };