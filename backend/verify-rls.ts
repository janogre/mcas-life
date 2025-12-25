import { db } from './src/db/connection.js';
import { sql } from 'drizzle-orm';

async function verifyRLS() {
  console.log('🔍 Verifying RLS setup...\n');

  // Check RLS status
  const rlsStatus = await db.execute(sql`
    SELECT
      tablename,
      rowsecurity as rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('user_medications', 'medications_catalog')
    ORDER BY tablename;
  `);

  console.log('📊 RLS Status:');
  console.log(rlsStatus);

  // Check policies
  const policies = await db.execute(sql`
    SELECT
      tablename,
      policyname,
      cmd as command
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('user_medications', 'medications_catalog')
    ORDER BY tablename, policyname;
  `);

  console.log('\n📋 Active Policies:');
  console.log(policies);

  console.log('\n✅ RLS verification complete!');
  process.exit(0);
}

verifyRLS().catch(console.error);
