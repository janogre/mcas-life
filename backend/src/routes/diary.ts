import express from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { MealDiaryService } from '../services/diary/mealDiaryService.js';
import { SupplementDiaryService } from '../services/diary/supplementDiaryService.js';
import { SymptomService } from '../services/symptoms/symptomService.js';
import { db } from '../db/index.js';
import { activityEntries, healthMetrics, userMedications, medicationsCatalog, illnessEntries } from '../db/schema.js';
import { eq, and, gte, lte, desc } from 'drizzle-orm';

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

const activityEntrySchema = z.object({
  type: z.literal('activity'),
  timestamp: z.string().datetime().optional(),
  data: z.object({
    activity_type: z.enum(['temperature_change', 'social_trigger', 'physical_activity']),
    duration_minutes: z.number().optional(),
    intensity: z.enum(['light', 'moderate', 'intense']).optional(),
    location_description: z.string().optional(),
    notes: z.string().optional(),
    temperature_change_type: z.enum(['hot_to_cold', 'cold_to_hot']).optional(),
    temperature_from: z.number().optional(),
    temperature_to: z.number().optional(),
    social_event_type: z.string().optional(),
    crowd_size: z.string().optional()
  })
});

const healthMetricEntrySchema = z.object({
  type: z.literal('health_metric'),
  timestamp: z.string().datetime().optional(),
  data: z.object({
    sleep_quality: z.number().min(1).max(10).optional(),
    energy_level: z.number().min(1).max(10).optional(),
    stress_level: z.number().min(1).max(10).optional(),
    mood_rating: z.number().min(1).max(10).optional(),
    notes: z.string().optional()
  })
});

const diaryEntrySchema = z.discriminatedUnion('type', [
  mealEntrySchema,
  supplementEntrySchema,
  symptomEntrySchema,
  activityEntrySchema,
  healthMetricEntrySchema
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
        updatedAt: (m as any).updated_at,
        data: {
          meal_type: m.meal_type,
          meal_time: m.consumed_at ? new Date(m.consumed_at).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' }) : undefined,
          foods: (m as any).foods?.map((f: any) => ({
            sighi_id: f.food_id,
            name: f.custom_food_name || f.food?.name_no || f.food?.name_en || 'Unknown',
            amount: f.amount?.toString() || '',
            unit: f.unit || 'g',
            compatibility: f.food?.compatibility,
            triggers: f.food?.triggers
          })) || [],
          dao_taken_before: (m as any).dao_taken_before,
          dao_minutes_before: (m as any).dao_minutes_before,
          immediate_reaction: (m as any).immediate_reaction,
          delayed_reaction: (m as any).delayed_reaction,
          reaction_severity: (m as any).reaction_severity,
          reaction_notes: (m as any).reaction_notes,
          location: (m as any).location,
          notes: m.notes
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
        startDate: startDateObj?.toISOString(),
        endDate: endDateObj?.toISOString(),
        limit: type === 'symptom' ? limitNum : 100
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

    // Fetch medications (user_medications table)
    if (type === 'medication' || !type) {
      const medications = await db
        .select({
          medication: userMedications,
          catalog: medicationsCatalog
        })
        .from(userMedications)
        .leftJoin(medicationsCatalog, eq(userMedications.catalog_medication_id, medicationsCatalog.id))
        .where(
          and(
            eq(userMedications.user_id, userId),
            startDateObj ? gte(userMedications.time_taken, startDateObj) : undefined,
            endDateObj ? lte(userMedications.time_taken, endDateObj) : undefined
          )
        )
        .orderBy(desc(userMedications.time_taken))
        .limit(type === 'medication' ? limitNum : 50);

      entries.push(...medications.map(m => ({
        id: m.medication.id,
        userId: m.medication.user_id,
        type: 'medication',
        timestamp: m.medication.time_taken,
        createdAt: m.medication.created_at,
        updatedAt: m.medication.created_at, // user_medications doesn't have updated_at
        data: {
          medication_name: m.medication.custom_name || m.catalog?.name || 'Ukjent medisin',
          medication_type: m.medication.medication_type,
          dosage: m.medication.dosage,
          dosage_unit: m.medication.dosage_unit,
          catalog_info: m.catalog ? {
            active_substance: m.catalog.active_substance,
            form: m.catalog.form,
            strength: m.catalog.strength,
            prescription_required: m.catalog.prescription_required
          } : undefined,
          notes: m.medication.notes
        }
      })));
    }

    // Fetch activity entries
    if (type === 'activity' || !type) {
      const activities = await db
        .select()
        .from(activityEntries)
        .where(
          and(
            eq(activityEntries.user_id, userId),
            startDateObj ? gte(activityEntries.time_started, startDateObj) : undefined,
            endDateObj ? lte(activityEntries.time_started, endDateObj) : undefined
          )
        )
        .orderBy(activityEntries.time_started)
        .limit(type === 'activity' ? limitNum : 50);

      entries.push(...activities.map(a => ({
        id: a.id,
        userId: a.user_id,
        type: 'activity',
        timestamp: a.time_started,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
        data: {
          activity_type: a.activity_type,
          duration_minutes: a.duration_minutes,
          intensity: a.intensity,
          location_description: a.location_description,
          notes: a.notes,
          temperature_change_type: a.temperature_change_type,
          temperature_from: a.temperature_from,
          temperature_to: a.temperature_to,
          social_event_type: a.social_event_type,
          crowd_size: a.crowd_size
        }
      })));
    }

    // Fetch illness entries
    if (type === 'illness' || !type) {
      const illnesses = await db
        .select()
        .from(illnessEntries)
        .where(
          and(
            eq(illnessEntries.user_id, userId),
            startDateObj ? gte(illnessEntries.first_symptoms_at, startDateObj) : undefined,
            endDateObj ? lte(illnessEntries.first_symptoms_at, endDateObj) : undefined
          )
        )
        .orderBy(desc(illnessEntries.first_symptoms_at))
        .limit(type === 'illness' ? limitNum : 50);

      console.log('🩺 Illness query results:', illnesses.length, 'entries found');
      if (illnesses.length > 0) {
        console.log('First illness:', JSON.stringify(illnesses[0], null, 2));
      }

      entries.push(...illnesses.map(i => ({
        id: i.id,
        userId: i.user_id,
        type: 'illness',
        timestamp: i.became_sick_at || i.first_symptoms_at || i.created_at,
        createdAt: i.created_at,
        updatedAt: i.updated_at,
        data: {
          illness_type: i.illness_type,
          custom_illness_name: i.custom_illness_name,
          status: i.status,
          symptoms: i.symptoms,
          severity: i.severity,
          has_fever: i.has_fever,
          temperature_celsius: i.temperature_celsius,
          mcas_flare_during_illness: i.mcas_flare_during_illness,
          mcas_severity_increase: i.mcas_severity_increase,
          suspected_source: i.suspected_source,
          notes: i.notes
        }
      })));
    }

    // Fetch health metrics
    if (type === 'health_metric' || !type) {
      const metrics = await db
        .select()
        .from(healthMetrics)
        .where(
          and(
            eq(healthMetrics.user_id, userId),
            startDateObj ? gte(healthMetrics.created_at, startDateObj) : undefined,
            endDateObj ? lte(healthMetrics.created_at, endDateObj) : undefined
          )
        )
        .orderBy(healthMetrics.created_at)
        .limit(type === 'health_metric' ? limitNum : 50);

      entries.push(...metrics.map(m => ({
        id: m.id,
        userId: m.user_id,
        type: 'health_metric',
        timestamp: m.created_at,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
        data: {
          sleep_quality: m.sleep_quality,
          energy_level: m.energy_level,
          stress_level: m.stress_level,
          mood_rating: m.mood_rating,
          notes: m.notes
        }
      })));
    }

    // Sort by timestamp (newest first)
    entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    console.log('📊 Final entries before pagination:', entries.length, 'total');
    console.log('Entry types:', entries.map(e => e.type).join(', '));

    // Apply pagination if not filtered by type
    if (!type) {
      const total = entries.length;
      entries = entries.slice(offsetNum, offsetNum + limitNum);

      console.log('📤 Sending response with', entries.length, 'entries');

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

      case 'activity':
        const activityUpdates: any = {
          activity_type: entryData.data.activity_type,
          duration_minutes: entryData.data.duration_minutes,
          intensity: entryData.data.intensity,
          location_description: entryData.data.location_description,
          notes: entryData.data.notes,
          temperature_change_type: entryData.data.temperature_change_type,
          temperature_from: entryData.data.temperature_from,
          temperature_to: entryData.data.temperature_to,
          social_event_type: entryData.data.social_event_type,
          crowd_size: entryData.data.crowd_size
        };
        if (entryData.timestamp) {
          activityUpdates.time_started = new Date(entryData.timestamp);
        }
        const activityResult = await db
          .update(activityEntries)
          .set(activityUpdates)
          .where(and(eq(activityEntries.id, entryId), eq(activityEntries.user_id, userId)))
          .returning();
        updatedEntry = activityResult[0];
        break;

      case 'health_metric':
        const healthMetricUpdates: any = {
          sleep_quality: entryData.data.sleep_quality,
          energy_level: entryData.data.energy_level,
          stress_level: entryData.data.stress_level,
          mood_rating: entryData.data.mood_rating,
          notes: entryData.data.notes
        };
        if (entryData.timestamp) {
          healthMetricUpdates.created_at = new Date(entryData.timestamp);
        }
        const healthMetricResult = await db
          .update(healthMetrics)
          .set(healthMetricUpdates)
          .where(and(eq(healthMetrics.id, entryId), eq(healthMetrics.user_id, userId)))
          .returning();
        updatedEntry = healthMetricResult[0];
        break;

      case 'medication':
        const medicationUpdates: any = {
          custom_name: entryData.data.medication_name,
          medication_type: entryData.data.medication_type,
          dosage: entryData.data.dosage,
          dosage_unit: entryData.data.dosage_unit,
          notes: entryData.data.notes
        };
        if (entryData.timestamp) {
          medicationUpdates.time_taken = new Date(entryData.timestamp);
        }
        const medicationResult = await db
          .update(userMedications)
          .set(medicationUpdates)
          .where(and(eq(userMedications.id, entryId), eq(userMedications.user_id, userId)))
          .returning();
        updatedEntry = medicationResult[0];
        break;

      case 'illness':
        const illnessUpdates: any = {
          illness_type: entryData.data.illness_type,
          custom_illness_name: entryData.data.custom_illness_name,
          status: entryData.data.status,
          symptoms: entryData.data.symptoms,
          severity: entryData.data.severity,
          has_fever: entryData.data.has_fever,
          temperature_celsius: entryData.data.temperature_celsius,
          mcas_flare_during_illness: entryData.data.mcas_flare_during_illness,
          mcas_severity_increase: entryData.data.mcas_severity_increase,
          suspected_source: entryData.data.suspected_source,
          notes: entryData.data.notes
        };
        if (entryData.timestamp) {
          illnessUpdates.first_symptoms_at = new Date(entryData.timestamp);
        }
        const illnessResult = await db
          .update(illnessEntries)
          .set(illnessUpdates)
          .where(and(eq(illnessEntries.id, entryId), eq(illnessEntries.user_id, userId)))
          .returning();
        updatedEntry = illnessResult[0];
        break;

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

    if (!deleted && (type === 'activity' || !type)) {
      const result = await db
        .delete(activityEntries)
        .where(and(eq(activityEntries.id, entryId), eq(activityEntries.user_id, userId)))
        .returning();
      deleted = result.length > 0;
    }

    if (!deleted && (type === 'health_metric' || !type)) {
      const result = await db
        .delete(healthMetrics)
        .where(and(eq(healthMetrics.id, entryId), eq(healthMetrics.user_id, userId)))
        .returning();
      deleted = result.length > 0;
    }

    if (!deleted && (type === 'medication' || !type)) {
      const result = await db
        .delete(userMedications)
        .where(and(eq(userMedications.id, entryId), eq(userMedications.user_id, userId)))
        .returning();
      deleted = result.length > 0;
    }

    if (!deleted && (type === 'illness' || !type)) {
      const result = await db
        .delete(illnessEntries)
        .where(and(eq(illnessEntries.id, entryId), eq(illnessEntries.user_id, userId)))
        .returning();
      deleted = result.length > 0;
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

// POST /api/diary/meal-from-recipe - Log meal from user recipe with portion calculation
const recipeMealSchema = z.object({
  recipe_id: z.number().int().positive(),
  portions_consumed: z.number()
    .positive('Porsjoner må være positiv')
    .min(0.25, 'Minimum porsjon er 0.25')
    .max(20, 'Maksimum porsjoner er 20'),
  meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'evening']),
  meal_time: z.string().datetime(),
  dao_taken_before: z.boolean().optional(),
  dao_minutes_before: z.number().int().min(0).max(120).optional(),
  notes: z.string().max(1000).optional()
});

router.post('/meal-from-recipe', diaryRateLimit, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    const userId = req.user.userId;
    const mealData = recipeMealSchema.parse(req.body);

    // Convert meal_time string to Date
    const mealTime = new Date(mealData.meal_time);

    const mealEntry = await MealDiaryService.logMealFromRecipe(userId, {
      recipe_id: mealData.recipe_id,
      portions_consumed: mealData.portions_consumed,
      meal_type: mealData.meal_type,
      meal_time: mealTime,
      dao_taken_before: mealData.dao_taken_before,
      dao_minutes_before: mealData.dao_minutes_before,
      notes: mealData.notes
    });

    res.status(201).json({
      success: true,
      message: 'Måltid logget fra oppskrift',
      data: {
        meal: mealEntry
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Recipe not found') {
      return res.status(404).json({
        success: false,
        error: 'Oppskrift ikke funnet'
      });
    }
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
