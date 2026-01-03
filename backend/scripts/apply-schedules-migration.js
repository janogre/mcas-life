/**
 * Apply schedules migration script
 * Applies migration 0012 SQL directly to Supabase database
 */

import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function applyMigration() {
  const sql = postgres(process.env.DATABASE_URL, {
    ssl: process.env.DATABASE_SSL === 'require' ? 'require' : false,
    max: 1,
  });

  try {
    console.log('🔌 Connecting to database...');
    console.log('✅ Connected to database');

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'src', 'db', 'migrations', '0012_add_recurring_schedules.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Applying migration...');
    await sql.unsafe(migrationSQL);
    console.log('✅ Migration applied successfully!');

    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    const verifySchedules = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'recurring_schedules'
    `;
    const verifyPauses = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'schedule_pauses'
    `;
    const verifySkipped = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'schedule_skipped_instances'
    `;
    const verifyNotifications = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'schedule_notifications'
    `;
    const verifyPush = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'push_subscriptions'
    `;

    if (verifySchedules.length > 0) {
      console.log('✅ Table "recurring_schedules" created');
    } else {
      console.log('❌ Table "recurring_schedules" NOT found');
    }

    if (verifyPauses.length > 0) {
      console.log('✅ Table "schedule_pauses" created');
    } else {
      console.log('❌ Table "schedule_pauses" NOT found');
    }

    if (verifySkipped.length > 0) {
      console.log('✅ Table "schedule_skipped_instances" created');
    } else {
      console.log('❌ Table "schedule_skipped_instances" NOT found');
    }

    if (verifyNotifications.length > 0) {
      console.log('✅ Table "schedule_notifications" created');
    } else {
      console.log('❌ Table "schedule_notifications" NOT found');
    }

    if (verifyPush.length > 0) {
      console.log('✅ Table "push_subscriptions" created');
    } else {
      console.log('❌ Table "push_subscriptions" NOT found');
    }

    // Check indexes
    const verifyIndexes = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename IN ('recurring_schedules', 'schedule_pauses', 'schedule_skipped_instances', 'schedule_notifications', 'push_subscriptions')
      ORDER BY indexname
    `;

    console.log('\n📊 Indexes created:');
    verifyIndexes.forEach(row => {
      console.log(`  - ${row.indexname}`);
    });

    await sql.end();
    console.log('\n✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
