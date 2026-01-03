/**
 * Type definitions for the Schedule Service
 */

import type { RecurringSchedule } from '../../db/schema.js';

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

export interface CalendarMonthData {
  instances: Array<{
    date: string;
    times: string[];
    statuses: ('scheduled' | 'skipped')[];
  }>;
  pauses: Array<{
    start_date: string;
    end_date: string;
    reason?: string;
  }>;
}
