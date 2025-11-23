import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL!;
const sql = postgres(DATABASE_URL, {
  ssl: process.env.DATABASE_SSL === 'require' ? 'require' : false,
  max: 5
});

async function checkRLS() {
  console.log('🔍 Checking Row Level Security (RLS) status...\n');

  try {
    // Query to check RLS status for all tables
    const result = await sql`
      SELECT
        schemaname,
        tablename,
        rowsecurity AS rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    console.log('📊 RLS Status for all public tables:\n');
    console.log('Table                          | RLS Enabled');
    console.log('-------------------------------|-------------');

    let tablesWithRLS = 0;
    let totalTables = 0;

    for (const row of result) {
      totalTables++;
      const rlsStatus = row.rls_enabled ? '✅ YES' : '❌ NO';
      if (row.rls_enabled) tablesWithRLS++;

      console.log(`${row.tablename.padEnd(30)} | ${rlsStatus}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log(`\n📈 Summary:`);
    console.log(`   Total tables: ${totalTables}`);
    console.log(`   Tables with RLS enabled: ${tablesWithRLS}`);
    console.log(`   Tables without RLS: ${totalTables - tablesWithRLS}`);

    if (tablesWithRLS === 0) {
      console.log('\n⚠️  WARNING: No tables have RLS enabled!');
      console.log('   This means any authenticated user can access all data.');
      console.log('   For a production MCAS health app, you should enable RLS.');
    } else if (tablesWithRLS < totalTables) {
      console.log(`\n⚠️  WARNING: Only ${tablesWithRLS}/${totalTables} tables have RLS enabled.`);
      console.log('   Some tables may be exposing data without proper access control.');
    } else {
      console.log('\n✅ All tables have RLS enabled - good security posture!');
    }

    // Check if there are any RLS policies defined
    const policies = await sql`
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;

    if (policies.length > 0) {
      console.log(`\n📜 RLS Policies (${policies.length} found):\n`);

      let currentTable = '';
      for (const policy of policies) {
        if (policy.tablename !== currentTable) {
          console.log(`\n🔒 ${policy.tablename}:`);
          currentTable = policy.tablename;
        }
        console.log(`   - ${policy.policyname}`);
        console.log(`     Command: ${policy.cmd}`);
        console.log(`     Roles: ${policy.roles.join(', ')}`);
      }
    } else {
      console.log('\n⚠️  No RLS policies found!');
      console.log('   Even if RLS is enabled, without policies no one can access the data.');
    }

  } catch (error) {
    console.error('❌ Error checking RLS:', error);
  } finally {
    await sql.end();
  }
}

checkRLS();
