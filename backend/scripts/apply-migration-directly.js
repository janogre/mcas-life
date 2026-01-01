/**
 * Direct migration application script
 * Applies migration 0011 SQL directly to Supabase database
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
    const migrationPath = path.join(__dirname, '..', 'src', 'db', 'migrations', '0011_add_recipe_sharing_tables.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Applying migration...');
    await sql.unsafe(migrationSQL);
    console.log('✅ Migration applied successfully!');

    // Verify tables were created
    console.log('\n🔍 Verifying tables...');
    const verifyLikes = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'recipe_likes'
    `;
    const verifySaves = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'recipe_saves'
    `;

    if (verifyLikes.length > 0) {
      console.log('✅ Table "recipe_likes" created');
    } else {
      console.log('❌ Table "recipe_likes" NOT found');
    }

    if (verifySaves.length > 0) {
      console.log('✅ Table "recipe_saves" created');
    } else {
      console.log('❌ Table "recipe_saves" NOT found');
    }

    // Check indexes
    const verifyIndexes = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename IN ('recipe_likes', 'recipe_saves')
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
