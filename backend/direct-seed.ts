import { db } from './src/db/connection.js';
import { medicationsCatalog } from './src/db/schema.js';

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

async function seedDirectly() {
  console.log(`🌱 Seeding ${MCAS_MEDICATIONS.length} MCAS medications...`);

  try {
    const result = await db.insert(medicationsCatalog).values(MCAS_MEDICATIONS).onConflictDoNothing().returning();
    console.log(`✅ Successfully seeded ${result.length} medications!`);
    console.log('Medications:', result.map(m => m.name));
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

seedDirectly();
