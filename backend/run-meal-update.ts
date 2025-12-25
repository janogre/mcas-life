import { db } from './src/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';

async function runMealUpdate() {
  console.log('🚀 Updating meal schema...');

  try {
    const migrationSQL = fs.readFileSync(
      './src/db/migrations/0010_update_meal_schema.sql',
      'utf-8'
    );

    await db.execute(sql.raw(migrationSQL));

    console.log('✅ Meal schema update completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMealUpdate();
