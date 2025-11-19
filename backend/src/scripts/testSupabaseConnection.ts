/**
 * Test Supabase Database Connection
 *
 * This script verifies that the Supabase database connection is working correctly
 * and displays connection information.
 */

import { checkDatabaseHealth, getDatabaseStats, db, sql } from '../db/index.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testSupabaseConnection() {
  console.log('\n🧪 Testing Supabase Database Connection...\n');

  try {
    // 1. Check DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL not found in environment variables');
    }

    // Mask password for security
    const maskedUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
    console.log('📍 Database URL:', maskedUrl);

    // Check if it's Supabase
    const isSupabase = dbUrl.includes('supabase.co');
    console.log('🔌 Connection Type:', isSupabase ? 'Supabase (Cloud)' : 'Local PostgreSQL');

    // 2. Test basic connection
    console.log('\n⏱️  Testing connection health...');
    const health = await checkDatabaseHealth();

    if (health.status === 'healthy') {
      console.log('✅ Database connection: HEALTHY');
      console.log(`   Latency: ${health.latency}ms`);
    } else {
      console.log('❌ Database connection: UNHEALTHY');
      console.log(`   Error: ${health.error}`);
      process.exit(1);
    }

    // 3. Test database version
    console.log('\n🐘 Checking PostgreSQL version...');
    const versionResult = await db.execute(sql`SELECT version()`);
    const version = versionResult[0]?.version || 'Unknown';
    console.log(`   ${version.split(',')[0]}`);

    // 4. Check if tables exist
    console.log('\n📊 Checking database tables...');
    const tablesResult = await db.execute(sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    const tables = tablesResult.map((row: any) => row.table_name);

    if (tables.length === 0) {
      console.log('⚠️  No tables found - you need to run migrations!');
      console.log('   Run: npm run db:migrate');
    } else {
      console.log(`✅ Found ${tables.length} tables:`);
      tables.forEach((table: string) => {
        console.log(`   - ${table}`);
      });

      // 5. Check row counts for key tables
      console.log('\n🔢 Row counts for key tables:');

      const keyTables = ['users', 'foods', 'symptom_entries', 'food_diary_entries'];
      for (const table of keyTables) {
        if (tables.includes(table)) {
          try {
            const countResult = await db.execute(sql.raw(`SELECT COUNT(*) as count FROM ${table}`));
            const count = countResult[0]?.count || 0;
            console.log(`   ${table}: ${count} rows`);
          } catch (err) {
            console.log(`   ${table}: Error reading count`);
          }
        }
      }
    }

    // 6. Get database statistics (if migrations have been run)
    if (tables.length > 0) {
      console.log('\n📈 Database statistics:');
      try {
        const stats = await getDatabaseStats();
        console.log(`   Active connections: ${stats.active_connections}`);
        console.log(`   Total users: ${stats.total_users}`);
        console.log(`   Total foods: ${stats.total_foods}`);
        console.log(`   Symptoms today: ${stats.total_symptoms_today}`);
        console.log(`   Pending analyses: ${stats.correlation_analyses_pending}`);
      } catch (err) {
        console.log('   ⚠️  Could not fetch stats (tables may be empty)');
      }
    }

    // 7. Test write permissions
    console.log('\n✍️  Testing write permissions...');
    try {
      await db.execute(sql`CREATE TABLE IF NOT EXISTS _supabase_test (id SERIAL PRIMARY KEY, test TEXT)`);
      await db.execute(sql`INSERT INTO _supabase_test (test) VALUES ('connection-test')`);
      await db.execute(sql`DROP TABLE _supabase_test`);
      console.log('✅ Write permissions: OK');
    } catch (err) {
      console.log('❌ Write permissions: FAILED');
      console.error('   Error:', err);
    }

    // 8. Check SSL status (Supabase requires SSL)
    console.log('\n🔒 SSL Configuration:');
    const sslEnv = process.env.DATABASE_SSL;
    console.log(`   DATABASE_SSL env var: ${sslEnv || 'not set'}`);

    if (isSupabase && !sslEnv) {
      console.log('   ⚠️  WARNING: Supabase requires SSL. Set DATABASE_SSL=require in .env');
    } else if (isSupabase && sslEnv) {
      console.log('   ✅ SSL is properly configured');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Supabase Connection Test: PASSED');
    console.log('='.repeat(60));

    if (tables.length === 0) {
      console.log('\n⚠️  NEXT STEP: Run migrations to create tables');
      console.log('   Command: npm run db:migrate');
    } else if (tables.includes('foods')) {
      const foodCountResult = await db.execute(sql`SELECT COUNT(*) as count FROM foods`);
      const foodCount = foodCountResult[0]?.count || 0;

      if (foodCount === 0) {
        console.log('\n⚠️  NEXT STEP: Import SIGHI food data');
        console.log('   Command: npm run import:sighi');
      }
    }

    console.log('\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Connection test failed:', error);
    process.exit(1);
  }
}

// Run the test
testSupabaseConnection();
