/**
 * Migration Script: Add personal_food_ratings table
 * 
 * Creates a new table for personal food ratings that is separate from the approved_foods table.
 * This allows users to rate foods without automatically adding them to their safe list.
 */

import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function addPersonalFoodRatingsTable() {
  try {
    console.log('Creating personal_food_ratings table...');

    // Create the table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS personal_food_ratings (
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
      )
    `);

    // Create indexes
    console.log('Creating indexes...');
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS personal_food_ratings_food_user_idx ON personal_food_ratings(food_id, user_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS personal_food_ratings_food_idx ON personal_food_ratings(food_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS personal_food_ratings_user_idx ON personal_food_ratings(user_id)
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS personal_food_ratings_rating_idx ON personal_food_ratings(personal_rating)
    `);

    // Add table comment
    await db.execute(sql`
      COMMENT ON TABLE personal_food_ratings IS 'Personal food ratings separate from the safe foods list - allows rating without automatically approving'
    `);

    console.log('✅ Successfully created personal_food_ratings table and indexes');

    // Check table structure
    const tableInfo = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'personal_food_ratings' 
      ORDER BY ordinal_position
    `);
    
    console.log('Table structure:');
    console.table(tableInfo);

  } catch (error) {
    console.error('❌ Error creating personal_food_ratings table:', error);
    throw error;
  }
}

// Run the migration
addPersonalFoodRatingsTable()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });