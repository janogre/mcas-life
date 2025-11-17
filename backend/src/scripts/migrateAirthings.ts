/**
 * Migration script to add Airthings integration fields
 *
 * Adds:
 * 1. OAuth tokens for Airthings API to users table
 * 2. Indoor air quality data field to symptom_entries table
 */

import { db } from '../db/connection.js';
import { sql } from 'drizzle-orm';

async function migrateAirthingsFields() {
  console.log('🔧 Starting Airthings integration migration...');

  try {
    // Add Airthings OAuth fields to users table
    console.log('Adding Airthings OAuth fields to users table...');
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS airthings_access_token TEXT,
      ADD COLUMN IF NOT EXISTS airthings_refresh_token TEXT,
      ADD COLUMN IF NOT EXISTS airthings_token_expires_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS airthings_connected BOOLEAN NOT NULL DEFAULT false
    `);
    console.log('✅ Airthings OAuth fields added to users table');

    // Add indoor_air_quality field to symptom_entries table
    console.log('Adding indoor_air_quality field to symptom_entries table...');
    await db.execute(sql`
      ALTER TABLE symptom_entries
      ADD COLUMN IF NOT EXISTS indoor_air_quality JSONB
    `);
    console.log('✅ Indoor air quality field added to symptom_entries table');

    // Create index for Airthings connected users for faster queries
    console.log('Creating index for Airthings connected users...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS users_airthings_connected_idx
      ON users(airthings_connected)
      WHERE airthings_connected = true
    `);
    console.log('✅ Index created');

    console.log('🎉 Airthings integration migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateAirthingsFields();
