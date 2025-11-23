import express from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { MealDiaryService } from '../services/diary/mealDiaryService.js';
import { SupplementDiaryService } from '../services/diary/supplementDiaryService.js';
import { SymptomService } from '../services/symptoms/symptomService.js';

const router = express.Router();

// Generous rate limit for diary operations (frequently accessed)
const diaryRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // 200 requests per minute
  message: { error: 'Too many diary requests, please try again later' }
});

// Validation schemas
const mealEntrySchema = z.object({
  type: z.literal('meal'),
  timestamp: z.string().datetime().optional(),
  data: z.object({
    food_id: z.number().optional(), // Single food (legacy support)
    amount: z.number().optional(), // Single amount (legacy support)
    preparation_method: z.string().optional(),
    meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'evening']),
    meal_name: z.string().optional(),
    meal_time: z.string().optional(),
    foods: z.array(z.object({
      sighi_id: z.number(),
      name: z.string(),
      amount: z.string(),
      unit: z.string()
    })).optional(), // Multiple foods (new format)
    notes: z.string().optional()
  })
});

const supplementEntrySchema = z.object({
  type: z.literal('supplement'),
  timestamp: z.string().datetime().optional(),
  data: z.object({
    name: z.string(),
    type: z.enum(['antihistamine', 'mast_cell_stabilizer', 'dao_supplement', 'probiotic', 'vitamin', 'mineral', 'herbal', 'prescription', 'other']),
    brand: z.string().optional(),
    dosage_amount: z.number(),
    dosage_unit: z.string(),
    frequency: z.string(),
    next_dose_due: z.string().datetime().optional(),
    intended_for: z.array(z.string()).optional(),
    effectiveness_rating: z.number().min(1).max(10).optional(),
    side_effects: z.array(z.string()).optional(),
    missed_dose: z.boolean().optional(),
    late_dose: z.boolean().optional(),
    notes: z.string().optional()
  })
});

const symptomEntrySchema = z.object({
  type: z.literal('symptom'),
  timestamp: z.string().datetime().optional(),
  data: z.object({
    category: z.enum(['skin', 'digestive', 'respiratory', 'cardiovascular', 'neurological', 'musculoskeletal', 'genitourinary', 'systemic']),
    type: z.string(),
    severity: z.number().min(1).max(10),
    duration_minutes: z.number().optional(),
    notes: z.string().optional()
  })
});

const diaryEntrySchema = z.discriminatedUnion('type', [
  mealEntrySchema,
  supplementEntrySchema,
  symptomEntrySchema
]);

// GET /api/diary/entries - Get user's diary entries
router.get('/entries', diaryRateLimit, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const { type, startDate, endDate, date, limit, offset } = req.query;

    const userId = req.user.userId;
    const limitNum = limit ? parseInt(limit as string) : 50;
    const offsetNum = offset ? parseInt(offset as string) : 0;

    let entries: any[] = [];

    // Parse date filters if provided
    let startDateObj: Date | undefined;
    let endDateObj: Date | undefined;

    if (date) {
      // Single date query: get entries for that specific day (00:00:00 to 23:59:59)
      startDateObj = new Date(date as string);
      startDateObj.setHours(0, 0, 0, 0);
      endDateObj = new Date(date as string);
      endDateObj.setHours(23, 59, 59, 999);
    } else {
      // Range query: use startDate and endDate
      startDateObj = startDate ? new Date(startDate as string) : undefined;
      endDateObj = endDate ? new Date(endDate as string) : undefined;
    }

    if (type === 'meal' || !type) {
      const meals = await MealDiaryService.getMealEntries(userId, {
        startDate: startDateObj,
        endDate: endDateObj,
        limit: type === 'meal' ? limitNum : 20,
        offset: type === 'meal' ? offsetNum : 0
      });
      entries.push(...meals.map(m => ({
        id: m.id,
        userId: m.user_id,
        type: 'meal',
        timestamp: m.consumed_at,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
        data: {
          meal_type: m.meal_type,
          meal_time: m.consumed_at ? new Date(m.consumed_at).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }) : undefined,
          foods: [{
            sighi_id: m.food_id,
            name: (m as any).food?.name_en || (m as any).food?.name_no || 'Unknown',
            amount: m.amount?.toString() || '',
            unit: 'g'
          }],
          preparation_method: m.preparation_method,
          notes: m.notes,
          estimated_histamine_load: m.estimated_histamine_load,
          trigger_score: m.trigger_score
        }
      })));
    }

    if (type === 'supplement' || !type) {
      const supplements = await SupplementDiaryService.getSupplementEntries(userId, {
        startDate: startDateObj,
        endDate: endDateObj,
        limit: type === 'supplement' ? limitNum : 20,
        offset: type === 'supplement' ? offsetNum : 0
      });
      entries.push(...supplements.map(s => ({
        id: s.id,
        userId: s.user_id,
        type: 'supplement',
        timestamp: s.taken_at,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        data: {
          supplement_name: s.name,
          supplement_type: s.type,
          brand: s.brand,
          dosage: `${s.dosage_amount} ${s.dosage_unit}`,
          frequency: s.frequency,
          effectiveness_rating: s.effectiveness_rating,
          side_effects: s.side_effects,
          notes: s.notes
        }
      })));
    }

    if (type === 'symptom' || !type) {
      const symptoms = await SymptomService.getSymptomHistory(userId, {
        startDate: startDateObj?.toISOString().split('T')[0],
        endDate: endDateObj?.toISOString().split('T')[0],
        limit: type === 'symptom' ? limitNum : 20
      });
      entries.push(...symptoms.map(s => ({
        id: s.id,
        userId: s.user_id,
        type: 'symptom',
        timestamp: s.started_at,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        data: {
          symptom_type: s.type,
          category: s.category,
          severity: s.severity,
          duration_minutes: s.duration_minutes,
          description: s.notes,
          notes: s.notes
        }
      })));
    }

    // Sort by timestamp (newest first)
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply pagination if not filtered by type
    if (!type) {
      const total = entries.length;
      entries = entries.slice(offsetNum, offsetNum + limitNum);

      res.json({
        success: true,
        data: {
          entries,
          pagination: {
            total,
            limit: limitNum,
            offset: offsetNum,
            hasMore: offsetNum + limitNum < total
          }
        }
      });
    } else {
      // Type-specific pagination already applied
      res.json({
        success: true,
        data: {
          entries,
          pagination: {
            total: entries.length,
            limit: limitNum,
            offset: offsetNum,
            hasMore: false // Approximation, services handle actual pagination
          }
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

// POST /api/diary/entries - Create new diary entry
router.post('/entries', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const userId = req.user.userId;
    const entryData = diaryEntrySchema.parse(req.body);
    const timestamp = entryData.timestamp ? new Date(entryData.timestamp) : new Date();

    let newEntry: any;

    switch (entryData.type) {
      case 'meal':
        // Support both old format (single food) and new format (multiple foods)
        if (entryData.data.foods && entryData.data.foods.length > 0) {
          // New format: multiple foods in one meal
          const createdEntries = [];
          for (const food of entryData.data.foods) {
            const entry = await MealDiaryService.createMealEntry(userId, {
              food_id: food.sighi_id,
              amount: parseFloat(food.amount),
              preparation_method: entryData.data.preparation_method,
              meal_type: entryData.data.meal_type,
              consumed_at: timestamp,
              notes: entryData.data.notes
            });
            createdEntries.push(entry);
          }
          newEntry = {
            type: 'meal',
            meal_type: entryData.data.meal_type,
            meal_name: entryData.data.meal_name,
            timestamp: timestamp.toISOString(),
            entries: createdEntries,
            total_foods: createdEntries.length
          };
        } else if (entryData.data.food_id && entryData.data.amount) {
          // Legacy format: single food
          newEntry = await MealDiaryService.createMealEntry(userId, {
            food_id: entryData.data.food_id,
            amount: entryData.data.amount,
            preparation_method: entryData.data.preparation_method,
            meal_type: entryData.data.meal_type,
            consumed_at: timestamp,
            notes: entryData.data.notes
          });
        } else {
          throw new ValidationError('Meal entry must contain either food_id/amount or foods array');
        }
        break;

      case 'supplement':
        newEntry = await SupplementDiaryService.createSupplementEntry(userId, {
          name: entryData.data.name,
          type: entryData.data.type,
          brand: entryData.data.brand,
          dosage_amount: entryData.data.dosage_amount,
          dosage_unit: entryData.data.dosage_unit,
          frequency: entryData.data.frequency,
          taken_at: timestamp,
          next_dose_due: entryData.data.next_dose_due ? new Date(entryData.data.next_dose_due) : undefined,
          intended_for: entryData.data.intended_for,
          effectiveness_rating: entryData.data.effectiveness_rating,
          side_effects: entryData.data.side_effects,
          missed_dose: entryData.data.missed_dose,
          late_dose: entryData.data.late_dose,
          notes: entryData.data.notes
        });
        break;

      case 'symptom':
        newEntry = await SymptomService.quickLogSymptom(
          userId,
          entryData.data.category,
          entryData.data.type,
          entryData.data.severity
        );
        break;

      default:
        throw new ValidationError(`Unsupported diary entry type: ${(entryData as any).type}`);
    }

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
router.get('/entries/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const userId = req.user.userId;
    const entryId = parseInt(req.params.id);
    const { type } = req.query;

    let entry: any = null;

    // Try to find entry in appropriate service based on type hint
    if (type === 'meal' || !type) {
      entry = await MealDiaryService.getMealEntry(userId, entryId);
      if (entry) {
        entry.type = 'meal';
        entry.timestamp = entry.consumed_at;
      }
    }

    if (!entry && (type === 'supplement' || !type)) {
      entry = await SupplementDiaryService.getSupplementEntry(userId, entryId);
      if (entry) {
        entry.type = 'supplement';
        entry.timestamp = entry.taken_at;
      }
    }

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
router.put('/entries/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const userId = req.user.userId;
    const entryId = parseInt(req.params.id);
    const entryData = diaryEntrySchema.parse(req.body);

    let updatedEntry: any = null;

    switch (entryData.type) {
      case 'meal':
        const mealUpdates: any = {
          food_id: entryData.data.food_id,
          amount: entryData.data.amount,
          preparation_method: entryData.data.preparation_method,
          meal_type: entryData.data.meal_type,
          notes: entryData.data.notes
        };
        if (entryData.timestamp) {
          mealUpdates.consumed_at = new Date(entryData.timestamp);
        }
        updatedEntry = await MealDiaryService.updateMealEntry(userId, entryId, mealUpdates);
        break;

      case 'supplement':
        const suppUpdates: any = {
          name: entryData.data.name,
          type: entryData.data.type,
          brand: entryData.data.brand,
          dosage_amount: entryData.data.dosage_amount,
          dosage_unit: entryData.data.dosage_unit,
          frequency: entryData.data.frequency,
          intended_for: entryData.data.intended_for,
          effectiveness_rating: entryData.data.effectiveness_rating,
          side_effects: entryData.data.side_effects,
          missed_dose: entryData.data.missed_dose,
          late_dose: entryData.data.late_dose,
          notes: entryData.data.notes
        };
        if (entryData.timestamp) {
          suppUpdates.taken_at = new Date(entryData.timestamp);
        }
        updatedEntry = await SupplementDiaryService.updateSupplementEntry(userId, entryId, suppUpdates);
        break;

      case 'symptom':
        throw new ValidationError('Symptom entries cannot be updated via this endpoint. Use symptom-specific endpoints.');

      default:
        throw new ValidationError(`Unsupported diary entry type: ${(entryData as any).type}`);
    }

    if (!updatedEntry) {
      throw new NotFoundError('Diary entry not found');
    }

    res.json({
      success: true,
      message: 'Diary entry updated successfully',
      data: { entry: updatedEntry }
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/diary/entries/:id - Delete diary entry
router.delete('/entries/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const userId = req.user.userId;
    const entryId = parseInt(req.params.id);
    const { type } = req.query;

    let deleted = false;

    // Try to delete from appropriate service
    if (type === 'meal' || !type) {
      deleted = await MealDiaryService.deleteMealEntry(userId, entryId);
    }

    if (!deleted && (type === 'supplement' || !type)) {
      deleted = await SupplementDiaryService.deleteSupplementEntry(userId, entryId);
    }

    if (!deleted && (type === 'symptom' || !type)) {
      deleted = await SymptomService.deleteSymptom(userId, entryId);
    }

    if (!deleted) {
      throw new NotFoundError('Diary entry not found');
    }

    res.json({
      success: true,
      message: 'Diary entry deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/diary/statistics - Get user's diary statistics
router.get('/statistics', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const userId = req.user.userId;
    const { days } = req.query;
    const daysNum = days ? parseInt(days as string) : 30;

    // Fetch statistics from each service
    const [mealStats, supplementStats, symptomStats] = await Promise.all([
      MealDiaryService.getMealStats(userId, daysNum),
      SupplementDiaryService.getSupplementStats(userId, daysNum),
      SymptomService.getSymptomStats(userId, daysNum)
    ]);

    const stats = {
      total_entries: mealStats.totalMeals + supplementStats.totalSupplements + symptomStats.totalSymptoms,
      entries_by_type: {
        meal: mealStats.totalMeals,
        supplement: supplementStats.totalSupplements,
        symptom: symptomStats.totalSymptoms
      },
      meal_statistics: {
        total: mealStats.totalMeals,
        by_meal_type: mealStats.mealTypeBreakdown,
        average_histamine_load: mealStats.averageHistamineLoad,
        top_foods: mealStats.topFoods
      },
      supplement_statistics: {
        total: supplementStats.totalSupplements,
        by_type: supplementStats.typeBreakdown,
        top_supplements: supplementStats.topSupplements,
        compliance_rate: supplementStats.complianceRate,
        average_effectiveness: supplementStats.averageEffectiveness,
        missed_doses: supplementStats.missedDoses,
        late_doses: supplementStats.lateDoses
      },
      symptom_statistics: {
        total: symptomStats.totalSymptoms,
        by_category: symptomStats.categoryBreakdown,
        average_severity: symptomStats.averageSeverity,
        common_triggers: symptomStats.mostCommonTriggers
      },
      days_analyzed: daysNum
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
