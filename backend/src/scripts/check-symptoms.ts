import { db, symptomEntries } from '../db/index.js';
import { desc } from 'drizzle-orm';

async function checkSymptoms() {
  try {
    console.log('Checking symptom_entries table...\n');

    const symptoms = await db.select()
      .from(symptomEntries)
      .orderBy(desc(symptomEntries.created_at))
      .limit(10);

    console.log(`Total symptoms retrieved: ${symptoms.length}\n`);

    if (symptoms.length > 0) {
      console.log('Latest 10 symptoms:');
      symptoms.forEach((s, idx) => {
        console.log(`\n${idx + 1}. Symptom ID: ${s.id}`);
        console.log(`   User ID: ${s.user_id}`);
        console.log(`   Category: ${s.category}`);
        console.log(`   Type: ${s.type}`);
        console.log(`   Severity: ${s.severity}`);
        console.log(`   Capture Method: ${s.capture_method}`);
        console.log(`   Enrichment Status: ${s.enrichment_status}`);
        console.log(`   Created: ${s.created_at}`);
      });
    } else {
      console.log('No symptoms found in database');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error checking symptoms:', error);
    process.exit(1);
  }
}

checkSymptoms();
