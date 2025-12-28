-- Migration: Add user_recipes table for custom user-created recipes
-- Date: 2025-12-27
-- Description: Allows users to create their own recipes with MCAS scoring

-- Create user_recipes table
CREATE TABLE IF NOT EXISTS user_recipes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Recipe metadata
  title VARCHAR(255) NOT NULL,
  description TEXT,
  prep_time_minutes INTEGER,
  servings INTEGER NOT NULL, -- Total portions recipe makes (e.g., 4)

  -- Ingredients (JSONB array for flexible storage)
  -- Structure: [{food_id: number, amount: number, unit: string, custom_name?: string}]
  ingredients JSONB NOT NULL,

  -- Instructions
  instructions TEXT,
  notes TEXT,

  -- MCAS calculations (auto-calculated like Spoonacular recipes)
  calculated_mcas_score REAL NOT NULL, -- 0-100 score
  calculated_histamine_load REAL,
  trigger_warnings JSONB, -- Array of trigger strings
  safety_level VARCHAR(20), -- 'safe' | 'caution' | 'risky' | 'unsafe'

  -- Usage tracking
  times_made INTEGER NOT NULL DEFAULT 0,
  last_made_at TIMESTAMP,

  -- Sharing (future feature)
  is_public BOOLEAN NOT NULL DEFAULT false,

  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS user_recipes_user_id_idx ON user_recipes(user_id);
CREATE INDEX IF NOT EXISTS user_recipes_mcas_score_idx ON user_recipes(calculated_mcas_score);
CREATE INDEX IF NOT EXISTS user_recipes_times_made_idx ON user_recipes(times_made);
CREATE INDEX IF NOT EXISTS user_recipes_user_created_idx ON user_recipes(user_id, created_at DESC);

-- GIN index for JSONB queries on ingredients
CREATE INDEX IF NOT EXISTS user_recipes_ingredients_gin_idx ON user_recipes USING GIN(ingredients);
