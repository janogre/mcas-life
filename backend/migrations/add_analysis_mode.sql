-- Add analysis_mode enum and column to user_preferences

-- Create the enum type
CREATE TYPE analysis_mode AS ENUM ('smart', 'ai');

-- Add the column with default value
ALTER TABLE user_preferences
ADD COLUMN analysis_mode analysis_mode NOT NULL DEFAULT 'smart';

-- Add index for faster queries
CREATE INDEX user_preferences_analysis_mode_idx ON user_preferences(analysis_mode);
