/**
 * Copy data from local PostgreSQL to Supabase
 *
 * This script connects to both databases and copies foods data
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { foods } from '../db/schema.js';
import dotenv from 'dotenv';

dotenv.config();

// Local database connection
const LOCAL_DB_URL = 'postgresql://mcas_user:mcas_password@localhost:5432/mcas_life';
const localConnection = postgres(LOCAL_DB_URL);
const localDb = drizzle(localConnection, { schema: { foods } });

// Supabase connection (from .env)
const SUPABASE_DB_URL = process.env.DATABASE_URL!;
const supabaseConnection = postgres(SUPABASE_DB_URL, {
  ssl: process.env.DATABASE_SSL === 'require' ? 'require' : false,
  max: 5
});
const supabaseDb = drizzle(supabaseConnection, { schema: { foods } });

async function copyFoods() {
  console.log('🔄 Starting data copy from local PostgreSQL to Supabase...\n');

  try {
    // 1. Fetch all foods from local database
    console.log('📥 Fetching foods from local database...');
    const localFoods = await localDb.select().from(foods);
    console.log(`✅ Found ${localFoods.length} foods in local database\n`);

    if (localFoods.length === 0) {
      console.log('⚠️  No foods found in local database. Nothing to copy.');
      process.exit(0);
    }

    // 2. Check current count in Supabase
    console.log('📊 Checking Supabase database...');
    const supabaseFoods = await supabaseDb.select().from(foods);
    console.log(`   Current foods in Supabase: ${supabaseFoods.length}\n`);

    if (supabaseFoods.length > 0) {
      console.log('⚠️  Supabase already has foods. Clearing before import...');
      await supabaseDb.delete(foods);
      console.log('✅ Cleared existing foods\n');
    }

    // 3. Insert foods to Supabase in batches
    console.log('📤 Copying foods to Supabase...');
    const batchSize = 50;
    let copied = 0;

    for (let i = 0; i < localFoods.length; i += batchSize) {
      const batch = localFoods.slice(i, i + batchSize);

      // Prepare batch for insert (remove id to let Supabase generate new ones)
      // Set created_by_user_id to null to avoid foreign key constraint issues
      const batchToInsert = batch.map(({ id, created_at, updated_at, created_by_user_id, ...rest }) => ({
        ...rest,
        created_by_user_id: null,  // Reset to null since users don't exist in Supabase yet
        created_at: new Date(),
        updated_at: new Date()
      }));

      await supabaseDb.insert(foods).values(batchToInsert);
      copied += batch.length;

      process.stdout.write(`\r   Progress: ${copied}/${localFoods.length} foods copied`);
    }

    console.log('\n');
    console.log('✅ Data copy completed successfully!');
    console.log(`📊 Total foods copied: ${copied}\n`);

    // 4. Verify
    const finalCount = await supabaseDb.select().from(foods);
    console.log(`🔍 Verification: ${finalCount.length} foods now in Supabase`);

  } catch (error) {
    console.error('❌ Error copying data:', error);
    process.exit(1);
  } finally {
    await localConnection.end();
    await supabaseConnection.end();
  }
}

// Run the copy
copyFoods();
