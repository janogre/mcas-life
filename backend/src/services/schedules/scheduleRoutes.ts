/**
 * API Routes for Recurring Schedules
 * Handles CRUD operations, instance management, and push notifications
 */

import { Router, Request, Response } from 'express';
import { scheduleService } from './scheduleService.js';
import { notificationService } from './notificationService.js';
import { authenticateToken } from '../auth/index.js';
import type { CreateScheduleInput, PauseScheduleInput, ScheduleFilters } from './types.js';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * GET /api/schedules
 * Get all schedules for the authenticated user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const filters: ScheduleFilters = {};
    if (req.query.type) {
      filters.schedule_type = req.query.type as 'medication' | 'meal' | 'activity';
    }
    if (req.query.active !== undefined) {
      filters.is_active = req.query.active === 'true';
    }

    const schedules = await scheduleService.getUserSchedules(userId, filters);
    res.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

/**
 * POST /api/schedules
 * Create a new schedule
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const scheduleData: CreateScheduleInput = {
      ...req.body,
      start_date: new Date(req.body.start_date),
      end_date: req.body.end_date ? new Date(req.body.end_date) : undefined
    };

    const schedule = await scheduleService.createSchedule(userId, scheduleData);

    // Schedule notifications for the next 7 days
    await notificationService.scheduleNotifications(schedule.id, userId, 7);

    res.status(201).json(schedule);
  } catch (error: any) {
    console.error('Error creating schedule:', error);
    if (error.message.includes('Invalid') || error.message.includes('must')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

/**
 * GET /api/schedules/upcoming/all
 * Get upcoming instances across all active schedules
 * IMPORTANT: Must be before /:id route to avoid matching "upcoming" as an ID
 */
router.get('/upcoming/all', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const daysAhead = req.query.days ? parseInt(req.query.days as string) : 7;
    const instances = await scheduleService.getUpcomingInstances(userId, daysAhead);

    res.json(instances);
  } catch (error) {
    console.error('Error fetching upcoming instances:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming instances' });
  }
});

/**
 * GET /api/schedules/:id
 * Get a specific schedule
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const scheduleId = parseInt(req.params.id);
    const schedule = await scheduleService.getSchedule(scheduleId, userId);

    if (!schedule) {
      return res.status(404).json({ error: 'Schedule not found' });
    }

    res.json(schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

/**
 * PUT /api/schedules/:id
 * Update a schedule
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const scheduleId = parseInt(req.params.id);
    const updates = {
      ...req.body,
      start_date: req.body.start_date ? new Date(req.body.start_date) : undefined,
      end_date: req.body.end_date ? new Date(req.body.end_date) : undefined
    };

    const schedule = await scheduleService.updateSchedule(scheduleId, userId, updates);

    // Reschedule notifications
    await notificationService.cancelScheduledNotifications(scheduleId);
    await notificationService.scheduleNotifications(scheduleId, userId, 7);

    res.json(schedule);
  } catch (error: any) {
    console.error('Error updating schedule:', error);
    if (error.message.includes('not found') || error.message.includes('unauthorized')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Invalid') || error.message.includes('must')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

/**
 * DELETE /api/schedules/:id
 * Delete a schedule
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const scheduleId = parseInt(req.params.id);
    await scheduleService.deleteSchedule(scheduleId, userId);

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting schedule:', error);
    if (error.message.includes('not found') || error.message.includes('unauthorized')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

/**
 * PUT /api/schedules/:id/toggle
 * Toggle schedule active/inactive
 */
router.put('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const scheduleId = parseInt(req.params.id);
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }

    await scheduleService.toggleScheduleActive(scheduleId, userId, is_active);

    if (is_active) {
      // Re-enable notifications
      await notificationService.scheduleNotifications(scheduleId, userId, 7);
    } else {
      // Cancel notifications
      await notificationService.cancelScheduledNotifications(scheduleId);
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Error toggling schedule:', error);
    if (error.message.includes('not found') || error.message.includes('unauthorized')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to toggle schedule' });
  }
});

/**
 * GET /api/schedules/:id/instances
 * Get instances for a schedule within a date range
 */
router.get('/:id/instances', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const scheduleId = parseInt(req.params.id);
    const fromDate = req.query.from ? new Date(req.query.from as string) : new Date();
    const toDate = req.query.to
      ? new Date(req.query.to as string)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    const instances = await scheduleService.generateInstances(scheduleId, userId, fromDate, toDate);
    res.json(instances);
  } catch (error) {
    console.error('Error fetching instances:', error);
    res.status(500).json({ error: 'Failed to fetch instances' });
  }
});

/**
 * POST /api/schedules/:id/skip-instance
 * Skip a specific instance
 */
router.post('/:id/skip-instance', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const scheduleId = parseInt(req.params.id);
    const { date, time, reason } = req.body;

    if (!date || !time) {
      return res.status(400).json({ error: 'date and time are required' });
    }

    const skipped = await scheduleService.skipInstance(
      scheduleId,
      userId,
      new Date(date),
      time,
      reason
    );

    res.status(201).json(skipped);
  } catch (error: any) {
    console.error('Error skipping instance:', error);
    if (error.message.includes('not found') || error.message.includes('unauthorized')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'Instance already skipped' });
    }
    res.status(500).json({ error: 'Failed to skip instance' });
  }
});

/**
 * DELETE /api/schedules/:id/skip-instance
 * Unskip a previously skipped instance
 */
router.delete('/:id/skip-instance', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const scheduleId = parseInt(req.params.id);
    const { date, time } = req.body;

    if (!date || !time) {
      return res.status(400).json({ error: 'date and time are required' });
    }

    await scheduleService.unskipInstance(scheduleId, userId, new Date(date), time);
    res.status(204).send();
  } catch (error: any) {
    console.error('Error unskipping instance:', error);
    if (error.message.includes('not found') || error.message.includes('unauthorized')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to unskip instance' });
  }
});

/**
 * GET /api/schedules/:id/skipped-instances
 * Get all skipped instances for a schedule
 */
router.get('/:id/skipped-instances', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const scheduleId = parseInt(req.params.id);
    const skipped = await scheduleService.getSkippedInstances(scheduleId, userId);

    res.json(skipped);
  } catch (error: any) {
    console.error('Error fetching skipped instances:', error);
    if (error.message.includes('not found') || error.message.includes('unauthorized')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch skipped instances' });
  }
});

/**
 * GET /api/schedules/:id/pauses
 * Get all pause periods for a schedule
 */
router.get('/:id/pauses', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const scheduleId = parseInt(req.params.id);
    const pauses = await scheduleService.getPausePeriods(scheduleId, userId);

    res.json(pauses);
  } catch (error: any) {
    console.error('Error fetching pause periods:', error);
    if (error.message.includes('not found') || error.message.includes('unauthorized')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to fetch pause periods' });
  }
});

/**
 * POST /api/schedules/:id/pauses
 * Create a pause period for a schedule
 */
router.post('/:id/pauses', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const scheduleId = parseInt(req.params.id);
    const pauseData: PauseScheduleInput = {
      pause_start_date: new Date(req.body.pause_start_date),
      pause_end_date: new Date(req.body.pause_end_date),
      reason: req.body.reason
    };

    const pause = await scheduleService.pauseSchedule(scheduleId, userId, pauseData);

    // Cancel notifications during pause period
    await notificationService.cancelScheduledNotifications(scheduleId);
    await notificationService.scheduleNotifications(scheduleId, userId, 7);

    res.status(201).json(pause);
  } catch (error: any) {
    console.error('Error creating pause:', error);
    if (error.message.includes('not found') || error.message.includes('unauthorized')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('must be after')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create pause period' });
  }
});

/**
 * DELETE /api/schedules/:id/pauses/:pauseId
 * Resume a schedule by deleting a pause period
 */
router.delete('/:id/pauses/:pauseId', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const scheduleId = parseInt(req.params.id);
    const pauseId = parseInt(req.params.pauseId);

    await scheduleService.resumeSchedule(scheduleId, userId, pauseId);

    // Reschedule notifications
    await notificationService.cancelScheduledNotifications(scheduleId);
    await notificationService.scheduleNotifications(scheduleId, userId, 7);

    res.status(204).send();
  } catch (error: any) {
    console.error('Error resuming schedule:', error);
    if (error.message.includes('not found') || error.message.includes('unauthorized')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to resume schedule' });
  }
});

/**
 * GET /api/schedules/:id/calendar-month
 * Get calendar data for a specific month
 */
router.get('/:id/calendar-month', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const scheduleId = parseInt(req.params.id);
    const year = parseInt(req.query.year as string);
    const month = parseInt(req.query.month as string); // 1-12

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }

    // Get first and last day of month
    const fromDate = new Date(year, month - 1, 1);
    const toDate = new Date(year, month, 0); // Last day of month

    // Get instances (excludes skipped), pauses, and skipped instances
    const instances = await scheduleService.generateInstances(scheduleId, userId, fromDate, toDate);
    const pauses = await scheduleService.getPausePeriods(scheduleId, userId);
    const skipped = await scheduleService.getSkippedInstances(scheduleId, userId);

    // Group instances by date
    const instancesByDate = new Map<string, { times: string[]; statuses: ('scheduled' | 'skipped')[] }>();

    // First add all scheduled instances (these are not skipped)
    instances.forEach(instance => {
      if (!instancesByDate.has(instance.date)) {
        instancesByDate.set(instance.date, { times: [], statuses: [] });
      }
      const dayData = instancesByDate.get(instance.date)!;
      dayData.times.push(instance.time);
      dayData.statuses.push('scheduled');
    });

    // Then add all skipped instances (these were excluded from generateInstances)
    skipped.forEach(skip => {
      const skipDate = skip.skipped_date;
      const skipTime = skip.skipped_time;

      // Only include if within the month we're viewing
      if (skipDate >= fromDate.toISOString().split('T')[0] &&
          skipDate <= toDate.toISOString().split('T')[0]) {
        if (!instancesByDate.has(skipDate)) {
          instancesByDate.set(skipDate, { times: [], statuses: [] });
        }
        const dayData = instancesByDate.get(skipDate)!;

        // Check if this time is already in the list (shouldn't be, since generateInstances excludes skipped)
        const existingIndex = dayData.times.indexOf(skipTime);
        if (existingIndex >= 0) {
          // Already there, just mark as skipped
          dayData.statuses[existingIndex] = 'skipped';
        } else {
          // Not there, add it as skipped
          dayData.times.push(skipTime);
          dayData.statuses.push('skipped');
        }
      }
    });

    // Convert to array and sort times
    const calendarInstances = Array.from(instancesByDate.entries()).map(([date, data]) => {
      // Sort times and their corresponding statuses together
      const combined = data.times.map((time, i) => ({ time, status: data.statuses[i] }));
      combined.sort((a, b) => a.time.localeCompare(b.time));

      return {
        date,
        times: combined.map(c => c.time),
        statuses: combined.map(c => c.status)
      };
    });

    // Filter pauses to only include those relevant to this month
    const relevantPauses = pauses.filter(pause =>
      pause.pause_start_date <= toDate.toISOString().split('T')[0] &&
      pause.pause_end_date >= fromDate.toISOString().split('T')[0]
    ).map(pause => ({
      start_date: pause.pause_start_date,
      end_date: pause.pause_end_date,
      reason: pause.reason
    }));

    res.json({
      instances: calendarInstances,
      pauses: relevantPauses
    });
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    res.status(500).json({ error: 'Failed to fetch calendar data' });
  }
});

/**
 * POST /api/push/subscribe
 * Subscribe to push notifications
 */
router.post('/push/subscribe', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    const subscription = await notificationService.subscribeToPush(userId, {
      endpoint,
      keys
    });

    res.status(201).json(subscription);
  } catch (error) {
    console.error('Error subscribing to push:', error);
    res.status(500).json({ error: 'Failed to subscribe to push notifications' });
  }
});

/**
 * DELETE /api/push/unsubscribe
 * Unsubscribe from push notifications
 */
router.delete('/push/unsubscribe', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await notificationService.unsubscribeFromPush(userId);
    res.status(204).send();
  } catch (error) {
    console.error('Error unsubscribing from push:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from push notifications' });
  }
});

export default router;
