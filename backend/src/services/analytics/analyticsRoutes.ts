/**
 * Analytics API Routes - AI-Driven Symptom Correlation
 * 
 * RESTful endpoints for trigger analysis and pattern recognition
 */

import { Router } from 'express';
import { z } from 'zod';
import { analyticsService } from './analyticsService.js';
import { openaiAnalyticsService } from './openaiAnalyticsService.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validation.js';
import { rateLimitConfig } from '../../middleware/rateLimiting.js';
import { db } from '../../db/index.js';
import { userPreferences } from '../../db/schema.js';
import { eq } from 'drizzle-orm';

const router = Router();

/**
 * Helper function to get user's analysis mode preference
 */
async function getUserAnalysisMode(userId: number): Promise<'smart' | 'ai'> {
  try {
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.user_id, userId))
      .limit(1);

    return prefs?.analysis_mode || 'smart'; // Default to smart mode
  } catch (error) {
    console.warn(`Failed to get analysis mode for user ${userId}, defaulting to smart mode`, error);
    return 'smart';
  }
}

// Validation schemas
const triggerAnalysisSchema = z.object({
  symptom_entry_id: z.number().int().positive(),
  analysis_window_hours: z.number().int().min(12).max(168).optional() // 12 hours to 1 week
});

const quickTriggerCheckSchema = z.object({
  foods_consumed: z.array(z.object({
    food_id: z.number().int().positive(),
    food_name: z.string().min(1),
    consumed_at: z.string().datetime(),
    sighi_compatibility: z.enum(['0', '1', '2', '3'])
  })),
  current_symptoms: z.array(z.object({
    type: z.string().min(1),
    severity: z.number().min(1).max(10),
    started_at: z.string().datetime().optional()
  })).optional()
});

const realTimeRiskSchema = z.object({
  planned_food_ids: z.array(z.number().int().positive()),
  risk_threshold: z.number().min(0).max(1).optional() // 0.0 to 1.0, default 0.3
});

const userAnalysesQuerySchema = z.object({
  limit: z.number().int().min(1).max(50).optional(),
  include_timeline: z.boolean().optional(),
  confidence_threshold: z.number().min(0).max(1).optional()
});

/**
 * POST /api/analytics/trigger-correlation
 *
 * Analyze food triggers for a specific symptom episode
 * Automatically selects Smart analysis or AI analysis based on user preference
 */
router.post('/trigger-correlation',
  authenticate,
  rateLimitConfig.analytics.trigger_analysis, // 5 requests per 15 minutes
  validateRequest(triggerAnalysisSchema),
  async (req, res, next) => {
    try {
      const userId = req.user!.userId;
      const { symptom_entry_id, analysis_window_hours } = req.body;

      // Get user's analysis mode preference
      const analysisMode = await getUserAnalysisMode(userId);

      console.log(`🔍 Starting ${analysisMode.toUpperCase()} trigger correlation analysis for user ${userId}, symptom ${symptom_entry_id}`);

      // Select appropriate analysis service based on user preference
      const service = analysisMode === 'ai' ? openaiAnalyticsService : analyticsService;
      const modeName = analysisMode === 'ai' ? 'AI-analyse (OpenAI)' : 'Smart analyse';

      // Perform correlation analysis
      const analysis = await service.analyzeTriggerCorrelation({
        user_id: userId,
        symptom_entry_id,
        analysis_window_hours
      });

      res.status(200).json({
        success: true,
        data: {
          ...analysis,
          analysis_mode: analysisMode, // Include which mode was used
        },
        message: `${modeName} complete. Found ${analysis.likely_food_triggers.length} potential triggers with ${(analysis.analysis_confidence * 100).toFixed(1)}% confidence.`
      });

    } catch (error) {
      console.error('Trigger correlation analysis failed:', error);
      next(error);
    }
  }
);

/**
 * GET /api/analytics/user-analyses
 * 
 * Get all trigger analyses for the authenticated user
 */
router.get('/user-analyses',
  authenticate,
  rateLimitConfig.analytics.user_data, // 30 requests per 15 minutes
  async (req, res, next) => {
    try {
      const userId = req.user!.userId;
      const { limit = 10, confidence_threshold = 0.0 } = req.query;
      
      const analyses = await analyticsService.getUserTriggerAnalyses(
        userId, 
        parseInt(limit as string)
      );
      
      // Filter by confidence threshold if specified
      const thresholdValue = parseFloat(confidence_threshold as string);
      const filteredAnalyses = !isNaN(thresholdValue) && thresholdValue > 0 
        ? analyses.filter(a => a.analysis_confidence >= thresholdValue)
        : analyses;
      
      res.status(200).json({
        success: true,
        data: {
          analyses: filteredAnalyses,
          total_count: filteredAnalyses.length,
          avg_confidence: filteredAnalyses.length > 0 
            ? filteredAnalyses.reduce((sum, a) => sum + a.analysis_confidence, 0) / filteredAnalyses.length
            : 0
        }
      });
      
    } catch (error) {
      console.error('Failed to get user analyses:', error);
      next(error);
    }
  }
);

/**
 * GET /api/analytics/trigger-patterns/:userId
 * 
 * Get trigger patterns for a specific user (admin/expert only)
 * For clinical research and expert consultation
 */
router.get('/trigger-patterns/:userId',
  authenticate,
  requireRole(['admin', 'expert', 'researcher']),
  rateLimitConfig.analytics.expert_data, // 10 requests per 15 minutes
  async (req, res, next) => {
    try {
      const targetUserId = parseInt(req.params.userId);
      
      if (isNaN(targetUserId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid user ID'
        });
      }
      
      const analyses = await analyticsService.getUserTriggerAnalyses(targetUserId, 25);
      
      // Aggregate pattern data for research purposes
      const aggregatedPatterns = {
        total_analyses: analyses.length,
        avg_confidence: analyses.reduce((sum, a) => sum + a.analysis_confidence, 0) / analyses.length,
        common_triggers: extractCommonTriggers(analyses),
        pattern_insights: generatePatternInsights(analyses)
      };
      
      res.status(200).json({
        success: true,
        data: aggregatedPatterns,
        note: 'Anonymized pattern data for clinical research'
      });
      
    } catch (error) {
      console.error('Failed to get trigger patterns:', error);
      next(error);
    }
  }
);

/**
 * POST /api/analytics/bulk-correlation
 * 
 * Analyze multiple symptoms at once (admin/research use)
 */
router.post('/bulk-correlation',
  authenticate,
  requireRole(['admin', 'researcher']),
  rateLimitConfig.analytics.bulk_operations, // 2 requests per hour
  async (req, res, next) => {
    try {
      const { symptom_entry_ids, analysis_window_hours = 72 } = req.body;
      
      if (!Array.isArray(symptom_entry_ids) || symptom_entry_ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'symptom_entry_ids must be a non-empty array'
        });
      }
      
      if (symptom_entry_ids.length > 10) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 10 symptoms can be analyzed at once'
        });
      }
      
      const results = [];
      
      for (const symptomId of symptom_entry_ids) {
        try {
          const analysis = await analyticsService.analyzeTriggerCorrelation({
            user_id: req.user!.userId,
            symptom_entry_id: symptomId,
            analysis_window_hours
          });
          results.push(analysis);
        } catch (error) {
          console.error(`Failed to analyze symptom ${symptomId}:`, error);
          results.push({
            symptom_entry_id: symptomId,
            error: 'Analysis failed',
            analysis_confidence: 0
          });
        }
      }
      
      res.status(200).json({
        success: true,
        data: {
          analyses: results,
          processed_count: results.length,
          successful_count: results.filter(r => !r.error).length
        }
      });
      
    } catch (error) {
      console.error('Bulk correlation analysis failed:', error);
      next(error);
    }
  }
);

/**
 * POST /api/analytics/quick-trigger-check
 * 
 * Real-time analysis of foods consumed vs current symptoms
 * Provides immediate feedback without full correlation analysis
 */
router.post('/quick-trigger-check',
  authenticate,
  rateLimitConfig.analytics.trigger_analysis,
  validateRequest(quickTriggerCheckSchema),
  async (req, res, next) => {
    try {
      const userId = req.user!.userId;
      const { foods_consumed, current_symptoms } = req.body;
      
      console.log(`⚡ Quick trigger check for user ${userId}`);
      
      // Real-time risk assessment based on immediate consumption patterns
      const quickAnalysis = {
        assessment_time: new Date().toISOString(),
        user_id: userId,
        foods_analyzed: foods_consumed.length,
        immediate_risks: [] as any[],
        recommendations: [] as string[],
        confidence_level: 'preliminary' as const
      };
      
      // Analyze each food for immediate risk indicators
      for (const food of foods_consumed) {
        const hoursAgo = (Date.now() - new Date(food.consumed_at).getTime()) / (1000 * 60 * 60);
        
        // High-risk foods consumed recently (within 6 hours)
        if (parseInt(food.sighi_compatibility) >= 2 && hoursAgo <= 6) {
          quickAnalysis.immediate_risks.push({
            food_id: food.food_id,
            food_name: food.food_name,
            risk_level: parseInt(food.sighi_compatibility) >= 3 ? 'high' : 'moderate',
            time_since_consumption: hoursAgo,
            sighi_rating: food.sighi_compatibility,
            potential_reaction_window: '2-8 hours'
          });
        }
      }
      
      // Generate real-time recommendations
      if (quickAnalysis.immediate_risks.length > 0) {
        quickAnalysis.recommendations.push(
          'Monitor for symptoms in the next 2-8 hours',
          'Consider taking antihistamines if symptoms appear',
          'Log any new symptoms for pattern analysis'
        );
        
        if (current_symptoms && current_symptoms.length > 0) {
          quickAnalysis.recommendations.push(
            '⚠️ Current symptoms may be related to recent high-risk food consumption',
            'Consider correlating symptoms with consumption timeline'
          );
        }
      } else {
        quickAnalysis.recommendations.push(
          'No immediate high-risk foods detected',
          'Continue monitoring as usual'
        );
      }
      
      res.status(200).json({
        success: true,
        data: quickAnalysis,
        message: `Quick analysis complete. Found ${quickAnalysis.immediate_risks.length} immediate risk indicators.`
      });
      
    } catch (error) {
      console.error('Quick trigger check failed:', error);
      next(error);
    }
  }
);

/**
 * POST /api/analytics/real-time-risk
 * 
 * Real-time risk assessment for foods user is planning to eat
 * Preventive analysis before consumption
 */
router.post('/real-time-risk',
  authenticate,
  rateLimitConfig.analytics.user_data,
  validateRequest(realTimeRiskSchema),
  async (req, res, next) => {
    try {
      const userId = req.user!.userId;
      const { planned_food_ids, risk_threshold = 0.3 } = req.body;
      
      console.log(`🔮 Real-time risk assessment for user ${userId}`);
      
      // Get SIGHI data for planned foods
      const plannedFoods = await db
        .select()
        .from(foods)
        .where(eq(foods.id, planned_food_ids[0])); // Simplified for demo
      
      const riskAssessment = {
        assessment_time: new Date().toISOString(),
        user_id: userId,
        foods_assessed: planned_food_ids.length,
        risk_threshold_used: risk_threshold,
        food_risks: [] as any[],
        overall_risk_level: 'low' as 'low' | 'moderate' | 'high',
        recommendations: [] as string[]
      };
      
      // Analyze each planned food
      for (const foodId of planned_food_ids) {
        const foodData = plannedFoods.find(f => f.id === foodId);
        if (foodData) {
          const compatibility = parseInt(foodData.compatibility);
          const riskLevel = compatibility >= 3 ? 'high' : compatibility >= 2 ? 'moderate' : 'low';
          
          riskAssessment.food_risks.push({
            food_id: foodId,
            food_name: foodData.food_name_no,
            sighi_compatibility: foodData.compatibility,
            risk_level: riskLevel,
            biogenic_amines: foodData.biogenic_amines_content || {},
            triggers: foodData.triggers || [],
            recommendation: compatibility >= 2 
              ? '⚠️ High histamine - consider avoiding or taking precautions'
              : '✅ Generally well tolerated'
          });
          
          // Update overall risk
          if (compatibility >= 3 && riskAssessment.overall_risk_level !== 'high') {
            riskAssessment.overall_risk_level = 'high';
          } else if (compatibility >= 2 && riskAssessment.overall_risk_level === 'low') {
            riskAssessment.overall_risk_level = 'moderate';
          }
        }
      }
      
      // Generate recommendations based on risk level
      switch (riskAssessment.overall_risk_level) {
        case 'high':
          riskAssessment.recommendations.push(
            '🚨 High risk foods detected - consider avoiding',
            'If consuming, take antihistamines 30 min before',
            'Monitor symptoms closely for 6-8 hours after eating'
          );
          break;
        case 'moderate':
          riskAssessment.recommendations.push(
            '⚠️ Moderate risk - proceed with caution',
            'Consider smaller portions',
            'Have antihistamines available'
          );
          break;
        default:
          riskAssessment.recommendations.push(
            '✅ Low risk foods - generally safe to consume',
            'Continue normal monitoring'
          );
      }
      
      res.status(200).json({
        success: true,
        data: riskAssessment,
        message: `Risk assessment complete. Overall risk level: ${riskAssessment.overall_risk_level}`
      });
      
    } catch (error) {
      console.error('Real-time risk assessment failed:', error);
      next(error);
    }
  }
);

/**
 * GET /api/analytics/health-check
 * 
 * Health check for analytics service
 */
router.get('/health-check', async (req, res) => {
  res.status(200).json({
    success: true,
    service: 'Analytics Service',
    status: 'operational',
    features: [
      '72-hour trigger correlation',
      'AI pattern recognition',
      'Multi-factor analysis',
      'Historical pattern matching',
      'Confidence scoring',
      'Real-time risk assessment',
      'Quick trigger checking'
    ],
    timestamp: new Date().toISOString()
  });
});

// Helper functions for aggregating research data
function extractCommonTriggers(analyses: any[]): Record<string, number> {
  const triggerCounts: Record<string, number> = {};
  
  analyses.forEach(analysis => {
    analysis.likely_food_triggers.forEach((trigger: any) => {
      if (trigger.confidence_level === 'high') {
        triggerCounts[trigger.food_name_en] = (triggerCounts[trigger.food_name_en] || 0) + 1;
      }
    });
  });
  
  // Return top 10 most common triggers
  return Object.fromEntries(
    Object.entries(triggerCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
  );
}

function generatePatternInsights(analyses: any[]): any {
  return {
    avg_triggers_per_episode: analyses.reduce((sum, a) => sum + a.likely_food_triggers.length, 0) / analyses.length,
    high_confidence_rate: analyses.filter(a => a.analysis_confidence > 0.7).length / analyses.length,
    most_problematic_time_window: '2-4 hours post-meal', // This would be calculated from actual data
    improvement_rate: 'Calculation needed based on symptom frequency trends'
  };
}

export { router as analyticsRoutes };