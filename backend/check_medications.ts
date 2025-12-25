import { db } from './src/db/connection.js';
import { medicationsCatalog } from './src/db/schema.js';

async function checkMedications() {
  const count = await db.select().from(medicationsCatalog);
  console.log(`Found ${count.length} medications in database`);
  if (count.length > 0) {
    console.log('First 3 medications:', count.slice(0, 3).map(m => m.name));
  }
  process.exit(0);
}

checkMedications().catch(console.error);
