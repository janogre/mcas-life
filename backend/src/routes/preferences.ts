/**
 * User Preferences Routes
 *
 * API endpoints for managing user preferences including analysis mode
 */

import { Router } from 'express';
import { db } from '../db/index.js';
import { userPreferences } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/preferences/analysis-mode
 * Get user's analysis mode preference
 */
router.get('/analysis-mode', authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;

    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.user_id, userId))
      .limit(1);

    if (!prefs) {
      // Return default if no preferences exist yet
      return res.json({
        success: true,
        analysis_mode: 'smart',
      });
    }

    res.json({
      success: true,
      analysis_mode: prefs.analysis_mode || 'smart',
    });
  } catch (error) {
    console.error('Error fetching analysis mode:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analysis mode preference',
    });
  }
});

/**
 * PUT /api/preferences/analysis-mode
 * Update user's analysis mode preference
 */
router.put('/analysis-mode', authenticate, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { analysis_mode } = req.body;

    // Validate analysis_mode
    if (!analysis_mode || !['smart', 'ai'].includes(analysis_mode)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid analysis_mode. Must be "smart" or "ai"',
      });
    }

    // Check if preferences exist
    const [existingPrefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.user_id, userId))
      .limit(1);

    if (existingPrefs) {
      // Update existing preferences
      await db
        .update(userPreferences)
        .set({
          analysis_mode,
          updated_at: new Date(),
        })
        .where(eq(userPreferences.user_id, userId));
    } else {
      // Create new preferences entry
      await db.insert(userPreferences).values({
        user_id: userId,
        analysis_mode,
        notification_preferences: {
          supplement_reminders: false,
          daily_check_in: false,
          symptom_followup: false,
          trigger_alerts: false,
          pattern_insights: false,
          community_updates: false,
          research_participation: false,
          push_notifications: false,
          email_notifications: false,
          sms_notifications: false,
        },
        privacy_settings: {
          share_anonymous_data: false,
          share_improvement_data: false,
          public_profile: false,
          show_in_expert_network: false,
          allow_expert_contact: false,
          share_reports_with_doctors: false,
          auto_delete_old_data: false,
          data_retention_months: 24,
        },
      });
    }

    console.log(`✅ Updated analysis mode for user ${userId} to: ${analysis_mode}`);

    res.json({
      success: true,
      analysis_mode,
      message: `Analysis mode updated to ${analysis_mode}`,
    });
  } catch (error) {
    console.error('Error updating analysis mode:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update analysis mode preference',
    });
  }
});

export { router as preferencesRoutes };
