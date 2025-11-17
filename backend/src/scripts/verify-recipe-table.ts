/**
 * Verify Recipe Table
 */

import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

async function verify() {
  try {
    console.log('🔍 Verifying saved_recipes table...');

    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'saved_recipes'
      )
    `);

    console.log('Table exists:', tableExists);

    const count = await db.execute(sql`SELECT COUNT(*) FROM saved_recipes`);
    console.log('Current rows:', count);

  } catch (error) {
    console.error('Verification error:', error);
  } finally {
    process.exit(0);
  }
}

verify();
