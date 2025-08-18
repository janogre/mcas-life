import express from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';

const router = express.Router();

// Validation schemas
const diaryEntrySchema = z.object({
  type: z.enum(['meal', 'symptom', 'supplement', 'health_metric']),
  timestamp: z.string().datetime().optional(),
  data: z.object({
    // Meal data
    foods: z.array(z.object({
      sighi_id: z.number().optional(),
      name: z.string(),
      amount: z.string().optional(),
      unit: z.string().optional()
    })).optional(),
    
    // Symptom data
    symptom_type: z.string().optional(),
    severity: z.number().min(1).max(10).optional(),
    duration_minutes: z.number().optional(),
    description: z.string().optional(),
    
    // Supplement data
    supplement_name: z.string().optional(),
    dosage: z.string().optional(),
    supplement_type: z.string().optional(),
    
    // Health metric data
    metric_type: z.enum(['sleep', 'energy', 'stress', 'mood', 'general_wellbeing']).optional(),
    value: z.number().min(1).max(10).optional(),
    notes: z.string().optional()
  })
});

// Temporary in-memory storage (replace with database later)
const diaryEntries: Array<{
  id: string;
  userId: string;
  type: string;
  timestamp: Date;
  data: any;
  createdAt: Date;
  updatedAt: Date;
}> = [];

// GET /api/diary/entries - Get user's diary entries
router.get('/entries', (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    
    const { type, date, limit, offset } = req.query;
    
    let userEntries = diaryEntries.filter(entry => entry.userId === req.user!.id);
    
    // Filter by type
    if (type && typeof type === 'string') {
      userEntries = userEntries.filter(entry => entry.type === type);
    }
    
    // Filter by date
    if (date && typeof date === 'string') {
      const targetDate = new Date(date);
      userEntries = userEntries.filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate.toDateString() === targetDate.toDateString();
      });
    }
    
    // Sort by timestamp (newest first)
    userEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Apply pagination
    const limitNum = limit ? parseInt(limit as string) : 50;
    const offsetNum = offset ? parseInt(offset as string) : 0;
    const total = userEntries.length;
    const paginatedEntries = userEntries.slice(offsetNum, offsetNum + limitNum);
    
    res.json({
      success: true,
      data: {
        entries: paginatedEntries,
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

// POST /api/diary/entries - Create new diary entry
router.post('/entries', (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    
    const entryData = diaryEntrySchema.parse(req.body);
    
    const newEntry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: req.user.id,
      type: entryData.type,
      timestamp: entryData.timestamp ? new Date(entryData.timestamp) : new Date(),
      data: entryData.data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    diaryEntries.push(newEntry);
    
    res.status(201).json({
      success: true,
      message: 'Diary entry created successfully',
      data: { entry: newEntry }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/diary/entries/:id - Get specific diary entry
router.get('/entries/:id', (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    
    const entry = diaryEntries.find(
      e => e.id === req.params.id && e.userId === req.user!.id
    );
    
    if (!entry) {
      throw new NotFoundError('Diary entry not found');
    }
    
    res.json({
      success: true,
      data: { entry }
    });
  } catch (error) {
    next(error);
  }
});

// PUT /api/diary/entries/:id - Update diary entry
router.put('/entries/:id', (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    
    const entryIndex = diaryEntries.findIndex(
      e => e.id === req.params.id && e.userId === req.user!.id
    );
    
    if (entryIndex === -1) {
      throw new NotFoundError('Diary entry not found');
    }
    
    const entryData = diaryEntrySchema.parse(req.body);
    
    diaryEntries[entryIndex] = {
      ...diaryEntries[entryIndex],
      type: entryData.type,
      timestamp: entryData.timestamp ? new Date(entryData.timestamp) : diaryEntries[entryIndex].timestamp,
      data: entryData.data,
      updatedAt: new Date()
    };
    
    res.json({
      success: true,
      message: 'Diary entry updated successfully',
      data: { entry: diaryEntries[entryIndex] }
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/diary/entries/:id - Delete diary entry
router.delete('/entries/:id', (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    
    const entryIndex = diaryEntries.findIndex(
      e => e.id === req.params.id && e.userId === req.user!.id
    );
    
    if (entryIndex === -1) {
      throw new NotFoundError('Diary entry not found');
    }
    
    diaryEntries.splice(entryIndex, 1);
    
    res.json({
      success: true,
      message: 'Diary entry deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/diary/statistics - Get user's diary statistics
router.get('/statistics', (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }
    
    const userEntries = diaryEntries.filter(entry => entry.userId === req.user!.id);
    
    const stats = {
      total_entries: userEntries.length,
      entries_by_type: {
        meal: userEntries.filter(e => e.type === 'meal').length,
        symptom: userEntries.filter(e => e.type === 'symptom').length,
        supplement: userEntries.filter(e => e.type === 'supplement').length,
        health_metric: userEntries.filter(e => e.type === 'health_metric').length
      },
      last_entry: userEntries.length > 0 ? 
        userEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0].timestamp : null
    };
    
    res.json({
      success: true,
      data: { statistics: stats }
    });
  } catch (error) {
    next(error);
  }
});

export { router as diaryRoutes };