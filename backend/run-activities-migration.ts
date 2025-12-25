import { db } from './src/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';

async function runActivitiesMigration() {
  console.log('🚀 Running activities migration...');

  try {
    const migrationSQL = fs.readFileSync(
      './src/db/migrations/0007_massive_martin_li.sql',
      'utf-8'
    );

    await db.execute(sql.raw(migrationSQL));

    console.log('✅ Activities migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runActivitiesMigration();
