import { db } from './src/db/connection.js';
import { medicationsCatalog } from './src/db/schema.js';

async function testSeed() {
  console.log('Starting seed...');

  const testMed = {
    name: 'Test Loratadin',
    active_substance: 'Loratadin',
    atc_code: 'R06AX13',
    form: 'Tablett',
    strength: '10 mg',
    prescription_required: false,
    approved: true,
  };

  try {
    console.log('Inserting medication...');
    const result = await db.insert(medicationsCatalog).values(testMed).onConflictDoNothing().returning();
    console.log('Insert result:', result);
    console.log('Success!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testSeed();
