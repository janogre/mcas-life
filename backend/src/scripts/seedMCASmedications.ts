/**
 * Seed MCAS Medications
 *
 * Seeds the medications_catalog with common MCAS medications
 * This is a minimal dataset for testing until full FEST import is done
 */

import { db } from '../db/connection.js';
import { medicationsCatalog } from '../db/schema.js';

const MCAS_MEDICATIONS = [
  // Antihistaminer (H1)
  {
    name: 'Loratadin (Clarityn)',
    active_substance: 'Loratadin',
    atc_code: 'R06AX13',
    form: 'Tablett',
    strength: '10 mg',
    prescription_required: false,
    approved: true,
  },
  {
    name: 'Cetirizin (Zyrtec)',
    active_substance: 'Cetirizin',
    atc_code: 'R06AE07',
    form: 'Tablett',
    strength: '10 mg',
    prescription_required: false,
    approved: true,
  },
  {
    name: 'Desloratadin (Aerius)',
    active_substance: 'Desloratadin',
    atc_code: 'R06AX27',
    form: 'Tablett',
    strength: '5 mg',
    prescription_required: false,
    approved: true,
  },
  {
    name: 'Levocetirizin (Xyzal)',
    active_substance: 'Levocetirizin',
    atc_code: 'R06AE09',
    form: 'Tablett',
    strength: '5 mg',
    prescription_required: false,
    approved: true,
  },
  {
    name: 'Klemastin (Tavegyl)',
    active_substance: 'Klemastin',
    atc_code: 'R06AA04',
    form: 'Tablett',
    strength: '1 mg',
    prescription_required: false,
    approved: true,
  },

  // Antihistaminer (H2)
  {
    name: 'Famotidin',
    active_substance: 'Famotidin',
    atc_code: 'A02BA03',
    form: 'Tablett',
    strength: '20 mg',
    prescription_required: true,
    approved: true,
  },
  {
    name: 'Ranitidin',
    active_substance: 'Ranitidin',
    atc_code: 'A02BA02',
    form: 'Tablett',
    strength: '150 mg',
    prescription_required: true,
    approved: true,
  },

  // Mastzellestabilisatorer
  {
    name: 'Ketotifen',
    active_substance: 'Ketotifen',
    atc_code: 'R06AX17',
    form: 'Tablett',
    strength: '1 mg',
    prescription_required: true,
    approved: true,
  },
  {
    name: 'Cromoglicic acid (Lomudal)',
    active_substance: 'Natriumkromoglikat',
    atc_code: 'R01AC01',
    form: 'Nesespray',
    strength: '2%',
    prescription_required: true,
    approved: true,
  },

  // Leukotrienantagonister
  {
    name: 'Montelukast (Singulair)',
    active_substance: 'Montelukast',
    atc_code: 'R03DC03',
    form: 'Tablett',
    strength: '10 mg',
    prescription_required: true,
    approved: true,
  },

  // DAO-supplement
  {
    name: 'DAOsin',
    active_substance: 'Diaminoksidase',
    atc_code: null,
    form: 'Kapsel',
    strength: '4.2 mg',
    prescription_required: false,
    approved: true,
  },

  // Kortikosteroider (for alvorlige reaksjoner)
  {
    name: 'Prednisolon',
    active_substance: 'Prednisolon',
    atc_code: 'H02AB06',
    form: 'Tablett',
    strength: '5 mg',
    prescription_required: true,
    approved: true,
  },

  // Vitamin C (histaminnedbryting)
  {
    name: 'Vitamin C',
    active_substance: 'Askorbinsyre',
    atc_code: 'A11GA01',
    form: 'Tablett',
    strength: '1000 mg',
    prescription_required: false,
    approved: true,
  },

  // Quercetin (mastzellestabilisator)
  {
    name: 'Quercetin',
    active_substance: 'Quercetin',
    atc_code: null,
    form: 'Kapsel',
    strength: '500 mg',
    prescription_required: false,
    approved: true,
  },

  // Probiotika (tarmhelse)
  {
    name: 'Lactobacillus',
    active_substance: 'Lactobacillus rhamnosus',
    atc_code: 'A07FA',
    form: 'Kapsel',
    strength: '10 mrd CFU',
    prescription_required: false,
    approved: true,
  },
];

async function seedMCASmedications() {
  console.log('🌱 Seeding MCAS medications...\n');

  try {
    console.log(`📦 Inserting ${MCAS_MEDICATIONS.length} MCAS medications...`);

    await db.insert(medicationsCatalog).values(MCAS_MEDICATIONS).onConflictDoNothing();

    console.log('✅ MCAS medications seeded successfully!');
    console.log(`   Total medications: ${MCAS_MEDICATIONS.length}`);

    // Show breakdown
    const h1 = MCAS_MEDICATIONS.filter(m => m.atc_code?.startsWith('R06')).length;
    const h2 = MCAS_MEDICATIONS.filter(m => m.atc_code?.startsWith('A02BA')).length;
    const stabilizers = MCAS_MEDICATIONS.filter(m => m.name.includes('Ketotifen') || m.name.includes('Cromoglicic')).length;
    const supplements = MCAS_MEDICATIONS.filter(m => !m.prescription_required && m.atc_code === null).length;

    console.log('\n📊 Breakdown:');
    console.log(`   H1 antihistamines: ${h1}`);
    console.log(`   H2 antihistamines: ${h2}`);
    console.log(`   Mast cell stabilizers: ${stabilizers}`);
    console.log(`   Supplements: ${supplements}`);

  } catch (error) {
    console.error('❌ Error seeding MCAS medications:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedMCASmedications()
    .then(() => {
      console.log('✅ Seed completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}

export { seedMCASmedications };
