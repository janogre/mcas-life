/**
 * Migration script to create system_settings table
 *
 * Stores system-wide configuration like API credentials
 */

import { db } from '../db/connection.js';
import { sql } from 'drizzle-orm';

async function migrateSystemSettings() {
  console.log('🔧 Starting system_settings migration...');

  try {
    // Create system_settings table
    console.log('Creating system_settings table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        encrypted BOOLEAN NOT NULL DEFAULT false,
        description TEXT,
        updated_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    console.log('✅ system_settings table created');

    // Create index on setting_key for fast lookups
    console.log('Creating index on setting_key...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS system_settings_key_idx
      ON system_settings(setting_key)
    `);
    console.log('✅ Index created');

    // Insert default Airthings settings (will be configured by admin)
    console.log('Inserting default Airthings settings...');
    await db.execute(sql`
      INSERT INTO system_settings (setting_key, description, encrypted)
      VALUES
        ('airthings_client_id', 'Airthings OAuth Client ID', false),
        ('airthings_client_secret', 'Airthings OAuth Client Secret (encrypted)', true),
        ('airthings_redirect_uri', 'Airthings OAuth Redirect URI', false)
      ON CONFLICT (setting_key) DO NOTHING
    `);
    console.log('✅ Default settings inserted');

    console.log('🎉 System settings migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateSystemSettings();
