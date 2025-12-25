import { db } from './src/db/connection.js';
import * as fs from 'fs';
import { sql } from 'drizzle-orm';

async function enableMedicationsRLS() {
  const rlsSQL = fs.readFileSync('./enable-medications-rls-simple.sql', 'utf-8');

  console.log('🔒 Enabling Row Level Security on medications tables...\n');
  console.log('⚠️  Note: This app uses JWT authentication at application level.');
  console.log('    RLS policies are permissive - authorization is handled by');
  console.log('    authenticateToken middleware in backend code.\n');

  try {
    // Execute the SQL
    await db.execute(sql.raw(rlsSQL));
    console.log('✅ RLS enabled successfully!');
    console.log('\n📋 Policies created:');
    console.log('   medications_catalog:');
    console.log('     - SELECT: Allowed for all connections (public catalog)');
    console.log('     - MODIFY: Only postgres superuser can modify catalog');
    console.log('   user_medications:');
    console.log('     - All operations: Allowed (filtered by middleware in application code)');
    console.log('\n🔐 Security: Backend middleware ensures users only access their own data');
  } catch (error) {
    console.error('❌ RLS migration failed:', error);
  } finally {
    process.exit(0);
  }
}

enableMedicationsRLS();
