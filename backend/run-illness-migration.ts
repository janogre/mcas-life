import { db } from './src/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';

async function runIllnessMigration() {
  console.log('🚀 Running illness migration...');

  try {
    const migrationSQL = fs.readFileSync(
      './src/db/migrations/0008_needy_payback.sql',
      'utf-8'
    );

    await db.execute(sql.raw(migrationSQL));

    console.log('✅ Illness migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runIllnessMigration();
