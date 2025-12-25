/**
 * FEST Import Script
 *
 * Imports medication data from FEST (Forskrivnings- og ekspedisjonsstøtte)
 * Norwegian medication database from Direktoratet for medisinske produkter
 *
 * Download FEST from: https://www.dmp.no/om-oss/distribusjon-av-legemiddeldata/fest/nedlasting-av-fest-og-safest
 *
 * Usage:
 * 1. Download FEST JSON file
 * 2. Place it in backend/data/fest.json
 * 3. Run: npm run import:fest
 */

import { db } from '../db/connection.js';
import { medicationsCatalog } from '../db/schema.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FESTMedication {
  id?: string;
  navn?: string;
  virkestoff?: string | string[];
  atcKode?: string;
  legemiddelform?: string;
  styrke?: string;
  produsent?: string;
  reseptpliktig?: boolean;
  varenummer?: string;
  pakninger?: any[];
  [key: string]: any;
}

async function parseFEST(festPath: string): Promise<FESTMedication[]> {
  console.log(`📖 Reading FEST file: ${festPath}`);

  if (!fs.existsSync(festPath)) {
    throw new Error(`FEST file not found: ${festPath}`);
  }

  const fileContent = fs.readFileSync(festPath, 'utf-8');
  const festData = JSON.parse(fileContent);

  console.log('🔍 Parsing FEST structure...');

  // FEST structure varies - try to extract medications
  // This is a simplified parser - adjust based on actual FEST structure
  let medications: FESTMedication[] = [];

  // Try different potential structures
  if (festData.LegemiddelMerkevare) {
    medications = festData.LegemiddelMerkevare;
  } else if (festData.legemidler) {
    medications = festData.legemidler;
  } else if (Array.isArray(festData)) {
    medications = festData;
  } else {
    console.log('FEST structure:', Object.keys(festData).slice(0, 10));
    throw new Error('Unable to parse FEST structure. Please check the format.');
  }

  console.log(`✅ Found ${medications.length} medications in FEST`);
  return medications;
}

function normalizeVirkestoff(virkestoff: string | string[] | undefined): string | null {
  if (!virkestoff) return null;
  if (Array.isArray(virkestoff)) {
    return virkestoff.join(', ');
  }
  return virkestoff;
}

async function importFEST() {
  console.log('🚀 Starting FEST import...\n');

  const festPath = path.join(__dirname, '../../data/fest.json');

  try {
    // Parse FEST file
    const festMedications = await parseFEST(festPath);

    console.log('💾 Importing medications to database...');

    let imported = 0;
    let skipped = 0;
    const batchSize = 100;

    for (let i = 0; i < festMedications.length; i += batchSize) {
      const batch = festMedications.slice(i, i + batchSize);
      const medicationsToInsert = [];

      for (const med of batch) {
        // Skip if missing required fields
        if (!med.navn) {
          skipped++;
          continue;
        }

        const medication = {
          fest_id: med.id || null,
          varenummer: med.varenummer || null,
          name: med.navn,
          active_substance: normalizeVirkestoff(med.virkestoff),
          atc_code: med.atcKode || null,
          form: med.legemiddelform || null,
          strength: med.styrke || null,
          manufacturer: med.produsent || null,
          prescription_required: med.reseptpliktig !== false, // Default to true
          approved: true,
          metadata: med.pakninger ? { package_sizes: med.pakninger } : null,
        };

        medicationsToInsert.push(medication);
      }

      if (medicationsToInsert.length > 0) {
        await db.insert(medicationsCatalog).values(medicationsToInsert).onConflictDoNothing();
        imported += medicationsToInsert.length;
      }

      // Progress indicator
      if (i % 500 === 0) {
        console.log(`Progress: ${i}/${festMedications.length} (${Math.round((i / festMedications.length) * 100)}%)`);
      }
    }

    console.log('\n✅ FEST Import Complete!');
    console.log(`   Imported: ${imported} medications`);
    console.log(`   Skipped: ${skipped} (missing required fields)`);

  } catch (error) {
    console.error('❌ FEST import failed:', error);
    throw error;
  }
}

// If this file is run directly, execute the import
if (import.meta.url === `file://${process.argv[1]}`) {
  importFEST()
    .then(() => {
      console.log('✅ FEST import completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ FEST import failed:', error);
      process.exit(1);
    });
}

export { importFEST };
