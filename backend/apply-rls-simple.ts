import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL!;

async function applyRLS() {
  console.log('🔐 Applying Row Level Security (RLS) to MCAS-Life database...\n');

  const sql = postgres(DATABASE_URL, {
    ssl: process.env.DATABASE_SSL === 'require' ? 'require' : false,
    max: 5
  });

  try {
    // Enable RLS on all tables
    console.log('📋 Step 1: Enabling RLS on all tables...');

    const tables = [
      'users', 'mcas_profiles', 'user_preferences', 'user_sessions',
      'foods', 'approved_foods', 'personal_food_ratings', 'food_diary_entries',
      'symptom_entries', 'supplement_entries', 'health_metrics',
      'trigger_analyses', 'saved_recipes', 'symptom_templates', 'system_settings'
    ];

    for (const table of tables) {
      try {
        await sql`ALTER TABLE ${sql(table)} ENABLE ROW LEVEL SECURITY`;
        console.log(`   ✅ ${table}`);
      } catch (error: any) {
        if (error.message.includes('already') || error.message.includes('exist')) {
          console.log(`   ⏭️  ${table} (already enabled)`);
        } else {
          console.log(`   ❌ ${table}: ${error.message}`);
        }
      }
    }

    // Create policies for postgres role (service role)
    console.log('\n📋 Step 2: Creating service role policies...');

    for (const table of tables) {
      const policyName = `Service role has full access to ${table}`;

      try {
        await sql.unsafe(`
          CREATE POLICY "${policyName}"
            ON ${table}
            FOR ALL
            TO postgres
            USING (true)
            WITH CHECK (true)
        `);
        console.log(`   ✅ ${table}`);
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          console.log(`   ⏭️  ${table} (policy exists)`);
        } else {
          console.log(`   ❌ ${table}: ${error.message}`);
        }
      }
    }

    // Grant permissions
    console.log('\n📋 Step 3: Granting permissions...');

    try {
      await sql`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO postgres`;
      await sql`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres`;
      console.log('   ✅ Permissions granted');
    } catch (error: any) {
      console.log(`   ⚠️  ${error.message}`);
    }

    // Verify
    console.log('\n📋 Step 4: Verifying RLS configuration...');

    const rlsStatus = await sql`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;

    const enabledTables = rlsStatus.filter((r: any) => r.rowsecurity);
    console.log(`\n   Tables with RLS: ${enabledTables.length}/${rlsStatus.length}`);

    const policies = await sql`
      SELECT COUNT(*) as count
      FROM pg_policies
      WHERE schemaname = 'public'
    `;

    console.log(`   Total policies: ${policies[0].count}`);

    if (enabledTables.length === tables.length && Number(policies[0].count) >= tables.length) {
      console.log('\n✅ SUCCESS: RLS fully configured!');
      console.log('\n🔒 Security Architecture:');
      console.log('   • RLS enabled on all tables');
      console.log('   • Only postgres (service) role has access');
      console.log('   • Backend enforces user-level permissions');
      console.log('   • Direct database access blocked for other roles');
      console.log('\n⚠️  Remember:');
      console.log('   • Backend uses service role (full access)');
      console.log('   • Backend code enforces: WHERE user_id = userId');
      console.log('   • Never expose connection string to frontend');
    } else {
      console.log('\n⚠️  WARNING: Configuration may be incomplete');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await sql.end();
  }
}

applyRLS();
