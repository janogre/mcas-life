-- Update meal_entries table to match new schema
-- Step 1: Rename consumed_at to meal_time
ALTER TABLE "meal_entries" RENAME COLUMN "consumed_at" TO "meal_time";

-- Step 2: Drop columns
ALTER TABLE "meal_entries" DROP COLUMN IF EXISTS "meal_name";
ALTER TABLE "meal_entries" DROP COLUMN IF EXISTS "total_histamine_load";
ALTER TABLE "meal_entries" DROP COLUMN IF EXISTS "total_trigger_score";

-- Step 3: Rename reaction_description
ALTER TABLE "meal_entries" RENAME COLUMN "reaction_description" TO "reaction_notes";

-- Step 4: Add new columns
ALTER TABLE "meal_entries" ADD COLUMN IF NOT EXISTS "dao_minutes_before" integer;
ALTER TABLE "meal_entries" ADD COLUMN IF NOT EXISTS "delayed_reaction" boolean DEFAULT false NOT NULL;
ALTER TABLE "meal_entries" ADD COLUMN IF NOT EXISTS "reaction_severity" integer;
ALTER TABLE "meal_entries" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;

-- Update meal_foods table to include unit and custom_food_name
ALTER TABLE "meal_foods" DROP COLUMN IF EXISTS "preparation_method";
ALTER TABLE "meal_foods" ADD COLUMN IF NOT EXISTS "unit" varchar(50) NOT NULL DEFAULT 'g';
ALTER TABLE "meal_foods" ADD COLUMN IF NOT EXISTS "custom_food_name" varchar(255);

-- Update indexes
DROP INDEX IF EXISTS "meal_entries_consumed_at_idx";
DROP INDEX IF EXISTS "meal_entries_user_consumed_idx";
CREATE INDEX IF NOT EXISTS "meal_entries_meal_time_idx" ON "meal_entries" ("meal_time");
CREATE INDEX IF NOT EXISTS "meal_entries_user_time_idx" ON "meal_entries" ("user_id", "meal_time");
