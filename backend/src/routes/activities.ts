import { Router, Request, Response } from 'express';
import { db } from '../db';
import { activityEntries } from '../db/schema';
import { authenticateToken } from '../services/auth/authMiddleware';
import { eq, desc, and } from 'drizzle-orm';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * POST /api/activities
 * Log a new activity entry
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const {
      activity_type,
      temperature_change_type,
      temperature_from,
      temperature_to,
      social_trigger_type,
      estimated_people_count,
      noise_level,
      physical_activity_type,
      intensity,
      duration_minutes,
      time_started,
      time_ended,
      location_description,
      notes,
      immediate_symptoms,
      symptom_description,
    } = req.body;

    // Validate required fields
    if (!activity_type || !time_started) {
      res.status(400).json({
        error: 'Missing required fields',
        required: ['activity_type', 'time_started']
      });
      return;
    }

    // Validate activity_type
    const validActivityTypes = ['temperature_change', 'social_trigger', 'physical_activity'];
    if (!validActivityTypes.includes(activity_type)) {
      res.status(400).json({
        error: 'Invalid activity_type',
        valid: validActivityTypes
      });
      return;
    }

    // Type-specific validation
    if (activity_type === 'temperature_change' && !temperature_change_type) {
      res.status(400).json({
        error: 'temperature_change_type is required for temperature_change activities'
      });
      return;
    }

    if (activity_type === 'physical_activity' && !intensity) {
      res.status(400).json({
        error: 'intensity is required for physical_activity activities'
      });
      return;
    }

    const [newActivity] = await db
      .insert(activityEntries)
      .values({
        user_id: userId,
        activity_type,
        temperature_change_type,
        temperature_from,
        temperature_to,
        social_trigger_type,
        estimated_people_count,
        noise_level,
        physical_activity_type,
        intensity,
        duration_minutes,
        time_started: new Date(time_started),
        time_ended: time_ended ? new Date(time_ended) : null,
        location_description,
        notes,
        immediate_symptoms: immediate_symptoms || false,
        symptom_description,
      })
      .returning();

    res.status(201).json({
      message: 'Activity logged successfully',
      data: newActivity,
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

/**
 * GET /api/activities
 * Get all activity entries for the authenticated user
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const { limit = '50', offset = '0', activity_type } = req.query;

    let query = db
      .select()
      .from(activityEntries)
      .where(eq(activityEntries.user_id, userId))
      .orderBy(desc(activityEntries.time_started))
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Filter by activity type if specified
    if (activity_type && typeof activity_type === 'string') {
      query = db
        .select()
        .from(activityEntries)
        .where(
          and(
            eq(activityEntries.user_id, userId),
            eq(activityEntries.activity_type, activity_type as any)
          )
        )
        .orderBy(desc(activityEntries.time_started))
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));
    }

    const activities = await query;

    res.json({
      data: activities,
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: activities.length,
      },
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

/**
 * GET /api/activities/:id
 * Get a specific activity entry
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const activityId = parseInt(req.params.id);
    if (isNaN(activityId)) {
      res.status(400).json({ error: 'Invalid activity ID' });
      return;
    }

    const [activity] = await db
      .select()
      .from(activityEntries)
      .where(
        and(
          eq(activityEntries.id, activityId),
          eq(activityEntries.user_id, userId)
        )
      );

    if (!activity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    res.json({ data: activity });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

/**
 * DELETE /api/activities/:id
 * Delete an activity entry
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const activityId = parseInt(req.params.id);
    if (isNaN(activityId)) {
      res.status(400).json({ error: 'Invalid activity ID' });
      return;
    }

    const [deletedActivity] = await db
      .delete(activityEntries)
      .where(
        and(
          eq(activityEntries.id, activityId),
          eq(activityEntries.user_id, userId)
        )
      )
      .returning();

    if (!deletedActivity) {
      res.status(404).json({ error: 'Activity not found' });
      return;
    }

    res.json({
      message: 'Activity deleted successfully',
      data: deletedActivity
    });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

export default router;
