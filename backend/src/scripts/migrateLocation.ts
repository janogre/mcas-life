import { db, sql } from '../db/connection.js';

async function migrateLocation() {
  console.log('🔄 Running location migration...');

  try {
    // Add location columns to users table
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS city VARCHAR(100),
      ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 7),
      ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 7)
    `);

    console.log('✅ Added city, latitude, longitude columns');

    // Add index for city lookups
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS users_city_idx ON users(city)
    `);

    console.log('✅ Added index on city column');
    console.log('🎉 Location migration completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateLocation();
