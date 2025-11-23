import postgres from 'postgres';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL!;

async function applyRLS() {
  console.log('🔐 Applying Row Level Security (RLS) to MCAS-Life database...\n');

  const sql = postgres(DATABASE_URL, {
    ssl: process.env.DATABASE_SSL === 'require' ? 'require' : false,
    max: 5
  });

  try {
    // Read the SQL file (using custom auth version)
    const sqlFilePath = path.join(process.cwd(), 'enable-rls-custom-auth.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

    console.log('📄 Reading enable-rls.sql...');
    console.log(`   File size: ${sqlContent.length} characters\n`);

    // Split by semicolons to execute statements individually
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments
      if (statement.startsWith('--') || statement.length < 10) {
        continue;
      }

      try {
        // Extract action type for better logging
        let action = 'Executing';
        if (statement.toUpperCase().includes('ALTER TABLE')) {
          const match = statement.match(/ALTER TABLE (\w+)/i);
          action = match ? `Enabling RLS on ${match[1]}` : 'Altering table';
        } else if (statement.toUpperCase().includes('CREATE POLICY')) {
          const match = statement.match(/CREATE POLICY "([^"]+)"/i);
          action = match ? `Creating policy: ${match[1]}` : 'Creating policy';
        } else if (statement.toUpperCase().includes('GRANT')) {
          action = 'Granting permissions';
        }

        process.stdout.write(`\r[${i + 1}/${statements.length}] ${action}...`);

        await sql.unsafe(statement);
        successCount++;
      } catch (error: any) {
        errorCount++;

        // Some errors are expected (e.g., policy already exists)
        if (error.message && error.message.includes('already exists')) {
          // Silently skip "already exists" errors
          process.stdout.write(` (skipped - already exists)`);
        } else {
          console.error(`\n❌ Error in statement ${i + 1}:`, error.message);
          console.error(`   Statement: ${statement.substring(0, 100)}...`);
        }
      }
    }

    console.log('\n\n' + '='.repeat(60));
    console.log(`\n✅ RLS Application Complete!`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Errors: ${errorCount}\n`);

    // Verify RLS is enabled
    console.log('🔍 Verifying RLS status...\n');

    const rlsStatus = await sql`
      SELECT
        tablename,
        rowsecurity AS rls_enabled
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `;

    let enabledCount = 0;
    for (const row of rlsStatus) {
      if (row.rls_enabled) {
        enabledCount++;
      }
    }

    console.log(`📊 RLS Status:`);
    console.log(`   Tables with RLS: ${enabledCount}/${rlsStatus.length}`);

    // Count policies
    const policyCount = await sql`
      SELECT COUNT(*) as count
      FROM pg_policies
      WHERE schemaname = 'public';
    `;

    console.log(`   Total RLS policies: ${policyCount[0].count}\n`);

    if (enabledCount === rlsStatus.length && Number(policyCount[0].count) > 0) {
      console.log('✅ SUCCESS: All tables have RLS enabled with policies!');
      console.log('   Your MCAS-Life database is now properly secured.\n');
      console.log('⚠️  IMPORTANT REMINDERS:');
      console.log('   1. Test thoroughly with different users');
      console.log('   2. Backend API uses service role key (bypasses RLS)');
      console.log('   3. Never expose service role key to frontend');
      console.log('   4. Monitor for any access issues\n');
    } else {
      console.log('⚠️  WARNING: RLS may not be fully configured.');
      console.log('   Please check for errors above.\n');
    }

  } catch (error) {
    console.error('❌ Fatal error applying RLS:', error);
  } finally {
    await sql.end();
  }
}

applyRLS();
