import { db } from './src/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';

async function runMealsMigration() {
  console.log('🚀 Running meals migration...');

  try {
    const migrationSQL = fs.readFileSync(
      './src/db/migrations/0009_mixed_night_nurse.sql',
      'utf-8'
    );

    await db.execute(sql.raw(migrationSQL));

    console.log('✅ Meals migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMealsMigration();
