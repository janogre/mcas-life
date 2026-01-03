-- Migration: Add Recurring Schedules for Medications, Meals, and Activities
-- Description: Adds tables for managing recurring schedules with skip/pause functionality
-- Date: 2026-01-01

-- Create enum types if they don't exist (they should exist from previous migrations)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'medication_type') THEN
    CREATE TYPE medication_type AS ENUM ('mcas', 'prescription', 'over_counter', 'supplement');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meal_type') THEN
    CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack', 'other');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_type') THEN
    CREATE TYPE activity_type AS ENUM ('temperature_change', 'social_trigger', 'physical_activity');
  END IF;
END $$;

-- Table: recurring_schedules
-- Purpose: Master schedule configuration for medications, meals, and activities
CREATE TABLE IF NOT EXISTS recurring_schedules (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- What is being scheduled
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('medication', 'meal', 'activity')),

  -- Schedule pattern
  frequency_type TEXT NOT NULL CHECK (frequency_type IN ('daily', 'weekly', 'interval')),
  -- For 'weekly': JSON array of weekday numbers [0=Sunday, 1=Monday, ..., 6=Saturday]
  -- e.g., [1, 3, 5] for Monday, Wednesday, Friday
  weekly_days JSONB,
  -- For 'interval': every N days/weeks
  interval_count INTEGER,
  interval_unit TEXT CHECK (interval_unit IN ('days', 'weeks')),

  -- Times during the day (can have multiple times per day)
  -- JSONB array of time strings: ["08:00", "12:00", "18:00"]
  scheduled_times JSONB NOT NULL,

  -- Date range
  start_date DATE NOT NULL,
  end_date DATE, -- NULL = ongoing indefinitely

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Medication-specific fields (NULL if not medication)
  medication_catalog_id INTEGER REFERENCES medications_catalog(id),
  medication_custom_name VARCHAR(255),
  medication_type medication_type,
  dosage VARCHAR(100),
  dosage_unit VARCHAR(20),

  -- Meal-specific fields (NULL if not meal)
  meal_type meal_type,
  meal_recipe_id INTEGER REFERENCES user_recipes(id),
  meal_foods JSONB, -- Array of {food_id, amount, unit}

  -- Activity-specific fields (NULL if not activity)
  activity_type activity_type,
  activity_duration_minutes INTEGER,

  -- Common fields
  notes TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for recurring_schedules
CREATE INDEX IF NOT EXISTS recurring_schedules_user_id_idx ON recurring_schedules(user_id);
CREATE INDEX IF NOT EXISTS recurring_schedules_type_idx ON recurring_schedules(schedule_type);
CREATE INDEX IF NOT EXISTS recurring_schedules_active_idx ON recurring_schedules(is_active);
CREATE INDEX IF NOT EXISTS recurring_schedules_user_active_idx ON recurring_schedules(user_id, is_active);

-- Table: schedule_pauses
-- Purpose: Temporary pause periods for schedules (e.g., vacation, illness)
CREATE TABLE IF NOT EXISTS schedule_pauses (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER NOT NULL REFERENCES recurring_schedules(id) ON DELETE CASCADE,

  pause_start_date DATE NOT NULL,
  pause_end_date DATE NOT NULL,
  reason TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for schedule_pauses
CREATE INDEX IF NOT EXISTS schedule_pauses_schedule_id_idx ON schedule_pauses(schedule_id);
CREATE INDEX IF NOT EXISTS schedule_pauses_dates_idx ON schedule_pauses(pause_start_date, pause_end_date);

-- Table: schedule_skipped_instances
-- Purpose: Individual skipped occurrences without affecting future schedule
CREATE TABLE IF NOT EXISTS schedule_skipped_instances (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER NOT NULL REFERENCES recurring_schedules(id) ON DELETE CASCADE,

  -- Specific date and time that was skipped
  skipped_date DATE NOT NULL,
  skipped_time TIME NOT NULL,

  reason TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Ensure can't skip same instance twice
  CONSTRAINT schedule_skipped_instances_unique UNIQUE(schedule_id, skipped_date, skipped_time)
);

-- Indexes for schedule_skipped_instances
CREATE INDEX IF NOT EXISTS schedule_skipped_instances_schedule_id_idx ON schedule_skipped_instances(schedule_id);
CREATE INDEX IF NOT EXISTS schedule_skipped_instances_date_idx ON schedule_skipped_instances(skipped_date);

-- Table: schedule_notifications
-- Purpose: Track notification delivery for scheduled instances
CREATE TABLE IF NOT EXISTS schedule_notifications (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER NOT NULL REFERENCES recurring_schedules(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- When notification should be/was sent
  scheduled_for TIMESTAMP NOT NULL,
  sent_at TIMESTAMP,

  -- Notification details
  notification_type TEXT NOT NULL CHECK (notification_type IN ('reminder', 'missed')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'dismissed')),

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for schedule_notifications
CREATE INDEX IF NOT EXISTS schedule_notifications_user_idx ON schedule_notifications(user_id);
CREATE INDEX IF NOT EXISTS schedule_notifications_scheduled_idx ON schedule_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS schedule_notifications_status_idx ON schedule_notifications(status);

-- Table: push_subscriptions
-- Purpose: Store web push notification subscriptions for users
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Push subscription data (JSON from browser)
  endpoint TEXT NOT NULL,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,

  -- Settings
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- One subscription per user
  CONSTRAINT push_subscriptions_user_unique UNIQUE(user_id)
);

-- Index for push_subscriptions
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS push_subscriptions_active_idx ON push_subscriptions(is_active);

-- Comments for documentation
COMMENT ON TABLE recurring_schedules IS 'Master schedule configuration for medications, meals, and activities';
COMMENT ON TABLE schedule_pauses IS 'Temporary pause periods for schedules';
COMMENT ON TABLE schedule_skipped_instances IS 'Individual skipped occurrences without affecting future schedule';
COMMENT ON TABLE schedule_notifications IS 'Track notification delivery for scheduled instances';
COMMENT ON TABLE push_subscriptions IS 'Web push notification subscriptions for users';

COMMENT ON COLUMN recurring_schedules.schedule_type IS 'Type of schedule: medication, meal, or activity';
COMMENT ON COLUMN recurring_schedules.frequency_type IS 'Pattern type: daily, weekly, or custom interval';
COMMENT ON COLUMN recurring_schedules.scheduled_times IS 'Array of time strings for occurrences during the day';
COMMENT ON COLUMN schedule_skipped_instances.skipped_date IS 'Date of the skipped instance';
COMMENT ON COLUMN schedule_skipped_instances.skipped_time IS 'Time of the skipped instance';
