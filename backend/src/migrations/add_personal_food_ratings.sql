-- Migration: Add personal_food_ratings table
-- Date: 2024-08-28
-- Description: Create separate table for personal food ratings (independent from approved foods list)

-- Create personal_food_ratings table
CREATE TABLE personal_food_ratings (
  id SERIAL PRIMARY KEY,
  food_id INTEGER NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Personal rating (0-3 scale matching SIGHI)
  personal_rating food_compatibility NOT NULL,
  
  -- Optional notes about the rating
  notes TEXT NOT NULL DEFAULT '',
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Ensure one rating per user per food
  UNIQUE(food_id, user_id)
);

-- Create indexes for performance
CREATE INDEX personal_food_ratings_food_idx ON personal_food_ratings(food_id);
CREATE INDEX personal_food_ratings_user_idx ON personal_food_ratings(user_id);
CREATE INDEX personal_food_ratings_rating_idx ON personal_food_ratings(personal_rating);

-- Add comment
COMMENT ON TABLE personal_food_ratings IS 'Personal food ratings separate from the safe foods list - allows rating without automatically approving';