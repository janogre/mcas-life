import { db } from './src/db/connection.js';
import { medicationsCatalog } from './src/db/schema.js';
import { sql, or } from 'drizzle-orm';

async function testSearch() {
  const query = 'lora';
  const searchTerm = `%${query.toLowerCase()}%`;

  console.log('Testing medication search for:', query);
  console.log('Search term:', searchTerm);

  const results = await db
    .select({
      id: medicationsCatalog.id,
      name: medicationsCatalog.name,
      active_substance: medicationsCatalog.active_substance,
      form: medicationsCatalog.form,
      strength: medicationsCatalog.strength,
      prescription_required: medicationsCatalog.prescription_required,
    })
    .from(medicationsCatalog)
    .where(
      or(
        sql`LOWER(${medicationsCatalog.name}) LIKE ${searchTerm}`,
        sql`LOWER(${medicationsCatalog.active_substance}) LIKE ${searchTerm}`
      )
    )
    .limit(15);

  console.log(`\nFound ${results.length} results:`);
  results.forEach(r => console.log(`  - ${r.name} (${r.active_substance})`));

  process.exit(0);
}

testSearch().catch(console.error);
