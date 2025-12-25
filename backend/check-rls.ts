import { db } from './src/db/connection.js';
import { sql } from 'drizzle-orm';

async function checkRLS() {
  // Check RLS status on user_medications and medications_catalog
  const rlsStatus = await db.execute(sql`
    SELECT 
      schemaname, 
      tablename, 
      rowsecurity as rls_enabled
    FROM pg_tables 
    WHERE tablename IN ('user_medications', 'medications_catalog', 'approved_foods', 'personal_food_ratings')
    ORDER BY tablename;
  `);
  
  console.log('📊 RLS Status:');
  console.log(rlsStatus.rows);

  // Check existing policies
  const policies = await db.execute(sql`
    SELECT 
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd as command,
      qual as using_expression,
      with_check as with_check_expression
    FROM pg_policies 
    WHERE tablename IN ('approved_foods', 'personal_food_ratings')
    ORDER BY tablename, policyname;
  `);
  
  console.log('\n📋 Existing Policies on similar tables:');
  console.log(policies.rows);

  process.exit(0);
}

checkRLS().catch(console.error);
