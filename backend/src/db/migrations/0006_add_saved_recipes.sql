-- Migration: Add Saved Recipes table for Spoonacular recipe integration
-- Created: 2025-10-03
-- Purpose: Store user-saved recipes with MCAS safety scoring

-- Create saved_recipes table
CREATE TABLE IF NOT EXISTS "saved_recipes" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "spoonacular_recipe_id" INTEGER NOT NULL,
  "recipe_data" JSONB NOT NULL,
  "mcas_score" REAL NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "times_made" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "saved_recipes_user_id_idx" ON "saved_recipes" ("user_id");
CREATE INDEX IF NOT EXISTS "saved_recipes_spoonacular_id_idx" ON "saved_recipes" ("spoonacular_recipe_id");
CREATE INDEX IF NOT EXISTS "saved_recipes_mcas_score_idx" ON "saved_recipes" ("mcas_score");

-- Create unique index to prevent duplicate saved recipes per user
CREATE UNIQUE INDEX IF NOT EXISTS "saved_recipes_user_spoonacular_unique"
  ON "saved_recipes" ("user_id", "spoonacular_recipe_id");

-- Create GIN index for JSONB recipe_data (for fast searches within recipe data)
CREATE INDEX IF NOT EXISTS "saved_recipes_recipe_data_gin"
  ON "saved_recipes" USING GIN ("recipe_data");

-- Add comment to table
COMMENT ON TABLE "saved_recipes" IS 'User-saved recipes from Spoonacular API with MCAS safety analysis';
COMMENT ON COLUMN "saved_recipes"."mcas_score" IS 'MCAS safety score 0-100, higher is safer';
COMMENT ON COLUMN "saved_recipes"."recipe_data" IS 'Cached recipe details from Spoonacular API (JSONB)';
COMMENT ON COLUMN "saved_recipes"."times_made" IS 'Number of times user has made this recipe';
