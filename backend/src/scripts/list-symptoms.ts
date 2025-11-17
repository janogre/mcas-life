import { db } from '../db/connection.js';
import { symptomEntries } from '../db/schema.js';
import { desc } from 'drizzle-orm';

async function listSymptoms() {
  try {
    console.log('Fetching symptoms from database...\n');

    const symptoms = await db.select()
      .from(symptomEntries)
      .orderBy(desc(symptomEntries.id))
      .limit(15);

    console.log(`Found ${symptoms.length} symptoms:\n`);
    symptoms.forEach(symptom => {
      console.log(`ID: ${symptom.id}`);
      console.log(`  User: ${symptom.user_id}`);
      console.log(`  Category: ${symptom.category}`);
      console.log(`  Type: ${symptom.type || symptom.symptom_type || 'N/A'}`);
      console.log(`  Severity: ${symptom.severity}`);
      console.log(`  Started: ${symptom.started_at}`);
      console.log(`  Capture Method: ${symptom.capture_method || 'N/A'}`);
      console.log(`  Enrichment Status: ${symptom.enrichment_status || 'N/A'}`);
      console.log('---');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listSymptoms();
