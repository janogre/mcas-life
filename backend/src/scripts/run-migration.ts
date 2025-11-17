import { db } from '../db/connection.js';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🔧 Running database migration...');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../db/migrations/0004_aromatic_sersi.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split by statement-breakpoint and execute each statement
    const statements = migrationSQL
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim().length === 0) continue;

      console.log(`\n▶ Executing statement ${i + 1}/${statements.length}...`);
      console.log(statement.substring(0, 100) + '...');

      try {
        await db.execute(sql.raw(statement));
        console.log('✅ Success');
      } catch (error: any) {
        // Ignore "already exists" errors
        if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
          console.log('⚠️  Already exists, skipping');
        } else {
          console.error('❌ Error:', error.message);
          throw error;
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
