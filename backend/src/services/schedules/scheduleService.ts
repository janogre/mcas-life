/**
 * Schedule Service - Core business logic for recurring schedules
 * Handles medications, meals, and activities with skip/pause functionality
 */

import { db } from '../../db/index.js';
import {
  recurringSchedules,
  schedulePauses,
  scheduleSkippedInstances,
  type RecurringSchedule,
  type NewRecurringSchedule,
  type SchedulePause,
  type NewSchedulePause,
  type SkippedInstance,
  type NewSkippedInstance
} from '../../db/schema.js';
import { eq, and, gte, lte, desc, asc } from 'drizzle-orm';

// Type definitions for service layer
export interface CreateScheduleInput {
  schedule_type: 'medication' | 'meal' | 'activity';
  frequency_type: 'daily' | 'weekly' | 'interval';
  weekly_days?: number[]; // [0=Sunday, 1=Monday, ..., 6=Saturday]
  interval_count?: number;
  interval_unit?: 'days' | 'weeks';
  scheduled_times: string[]; // ["08:00", "12:00", "18:00"]
  start_date: Date;
  end_date?: Date;

  // Medication-specific
  medication_catalog_id?: number;
  medication_custom_name?: string;
  medication_type?: 'mcas' | 'prescription' | 'over_counter' | 'supplement';
  dosage?: string;
  dosage_unit?: string;

  // Meal-specific
  meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
  meal_recipe_id?: number;
  meal_foods?: Array<{food_id: number; amount: number; unit: string}>;

  // Activity-specific
  activity_type?: 'temperature_change' | 'social_trigger' | 'physical_activity';
  activity_duration_minutes?: number;

  notes?: string;
}

export interface ScheduleFilters {
  schedule_type?: 'medication' | 'meal' | 'activity';
  is_active?: boolean;
}

export interface ScheduleInstance {
  schedule_id: number;
  date: string; // ISO date string YYYY-MM-DD
  time: string; // HH:MM
  schedule: RecurringSchedule;
}

export interface PauseScheduleInput {
  pause_start_date: Date;
  pause_end_date: Date;
  reason?: string;
}

class ScheduleService {
  /**
   * Create a new recurring schedule
   */
  async createSchedule(userId: number, data: CreateScheduleInput): Promise<RecurringSchedule> {
    // Validation
    this.validateScheduleInput(data);

    const scheduleData: NewRecurringSchedule = {
      user_id: userId,
      schedule_type: data.schedule_type,
      frequency_type: data.frequency_type,
      weekly_days: data.weekly_days,
      interval_count: data.interval_count,
      interval_unit: data.interval_unit,
      scheduled_times: data.scheduled_times,
      start_date: data.start_date.toISOString().split('T')[0],
      end_date: data.end_date ? data.end_date.toISOString().split('T')[0] : null,
      is_active: true,

      // Type-specific fields
      medication_catalog_id: data.medication_catalog_id,
      medication_custom_name: data.medication_custom_name,
      medication_type: data.medication_type,
      dosage: data.dosage,
      dosage_unit: data.dosage_unit,

      meal_type: data.meal_type,
      meal_recipe_id: data.meal_recipe_id,
      meal_foods: data.meal_foods,

      activity_type: data.activity_type,
      activity_duration_minutes: data.activity_duration_minutes,

      notes: data.notes
    };

    const [schedule] = await db.insert(recurringSchedules).values(scheduleData).returning();
    return schedule;
  }

  /**
   * Get a specific schedule by ID (with authorization check)
   */
  async getSchedule(scheduleId: number, userId: number): Promise<RecurringSchedule | null> {
    const [schedule] = await db
      .select()
      .from(recurringSchedules)
      .where(and(
        eq(recurringSchedules.id, scheduleId),
        eq(recurringSchedules.user_id, userId)
      ))
      .limit(1);

    return schedule || null;
  }

  /**
   * Get all schedules for a user with optional filters
   */
  async getUserSchedules(userId: number, filters?: ScheduleFilters): Promise<RecurringSchedule[]> {
    let conditions = [eq(recurringSchedules.user_id, userId)];

    if (filters?.schedule_type) {
      conditions.push(eq(recurringSchedules.schedule_type, filters.schedule_type));
    }

    if (filters?.is_active !== undefined) {
      conditions.push(eq(recurringSchedules.is_active, filters.is_active));
    }

    const schedules = await db
      .select()
      .from(recurringSchedules)
      .where(and(...conditions))
      .orderBy(desc(recurringSchedules.created_at));

    return schedules;
  }

  /**
   * Update a schedule
   */
  async updateSchedule(
    scheduleId: number,
    userId: number,
    updates: Partial<CreateScheduleInput>
  ): Promise<RecurringSchedule> {
    // Check authorization
    const existing = await this.getSchedule(scheduleId, userId);
    if (!existing) {
      throw new Error('Schedule not found or unauthorized');
    }

    // Build update object
    const updateData: Partial<NewRecurringSchedule> = {
      updated_at: new Date()
    };

    // Map input fields to database fields
    if (updates.frequency_type) updateData.frequency_type = updates.frequency_type;
    if (updates.weekly_days) updateData.weekly_days = updates.weekly_days;
    if (updates.interval_count !== undefined) updateData.interval_count = updates.interval_count;
    if (updates.interval_unit) updateData.interval_unit = updates.interval_unit;
    if (updates.scheduled_times) updateData.scheduled_times = updates.scheduled_times;
    if (updates.start_date) updateData.start_date = updates.start_date.toISOString().split('T')[0];
    if (updates.end_date !== undefined) {
      updateData.end_date = updates.end_date ? updates.end_date.toISOString().split('T')[0] : null;
    }

    // Medication fields
    if (updates.medication_catalog_id !== undefined) updateData.medication_catalog_id = updates.medication_catalog_id;
    if (updates.medication_custom_name !== undefined) updateData.medication_custom_name = updates.medication_custom_name;
    if (updates.medication_type) updateData.medication_type = updates.medication_type;
    if (updates.dosage !== undefined) updateData.dosage = updates.dosage;
    if (updates.dosage_unit !== undefined) updateData.dosage_unit = updates.dosage_unit;

    // Meal fields
    if (updates.meal_type) updateData.meal_type = updates.meal_type;
    if (updates.meal_recipe_id !== undefined) updateData.meal_recipe_id = updates.meal_recipe_id;
    if (updates.meal_foods) updateData.meal_foods = updates.meal_foods;

    // Activity fields
    if (updates.activity_type) updateData.activity_type = updates.activity_type;
    if (updates.activity_duration_minutes !== undefined) updateData.activity_duration_minutes = updates.activity_duration_minutes;

    // Notes
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const [updated] = await db
      .update(recurringSchedules)
      .set(updateData)
      .where(eq(recurringSchedules.id, scheduleId))
      .returning();

    return updated;
  }

  /**
   * Delete a schedule (cascades to pauses, skipped instances, notifications)
   */
  async deleteSchedule(scheduleId: number, userId: number): Promise<void> {
    const existing = await this.getSchedule(scheduleId, userId);
    if (!existing) {
      throw new Error('Schedule not found or unauthorized');
    }

    await db.delete(recurringSchedules).where(eq(recurringSchedules.id, scheduleId));
  }

  /**
   * Toggle schedule active/inactive
   */
  async toggleScheduleActive(scheduleId: number, userId: number, isActive: boolean): Promise<void> {
    const existing = await this.getSchedule(scheduleId, userId);
    if (!existing) {
      throw new Error('Schedule not found or unauthorized');
    }

    await db
      .update(recurringSchedules)
      .set({ is_active: isActive, updated_at: new Date() })
      .where(eq(recurringSchedules.id, scheduleId));
  }

  /**
   * Pause a schedule for a specific date range
   */
  async pauseSchedule(
    scheduleId: number,
    userId: number,
    pauseData: PauseScheduleInput
  ): Promise<SchedulePause> {
    const existing = await this.getSchedule(scheduleId, userId);
    if (!existing) {
      throw new Error('Schedule not found or unauthorized');
    }

    // Validate dates
    if (pauseData.pause_start_date >= pauseData.pause_end_date) {
      throw new Error('Pause end date must be after start date');
    }

    const [pause] = await db.insert(schedulePauses).values({
      schedule_id: scheduleId,
      pause_start_date: pauseData.pause_start_date.toISOString().split('T')[0],
      pause_end_date: pauseData.pause_end_date.toISOString().split('T')[0],
      reason: pauseData.reason
    }).returning();

    return pause;
  }

  /**
   * Resume a schedule by deleting a pause period
   */
  async resumeSchedule(scheduleId: number, userId: number, pauseId: number): Promise<void> {
    const existing = await this.getSchedule(scheduleId, userId);
    if (!existing) {
      throw new Error('Schedule not found or unauthorized');
    }

    await db
      .delete(schedulePauses)
      .where(and(
        eq(schedulePauses.id, pauseId),
        eq(schedulePauses.schedule_id, scheduleId)
      ));
  }

  /**
   * Get all pause periods for a schedule
   */
  async getPausePeriods(scheduleId: number, userId: number): Promise<SchedulePause[]> {
    const existing = await this.getSchedule(scheduleId, userId);
    if (!existing) {
      throw new Error('Schedule not found or unauthorized');
    }

    return await db
      .select()
      .from(schedulePauses)
      .where(eq(schedulePauses.schedule_id, scheduleId))
      .orderBy(asc(schedulePauses.pause_start_date));
  }

  /**
   * Skip a specific instance of a schedule
   */
  async skipInstance(
    scheduleId: number,
    userId: number,
    date: Date,
    time: string,
    reason?: string
  ): Promise<SkippedInstance> {
    const existing = await this.getSchedule(scheduleId, userId);
    if (!existing) {
      throw new Error('Schedule not found or unauthorized');
    }

    const [skipped] = await db.insert(scheduleSkippedInstances).values({
      schedule_id: scheduleId,
      skipped_date: date.toISOString().split('T')[0],
      skipped_time: time,
      reason
    }).returning();

    return skipped;
  }

  /**
   * Unskip a previously skipped instance
   */
  async unskipInstance(scheduleId: number, userId: number, date: Date, time: string): Promise<void> {
    const existing = await this.getSchedule(scheduleId, userId);
    if (!existing) {
      throw new Error('Schedule not found or unauthorized');
    }

    await db
      .delete(scheduleSkippedInstances)
      .where(and(
        eq(scheduleSkippedInstances.schedule_id, scheduleId),
        eq(scheduleSkippedInstances.skipped_date, date.toISOString().split('T')[0]),
        eq(scheduleSkippedInstances.skipped_time, time)
      ));
  }

  /**
   * Get all skipped instances for a schedule
   */
  async getSkippedInstances(scheduleId: number, userId: number): Promise<SkippedInstance[]> {
    const existing = await this.getSchedule(scheduleId, userId);
    if (!existing) {
      throw new Error('Schedule not found or unauthorized');
    }

    return await db
      .select()
      .from(scheduleSkippedInstances)
      .where(eq(scheduleSkippedInstances.schedule_id, scheduleId))
      .orderBy(desc(scheduleSkippedInstances.skipped_date));
  }

  /**
   * Generate schedule instances for a date range
   * This is the core algorithm for computing when schedules occur
   */
  async generateInstances(
    scheduleId: number,
    userId: number,
    fromDate: Date,
    toDate: Date
  ): Promise<ScheduleInstance[]> {
    const schedule = await this.getSchedule(scheduleId, userId);
    if (!schedule || !schedule.is_active) {
      return [];
    }

    // Get skip and pause data
    const skippedInstances = await this.getSkippedInstances(scheduleId, userId);
    const pausePeriods = await this.getPausePeriods(scheduleId, userId);

    const instances: ScheduleInstance[] = [];

    // Parse schedule dates
    const scheduleStart = new Date(schedule.start_date);
    const scheduleEnd = schedule.end_date ? new Date(schedule.end_date) : null;

    // Determine actual range to iterate
    const startDate = new Date(Math.max(fromDate.getTime(), scheduleStart.getTime()));
    const endDate = scheduleEnd
      ? new Date(Math.min(toDate.getTime(), scheduleEnd.getTime()))
      : toDate;

    if (startDate > endDate) {
      return [];
    }

    // Iterate through each day in range
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];

      // Check if this date should have instances based on frequency
      if (this.shouldDateOccur(schedule, currentDate, scheduleStart)) {
        // Check if date is within a pause period
        if (!this.isDatePaused(currentDate, pausePeriods)) {
          // Generate instances for each scheduled time
          for (const time of schedule.scheduled_times as string[]) {
            // Check if this specific instance is skipped
            if (!this.isInstanceSkipped(dateStr, time, skippedInstances)) {
              instances.push({
                schedule_id: schedule.id,
                date: dateStr,
                time,
                schedule
              });
            }
          }
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return instances;
  }

  /**
   * Get upcoming instances for a user across all active schedules
   */
  async getUpcomingInstances(userId: number, daysAhead: number = 7): Promise<ScheduleInstance[]> {
    const schedules = await this.getUserSchedules(userId, { is_active: true });

    const fromDate = new Date();
    fromDate.setHours(0, 0, 0, 0);

    const toDate = new Date();
    toDate.setDate(toDate.getDate() + daysAhead);
    toDate.setHours(23, 59, 59, 999);

    const allInstances: ScheduleInstance[] = [];

    for (const schedule of schedules) {
      const instances = await this.generateInstances(schedule.id, userId, fromDate, toDate);
      allInstances.push(...instances);
    }

    // Sort by date and time
    allInstances.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

    return allInstances;
  }

  /**
   * Check if a specific instance is skipped
   */
  private isInstanceSkipped(
    dateStr: string,
    time: string,
    skippedInstances: SkippedInstance[]
  ): boolean {
    return skippedInstances.some(
      skip => skip.skipped_date === dateStr && skip.skipped_time === time
    );
  }

  /**
   * Check if a date is within any pause period
   */
  private isDatePaused(date: Date, pausePeriods: SchedulePause[]): boolean {
    const dateStr = date.toISOString().split('T')[0];

    return pausePeriods.some(pause =>
      dateStr >= pause.pause_start_date && dateStr <= pause.pause_end_date
    );
  }

  /**
   * Determine if a date should have instances based on schedule frequency
   */
  private shouldDateOccur(schedule: RecurringSchedule, date: Date, scheduleStart: Date): boolean {
    switch (schedule.frequency_type) {
      case 'daily':
        return true; // Every day

      case 'weekly':
        if (!schedule.weekly_days) return false;
        const weekday = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
        return (schedule.weekly_days as number[]).includes(weekday);

      case 'interval':
        if (!schedule.interval_count || !schedule.interval_unit) return false;

        const daysSinceStart = Math.floor(
          (date.getTime() - scheduleStart.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (schedule.interval_unit === 'days') {
          return daysSinceStart % schedule.interval_count === 0;
        } else if (schedule.interval_unit === 'weeks') {
          const weeksSinceStart = Math.floor(daysSinceStart / 7);
          return weeksSinceStart % schedule.interval_count === 0 && date.getDay() === scheduleStart.getDay();
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Validate schedule input data
   */
  private validateScheduleInput(data: CreateScheduleInput): void {
    // Validate schedule type
    if (!['medication', 'meal', 'activity'].includes(data.schedule_type)) {
      throw new Error('Invalid schedule type');
    }

    // Validate frequency type
    if (!['daily', 'weekly', 'interval'].includes(data.frequency_type)) {
      throw new Error('Invalid frequency type');
    }

    // Validate frequency-specific fields
    if (data.frequency_type === 'weekly' && (!data.weekly_days || data.weekly_days.length === 0)) {
      throw new Error('Weekly schedules must specify at least one day');
    }

    if (data.frequency_type === 'interval') {
      if (!data.interval_count || data.interval_count < 1) {
        throw new Error('Interval schedules must have a positive interval count');
      }
      if (!data.interval_unit || !['days', 'weeks'].includes(data.interval_unit)) {
        throw new Error('Interval schedules must specify days or weeks');
      }
    }

    // Validate times
    if (!data.scheduled_times || data.scheduled_times.length === 0) {
      throw new Error('At least one scheduled time is required');
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    for (const time of data.scheduled_times) {
      if (!timeRegex.test(time)) {
        throw new Error(`Invalid time format: ${time}. Expected HH:MM`);
      }
    }

    // Validate dates
    if (data.end_date && data.end_date <= data.start_date) {
      throw new Error('End date must be after start date');
    }

    // Type-specific validation
    if (data.schedule_type === 'medication') {
      if (!data.medication_catalog_id && !data.medication_custom_name) {
        throw new Error('Medication schedules must have either catalog_id or custom_name');
      }
    }

    if (data.schedule_type === 'meal') {
      if (!data.meal_type) {
        throw new Error('Meal schedules must specify meal_type');
      }
    }

    if (data.schedule_type === 'activity') {
      if (!data.activity_type) {
        throw new Error('Activity schedules must specify activity_type');
      }
    }
  }
}

export const scheduleService = new ScheduleService();
