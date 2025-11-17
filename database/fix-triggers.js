/**
 * SIGHI Food Database - Fix trigger codes
 * 
 * Korrigerer trigger-kodene til SIGHI-standard basert på offisielle PDF
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SIGHI-standard trigger-koder fra offisiell PDF
const SIGHI_TRIGGER_CODES = {
  'H!': 'Highly perishable, rapid formation of histamine',
  'H': 'High histamine content',
  'A': 'Other biogenic amines',
  'L': 'Liberators of mast cell mediators (histamine liberators)',
  'B': 'Blocker (inhibitors) of diamine oxidase or histamine degrading enzymes'
};

/**
 * Korrigerer trigger-koder basert på SIGHI PDF-mappinger
 */
function correctTriggerCodes() {
  console.log('🔧 Starter korrigering av trigger-koder til SIGHI-standard...');
  
  const jsonPath = path.join(__dirname, 'sighi-foods-data.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  let correctedCount = 0;
  const triggerStats = { before: {}, after: {} };
  
  // Tell før korrigering
  data.foods.forEach(food => {
    if (food.triggers && food.triggers.length > 0) {
      food.triggers.forEach(trigger => {
        triggerStats.before[trigger] = (triggerStats.before[trigger] || 0) + 1;
      });
    }
  });
  
  // Gå gjennom alle matvarer og korriger trigger-koder
  data.foods.forEach(food => {
    if (food.triggers && food.triggers.length > 0) {
      let hasChanges = false;
      const correctedTriggers = food.triggers.map(trigger => {
        // Sjekk om trigger-koden er gyldig SIGHI-kode
        if (SIGHI_TRIGGER_CODES[trigger]) {
          return trigger; // Allerede korrekt
        }
        
        // Korriger vanlige feil
        switch (trigger) {
          case 'HA': // Feil kombinasjon - splitt til H og A
            hasChanges = true;
            return ['H', 'A'];
          case 'HL': // Feil kombinasjon - splitt til H og L
            hasChanges = true;
            return ['H', 'L'];
          case 'AL': // Feil kombinasjon - splitt til A og L
            hasChanges = true;
            return ['A', 'L'];
          case 'HAL': // Feil kombinasjon - splitt til H, A og L
            hasChanges = true;
            return ['H', 'A', 'L'];
          case 'HB': // Feil kombinasjon - splitt til H og B
            hasChanges = true;
            return ['H', 'B'];
          case 'LB': // Feil kombinasjon - splitt til L og B
            hasChanges = true;
            return ['L', 'B'];
          case 'HALB': // Feil kombinasjon - splitt til H, A, L og B
            hasChanges = true;
            return ['H', 'A', 'L', 'B'];
          case 'H+': // Ugyldig format
          case 'H*':
            hasChanges = true;
            return 'H!';
          case 'L+': // Ugyldig format
          case 'L*':
            hasChanges = true;
            return 'L';
          case 'A+': // Ugyldig format
          case 'A*':
            hasChanges = true;
            return 'A';
          case 'B+': // Ugyldig format
          case 'B*':
            hasChanges = true;
            return 'B';
          default:
            // Prøv å gjenkjenne fra remarks hvis ukjent trigger
            if (!SIGHI_TRIGGER_CODES[trigger]) {
              console.log(`⚠️  Ukjent trigger-kode: "${trigger}" for ${food.name_en}`);
              return null; // Fjern ukjente koder
            }
            return trigger;
        }
      });
      
      // Flat array hvis vi har nested arrays fra splitting
      const flatTriggers = correctedTriggers.flat().filter(t => t !== null);
      
      if (hasChanges || flatTriggers.length !== food.triggers.length) {
        food.triggers = [...new Set(flatTriggers)]; // Fjern duplikater
        correctedCount++;
        console.log(`✓ ${food.name_en}: ${JSON.stringify(food.triggers)}`);
      }
    }
  });
  
  // Tell etter korrigering
  data.foods.forEach(food => {
    if (food.triggers && food.triggers.length > 0) {
      food.triggers.forEach(trigger => {
        triggerStats.after[trigger] = (triggerStats.after[trigger] || 0) + 1;
      });
    }
  });
  
  // Lagre oppdaterte data
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  
  console.log(`\n✅ Ferdig! ${correctedCount} matvarer fikk korrigerte trigger-koder.`);
  
  console.log('\n📊 Trigger-statistikk:');
  console.log('\nFør korrigering:');
  Object.entries(triggerStats.before)
    .sort((a, b) => b[1] - a[1])
    .forEach(([trigger, count]) => {
      const desc = SIGHI_TRIGGER_CODES[trigger] || 'Ukjent/ugyldig kode';
      console.log(`  ${trigger}: ${count} matvarer (${desc})`);
    });
  
  console.log('\nEtter korrigering:');
  Object.entries(triggerStats.after)
    .sort((a, b) => b[1] - a[1])
    .forEach(([trigger, count]) => {
      const desc = SIGHI_TRIGGER_CODES[trigger] || 'Ukjent/ugyldig kode';
      console.log(`  ${trigger}: ${count} matvarer (${desc})`);
    });
  
  console.log('\n📋 SIGHI trigger-koder forklart:');
  Object.entries(SIGHI_TRIGGER_CODES).forEach(([code, desc]) => {
    console.log(`  ${code}: ${desc}`);
  });
}

// Kjør scriptet
correctTriggerCodes();

export { correctTriggerCodes };