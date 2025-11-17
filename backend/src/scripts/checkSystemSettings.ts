/**
 * Quick check/create system_settings table
 */

import { db } from '../db/connection.js';
import { sql } from 'drizzle-orm';

async function checkAndCreateTable() {
  try {
    console.log('Checking system_settings table...');

    // Try to select from the table
    try {
      await db.execute(sql`SELECT COUNT(*) FROM system_settings`);
      console.log('✅ system_settings table exists');
    } catch (error) {
      console.log('❌ system_settings table does not exist, creating...');

      // Create the table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS system_settings (
          id SERIAL PRIMARY KEY,
          setting_key VARCHAR(100) NOT NULL UNIQUE,
          setting_value TEXT,
          encrypted BOOLEAN NOT NULL DEFAULT false,
          description TEXT,
          updated_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
      `);

      await db.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS system_settings_key_idx
        ON system_settings (setting_key)
      `);

      console.log('✅ system_settings table created successfully');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAndCreateTable();
