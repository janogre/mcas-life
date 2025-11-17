import { db, symptomEntries } from '../db/index.js';
import { eq } from 'drizzle-orm';

async function deleteTestSymptoms() {
  try {
    console.log('Deleting test symptoms with "Quick capture" type...\n');

    const result = await db
      .delete(symptomEntries)
      .where(eq(symptomEntries.type, 'Quick capture'))
      .returning();

    console.log(`✅ Deleted ${result.length} test symptoms:\n`);

    result.forEach((s, idx) => {
      console.log(`${idx + 1}. Symptom ID: ${s.id} - User: ${s.user_id} - Category: ${s.category}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error deleting test symptoms:', error);
    process.exit(1);
  }
}

deleteTestSymptoms();
