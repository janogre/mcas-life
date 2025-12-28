/**
 * Enhanced Symptoms API Routes
 * Handles comprehensive symptom logging with extended trigger context
 */

import express from 'express';
import { z } from 'zod';
import { SymptomService } from '../services/symptoms/symptomService.js';

const router = express.Router();

// Validation schemas
const symptomCategoryEnum = z.enum([
  'skin', 'digestive', 'respiratory', 'cardiovascular', 
  'neurological', 'musculoskeletal', 'genitourinary', 'systemic'
]);

const extendedSymptomSchema = z.object({
  // Core symptom data
  category: symptomCategoryEnum,
  type: z.string().min(1).max(50),
  custom_description: z.string().optional(),
  severity: z.number().int().min(1).max(10),
  duration_minutes: z.number().int().min(1).max(43200), // max 30 days
  intensity_change: z.enum(['improving', 'worsening', 'stable']),
  body_regions: z.array(z.string()).min(1),
  started_at: z.string().transform(val => new Date(val)),
  ended_at: z.string().transform(val => new Date(val)).optional(),
  
  // Traditional triggers
  suspected_triggers: z.array(z.string()).optional(),
  environmental_factors: z.array(z.string()).optional(),
  
  // Extended context - Based on patient experience
  dao_taken_before_meal: z.boolean().optional(),
  sensory_environment_calm: z.boolean().optional(),
  compression_worn_during_day: z.boolean().optional(),
  physical_fatigue_level: z.number().int().min(0).max(10).optional(),
  psychological_fatigue_level: z.number().int().min(0).max(10).optional(),
  time_since_last_meal_minutes: z.number().int().min(0).optional(),
  had_heavy_food_today: z.boolean().optional(),
  current_stress_factors: z.array(z.string()).optional(),
  weather_conditions: z.object({
    temperature: z.number().optional(),
    humidity: z.number().int().min(0).max(100).optional(),
    pressure: z.number().optional(),
    weather_type: z.string().optional()
  }).optional(),
  menstrual_cycle_phase: z.enum(['pre', 'during', 'post']).nullable().optional(),
  sleep_quality_last_night: z.number().int().min(1).max(10).optional(),
  cumulative_day_stress: z.number().int().min(1).max(10).optional(),
  
  // Treatment
  treatment_taken: z.string().optional(),
  treatment_effective: z.boolean().optional(),
  notes: z.string().optional(),

  // Weather data (frontend sends this as weather_data)
  weather_data: z.object({
    temperature: z.number(),
    humidity: z.number().int().min(0).max(100),
    pressure: z.number(),
    weather_code: z.number()
  }).optional(),

  // Room exposures (Airthings integration)
  room_exposures: z.array(z.object({
    room_id: z.string(),
    room_name: z.string(),
    time_spent_minutes: z.number().int().min(0).optional()
  })).optional(),
});

const quickSymptomSchema = z.object({
  category: symptomCategoryEnum,
  type: z.string().min(1).max(50),
  severity: z.number().int().min(1).max(10).optional(),
  weather_conditions: z.object({
    temperature: z.number().optional(),
    humidity: z.number().int().min(0).max(100).optional(),
    pressure: z.number().optional(),
    weather_type: z.string().optional()
  }).optional()
});

const symptomHistoryQuerySchema = z.object({
  category: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  limit: z.string().transform(val => parseInt(val)).refine(val => val > 0 && val <= 100).optional()
});

const symptomStatsQuerySchema = z.object({
  days: z.string().transform(val => parseInt(val)).refine(val => val > 0 && val <= 365).optional()
});

// Authentication is handled in index.ts for this route group

/**
 * POST /symptoms
 * Log a comprehensive symptom entry
 */
router.post('/', async (req, res) => {
  try {
    const symptomData = extendedSymptomSchema.parse(req.body);
    const userId = req.user!.userId;
    
    const symptom = await SymptomService.logSymptom(userId, symptomData);
    
    res.status(201).json({
      success: true,
      data: symptom,
      message: 'Symptom registrert'
    });
  } catch (error) {
    console.error('Error logging symptom:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : 'Kunne ikke registrere symptom'
    });
  }
});

/**
 * POST /symptoms/quick-log
 * Quick symptom logging for common symptoms (for quick buttons)
 */
router.post('/quick-log', async (req, res) => {
  try {
    const { category, type, severity = 5, weather_conditions } = quickSymptomSchema.parse(req.body);
    const userId = req.user!.userId;

    const symptom = await SymptomService.quickLogSymptom(userId, category, type, severity, weather_conditions);

    res.status(201).json({
      success: true,
      data: symptom,
      message: `${type} registrert raskt`
    });
  } catch (error) {
    console.error('Error quick logging symptom:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : 'Kunne ikke registrere symptom raskt'
    });
  }
});

/**
 * GET /symptoms
 * Get symptom history with filtering
 */
router.get('/', async (req, res) => {
  try {
    const query = symptomHistoryQuerySchema.parse(req.query);
    const userId = req.user!.userId;
    
    const symptoms = await SymptomService.getSymptomHistory(userId, query);
    
    res.json({
      success: true,
      data: symptoms,
      count: symptoms.length
    });
  } catch (error) {
    console.error('Error getting symptom history:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : 'Kunne ikke hente symptomhistorikk'
    });
  }
});

/**
 * GET /symptoms/recent
 * Get recent symptoms (legacy endpoint for compatibility)
 */
router.get('/recent', async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const userId = req.user!.userId;
    
    // Calculate date range based on days
    const numDays = parseInt(days as string);
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - numDays * 24 * 60 * 60 * 1000).toISOString();
    
    const symptoms = await SymptomService.getSymptomHistory(userId, {
      startDate,
      endDate,
      limit: 100
    });
    
    res.json({
      success: true,
      data: symptoms,
      count: symptoms.length
    });
  } catch (error) {
    console.error('Error getting recent symptoms:', error);
    res.status(500).json({
      success: false,
      error: 'Kunne ikke hente nylige symptomer'
    });
  }
});

/**
 * GET /symptoms/categories
 * Get available symptom categories
 */
router.get('/categories', (req, res) => {
  const categories = [
    { value: 'skin', label: 'Hud', description: 'Utslett, kløe, rødhet, hevelse' },
    { value: 'digestive', label: 'Fordøyelse', description: 'Magesmerter, kvalme, diarré, oppblåsthet' },
    { value: 'respiratory', label: 'Luftveier', description: 'Hoste, pustevansker, tett nese' },
    { value: 'cardiovascular', label: 'Hjerte/kar', description: 'Hjertebank, svimmelhet, blodtrykksendringer' },
    { value: 'neurological', label: 'Nevrologiske', description: 'Hodepine, konsentrasjonsproblemer, tretthet' },
    { value: 'musculoskeletal', label: 'Muskel/skjelett', description: 'Leddsmerter, muskelsmerter, stivhet' },
    { value: 'genitourinary', label: 'Urin/kjønn', description: 'Blæreproblemer, menstruasjonsproblemer' },
    { value: 'systemic', label: 'Systemiske', description: 'Generell utilpass, feber, allergiaktige reaksjoner' }
  ];
  
  res.json({
    success: true,
    data: categories,
    message: 'Symptomkategorier hentet'
  });
});

/**
 * GET /symptoms/common-types
 * Get common symptom types for quick logging
 */
router.get('/common-types', (req, res) => {
  const commonTypes = [
    { category: 'skin', types: ['Hudreaksjon', 'Rødhet', 'Kløe', 'Hevelse'] },
    { category: 'digestive', types: ['Magesmerter', 'Kvalme', 'Diarré', 'Oppblåsthet'] },
    { category: 'respiratory', types: ['Pustevansker', 'Hoste', 'Tett nese'] },
    { category: 'cardiovascular', types: ['Hjertebank', 'Svimmelhet'] },
    { category: 'neurological', types: ['Hodepine', 'Tretthet', 'Konsentrasjonsproblemer'] },
    { category: 'musculoskeletal', types: ['Leddsmerter', 'Muskelsmerter'] },
    { category: 'genitourinary', types: ['Blæreproblemer'] },
    { category: 'systemic', types: ['Generell utilpass', 'Feber'] }
  ];
  
  res.json({
    success: true,
    data: commonTypes,
    message: 'Vanlige symptomtyper hentet'
  });
});

/**
 * GET /symptoms/stats
 * Get symptom statistics and analysis
 */
router.get('/stats', async (req, res) => {
  try {
    const query = symptomStatsQuerySchema.parse(req.query);
    const userId = req.user!.userId;
    
    const stats = await SymptomService.getSymptomStats(userId, query.days);
    
    res.json({
      success: true,
      data: stats,
      message: 'Symptomstatistikk hentet'
    });
  } catch (error) {
    console.error('Error getting symptom stats:', error);
    res.status(400).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors : 'Kunne ikke hente symptomstatistikk'
    });
  }
});

/**
 * GET /symptoms/correlations
 * Get smart correlations across multiple factors
 */
router.get('/correlations', async (req, res) => {
  try {
    const { days = '90' } = req.query;
    const daysNum = parseInt(days as string);
    const userId = req.user!.userId;
    
    const correlations = await SymptomService.getSmartCorrelations(userId, daysNum);
    
    res.json({
      success: true,
      data: correlations,
      message: 'Korrelasjonsanalyse fullført'
    });
  } catch (error) {
    console.error('Error getting correlations:', error);
    res.status(500).json({
      success: false,
      error: 'Kunne ikke utføre korrelasjonsanalyse'
    });
  }
});

/**
 * GET /symptoms/risk-factors
 * Get today's risk factors based on context
 */
router.get('/risk-factors', async (req, res) => {
  try {
    const userId = req.user!.userId;
    
    const riskAnalysis = await SymptomService.getTodaysRiskFactors(userId);
    
    res.json({
      success: true,
      data: riskAnalysis,
      message: 'Risikofaktorer analysert'
    });
  } catch (error) {
    console.error('Error getting risk factors:', error);
    res.status(500).json({
      success: false,
      error: 'Kunne ikke analysere risikofaktorer'
    });
  }
});

/**
 * GET /symptoms/context-suggestions
 * Get context suggestions based on current conditions
 */
router.get('/context-suggestions', (req, res) => {
  const suggestions = {
    stressFactors: [
      'Arbeidspress', 'Familiesituasjon', 'Økonomi', 'Helse bekymringer',
      'Sosiale forpliktelser', 'Tidsmangel', 'Tekniske problemer'
    ],
    environmentalFactors: [
      'Sterke lukter', 'Høy temperatur', 'Kald vind', 'Pollen',
      'Støv', 'Kjemikalier', 'Støy', 'Mye mennesker'
    ],
    weatherTypes: [
      'Solskinn', 'Regn', 'Snø', 'Storm', 'Høyt lufttrykk',
      'Lavt lufttrykk', 'Høy fuktighet', 'Tørr luft'
    ]
  };

  res.json({
    success: true,
    data: suggestions,
    message: 'Kontekstforslag hentet'
  });
});

/**
 * POST /symptoms/quick-capture
 * Quick symptom capture (Tier 1 - minimal data)
 */
router.post('/quick-capture', async (req, res) => {
  try {
    const { templateId, severity } = req.body;
    const userId = req.user!.userId;

    if (!templateId || !severity) {
      return res.status(400).json({
        success: false,
        error: 'templateId og severity er påkrevd',
      });
    }

    const symptom = await SymptomService.quickCaptureSymptom(userId, templateId, severity);

    res.status(201).json({
      success: true,
      data: symptom,
      message: 'Symptom raskt registrert',
    });
  } catch (error) {
    console.error('Error in quick capture:', error);
    res.status(500).json({
      success: false,
      error: 'Kunne ikke registrere symptom',
    });
  }
});

/**
 * POST /symptoms/:id/enrich
 * Enrich symptom with automatic context
 */
router.post('/:id/enrich', async (req, res) => {
  try {
    const symptomId = parseInt(req.params.id);

    if (isNaN(symptomId)) {
      return res.status(400).json({
        success: false,
        error: 'Ugyldig symptom ID',
      });
    }

    const enrichmentData = await SymptomService.enrichSymptomWithContext(symptomId);

    res.json({
      success: true,
      data: enrichmentData,
      message: 'Symptom beriket med kontekst',
    });
  } catch (error) {
    console.error('Error enriching symptom:', error);
    res.status(500).json({
      success: false,
      error: 'Kunne ikke berike symptom',
    });
  }
});

/**
 * GET /symptoms/:id/follow-up-form
 * Get follow-up form for a symptom
 */
router.get('/:id/follow-up-form', async (req, res) => {
  try {
    const symptomId = parseInt(req.params.id);

    if (isNaN(symptomId)) {
      return res.status(400).json({
        success: false,
        error: 'Ugyldig symptom ID',
      });
    }

    const form = await SymptomService.getFollowUpForm(symptomId);

    res.json({
      success: true,
      data: form,
      message: 'Oppfølgingsskjema hentet',
    });
  } catch (error) {
    console.error('Error getting follow-up form:', error);
    res.status(500).json({
      success: false,
      error: 'Kunne ikke hente oppfølgingsskjema',
    });
  }
});

/**
 * POST /symptoms/:id/complete-follow-up
 * Complete follow-up for a symptom
 */
router.post('/:id/complete-follow-up', async (req, res) => {
  try {
    const symptomId = parseInt(req.params.id);
    const { answers, roomLocations } = req.body;

    if (isNaN(symptomId)) {
      return res.status(400).json({
        success: false,
        error: 'Ugyldig symptom ID',
      });
    }

    if (!answers) {
      return res.status(400).json({
        success: false,
        error: 'Svar er påkrevd',
      });
    }

    const symptom = await SymptomService.completeFollowUp(symptomId, answers, roomLocations);

    res.json({
      success: true,
      data: symptom,
      message: 'Oppfølging fullført',
    });
  } catch (error) {
    console.error('Error completing follow-up:', error);
    res.status(500).json({
      success: false,
      error: 'Kunne ikke fullføre oppfølging',
    });
  }
});

/**
 * GET /symptoms/needing-follow-up
 * Get symptoms that need follow-up
 */
router.get('/needing-follow-up', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 10;

    const symptoms = await SymptomService.getSymptomsNeedingFollowUp(userId, limit);

    res.json({
      success: true,
      data: symptoms,
      count: symptoms.length,
      message: 'Symptomer som trenger oppfølging hentet',
    });
  } catch (error) {
    console.error('Error getting symptoms needing follow-up:', error);
    res.status(500).json({
      success: false,
      error: 'Kunne ikke hente symptomer som trenger oppfølging',
    });
  }
});

/**
 * DELETE /symptoms/:id
 * Delete a symptom entry
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user!.userId;
    const symptomId = parseInt(req.params.id);

    if (isNaN(symptomId)) {
      return res.status(400).json({
        success: false,
        error: 'Ugyldig symptom-ID',
      });
    }

    const deleted = await SymptomService.deleteSymptom(userId, symptomId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Symptom ikke funnet eller du har ikke tilgang til å slette det',
      });
    }

    res.json({
      success: true,
      message: 'Symptom slettet',
    });
  } catch (error) {
    console.error('Error deleting symptom:', error);
    res.status(500).json({
      success: false,
      error: 'Kunne ikke slette symptom',
    });
  }
});

export { router as symptomRoutes };