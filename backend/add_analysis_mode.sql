-- Add analysis_mode column to user_preferences table

-- First, create the enum type if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'analysis_mode') THEN
        CREATE TYPE analysis_mode AS ENUM ('smart', 'ai');
    END IF;
END $$;

-- Add the column with default value
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS analysis_mode analysis_mode NOT NULL DEFAULT 'smart';

-- Verify the change
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_preferences' AND column_name = 'analysis_mode';
