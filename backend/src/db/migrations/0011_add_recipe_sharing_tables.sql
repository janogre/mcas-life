-- Migration: Add Recipe Sharing Tables
-- Description: Adds recipe_likes and recipe_saves tables for community recipe sharing feature
-- Date: 2026-01-01

-- Table: recipe_likes
-- Purpose: Tracks which users liked which recipes
CREATE TABLE IF NOT EXISTS recipe_likes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipe_id INTEGER NOT NULL REFERENCES user_recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT recipe_likes_unique UNIQUE(user_id, recipe_id)
);

-- Indexes for recipe_likes
CREATE INDEX IF NOT EXISTS recipe_likes_user_id_idx ON recipe_likes(user_id);
CREATE INDEX IF NOT EXISTS recipe_likes_recipe_id_idx ON recipe_likes(recipe_id);

-- Table: recipe_saves
-- Purpose: Tracks when users save (copy) shared recipes to their collection
CREATE TABLE IF NOT EXISTS recipe_saves (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_recipe_id INTEGER NOT NULL REFERENCES user_recipes(id) ON DELETE SET NULL,
  saved_recipe_id INTEGER NOT NULL REFERENCES user_recipes(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT recipe_saves_unique UNIQUE(user_id, original_recipe_id)
);

-- Indexes for recipe_saves
CREATE INDEX IF NOT EXISTS recipe_saves_user_id_idx ON recipe_saves(user_id);
CREATE INDEX IF NOT EXISTS recipe_saves_original_idx ON recipe_saves(original_recipe_id);
CREATE INDEX IF NOT EXISTS recipe_saves_saved_idx ON recipe_saves(saved_recipe_id);

-- Comments for documentation
COMMENT ON TABLE recipe_likes IS 'Tracks user likes on shared recipes for community features';
COMMENT ON TABLE recipe_saves IS 'Tracks when users save (copy) shared recipes to their personal collection';
COMMENT ON COLUMN recipe_saves.original_recipe_id IS 'References the original shared recipe (NULL if original deleted)';
COMMENT ON COLUMN recipe_saves.saved_recipe_id IS 'References the copied recipe in user''s collection';
