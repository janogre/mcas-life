-- Migration: Add location fields to users table for automatic weather data
-- Created: 2025-10-01

ALTER TABLE users
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7);

-- Add index for location-based queries
CREATE INDEX IF NOT EXISTS users_city_idx ON users(city);

-- Comment for documentation
COMMENT ON COLUMN users.city IS 'User city for automatic weather data retrieval';
COMMENT ON COLUMN users.latitude IS 'Precise latitude for weather API calls';
COMMENT ON COLUMN users.longitude IS 'Precise longitude for weather API calls';
