import { db } from './src/db/connection.js';
import * as fs from 'fs';
import { sql } from 'drizzle-orm';

async function runMigration() {
  const migrationSQL = fs.readFileSync('./create_medications_tables.sql', 'utf-8');

  console.log('Running medication tables migration...');

  try {
    // Execute the SQL
    await db.execute(sql.raw(migrationSQL));
    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

runMigration();
