import { db } from './src/db/connection.js';
import { medicationsCatalog } from './src/db/schema.js';
import { sql } from 'drizzle-orm';

async function checkMeds() {
  const count = await db.execute(sql`SELECT COUNT(*) as count FROM medications_catalog`);
  console.log('Medications in database:', count);
  
  const sample = await db.execute(sql`SELECT id, name, active_substance FROM medications_catalog LIMIT 5`);
  console.log('\nSample medications:');
  console.log(sample);
  
  process.exit(0);
}

checkMeds().catch(console.error);
