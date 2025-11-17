/**
 * Ensure system_settings table exists and create if missing
 */

import pg from 'pg';

const { Client } = pg;

async function ensureSystemSettings() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://mcas_user:mcas_password@localhost:5432/mcas_life'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check if table exists
    const checkResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'system_settings'
      );
    `);

    const tableExists = checkResult.rows[0].exists;

    if (tableExists) {
      console.log('✅ system_settings table already exists');
    } else {
      console.log('Creating system_settings table...');

      await client.query(`
        CREATE TABLE system_settings (
          id SERIAL PRIMARY KEY,
          setting_key VARCHAR(100) NOT NULL UNIQUE,
          setting_value TEXT,
          encrypted BOOLEAN NOT NULL DEFAULT false,
          description TEXT,
          updated_by INTEGER REFERENCES users(id),
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      await client.query(`
        CREATE UNIQUE INDEX system_settings_key_idx
        ON system_settings (setting_key);
      `);

      console.log('✅ system_settings table created successfully');
    }

    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await client.end();
    process.exit(1);
  }
}

ensureSystemSettings();
