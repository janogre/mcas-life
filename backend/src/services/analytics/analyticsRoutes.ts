/**
 * Analytics API Routes - AI-Driven Symptom Correlation
 * 
 * RESTful endpoints for trigger analysis and pattern recognition
 */

import { Router } from 'express';
import { z } from 'zod';
import { analyticsService } from './analyticsService.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validation.js';
import { rateLimitConfig } from '../../middleware/rateLimiting.js';

const router = Router();

// Validation schemas
const triggerAnalysisSchema = z.object({
  symptom_entry_id: z.number().int().positive(),
  analysis_window_hours: z.number().int().min(12).max(168).optional() // 12 hours to 1 week
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
 * This is the core AI correlation feature
 */
router.post('/trigger-correlation', 
  authenticate,
  rateLimitConfig.analytics.trigger_analysis, // 5 requests per 15 minutes
  validateRequest(triggerAnalysisSchema),
  async (req, res, next) => {
    try {
      const userId = req.user.userId;
      const { symptom_entry_id, analysis_window_hours } = req.body;
      
      console.log(`🔍 Starting trigger correlation analysis for user ${userId}, symptom ${symptom_entry_id}`);
      
      // Perform AI correlation analysis
      const analysis = await analyticsService.analyzeTriggerCorrelation({
        user_id: userId,
        symptom_entry_id,
        analysis_window_hours
      });
      
      res.status(200).json({
        success: true,
        data: analysis,
        message: `Analysis complete. Found ${analysis.likely_food_triggers.length} potential triggers with ${(analysis.analysis_confidence * 100).toFixed(1)}% confidence.`
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
      const userId = req.user.userId;
      const { limit = 10, confidence_threshold = 0.0 } = req.query;
      
      const analyses = await analyticsService.getUserTriggerAnalyses(
        userId, 
        parseInt(limit as string)
      );
      
      // Filter by confidence threshold if specified
      const filteredAnalyses = confidence_threshold > 0 
        ? analyses.filter(a => a.analysis_confidence >= parseFloat(confidence_threshold as string))
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
        common_triggers: this.extractCommonTriggers(analyses),
        pattern_insights: this.generatePatternInsights(analyses)
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
            user_id: req.user.userId,
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
      'Confidence scoring'
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