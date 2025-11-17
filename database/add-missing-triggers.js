/**
 * SIGHI Food Database - Add missing H! trigger codes
 * 
 * Legger til manglende "H!" (Highly perishable) trigger-koder basert på SIGHI PDF
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Matvarer som skal ha "H!" trigger basert på SIGHI PDF
const HIGHLY_PERISHABLE_FOODS = [
  // Meat - fresh meat is highly perishable
  'beef', 'chicken', 'duck', 'ostrich', 'pork', 'poultry meat', 'poultry', 
  'quail', 'turkey', 'veal', 'fresh meat', 'fresh beef', 'fresh chicken',
  'fresh pork', 'fresh veal', 'minced meat', 'ground meat', 'kjøttdeig',
  'kylling', 'biff', 'svin', 'kalv', 'kalkun', 'and', 'fersk kjøtt',
  
  // Fish - fresh fish is highly perishable
  'fish', 'trout', 'salmon', 'cod', 'tuna', 'fresh fish', 'frozen fish',
  'fisk', 'laks', 'torsk', 'ørret', 'fersk fisk', 'frossen fisk',
  
  // Seafood - highly perishable
  'crab', 'lobster', 'shrimp', 'prawns', 'mussels', 'oysters', 'scallops',
  'krabbe', 'hummer', 'reker', 'blåskjell', 'østers',
  
  // Dairy - raw milk
  'raw milk', 'upasteurized milk', 'rå melk', 'upastørisert melk',
  
  // Organs/innards
  'liver', 'kidney', 'heart', 'brain', 'entrails', 'innards',
  'lever', 'nyre', 'hjerte', 'hjerne', 'innmat'
];

/**
 * Sjekker om en matvare skal ha H! trigger
 */
function shouldHaveHighlyPerishable(foodNameEn, foodNameNo, category) {
  const searchText = (foodNameEn + ' ' + foodNameNo + ' ' + category).toLowerCase();
  
  return HIGHLY_PERISHABLE_FOODS.some(keyword => 
    searchText.includes(keyword.toLowerCase())
  );
}

/**
 * Legger til manglende H! trigger-koder
 */
function addMissingTriggers() {
  console.log('🔧 Starter tillegg av manglende H! trigger-koder...');
  
  const jsonPath = path.join(__dirname, 'sighi-foods-data.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  let addedCount = 0;
  const beforeStats = {};
  const afterStats = {};
  
  // Tell trigger-koder før
  data.foods.forEach(food => {
    if (food.triggers && food.triggers.length > 0) {
      food.triggers.forEach(trigger => {
        beforeStats[trigger] = (beforeStats[trigger] || 0) + 1;
      });
    }
  });
  
  // Gå gjennom alle matvarer
  data.foods.forEach(food => {
    const shouldAddH = shouldHaveHighlyPerishable(food.name_en, food.name_no, food.category);
    
    if (shouldAddH) {
      // Sørg for at triggers array eksisterer
      if (!food.triggers) {
        food.triggers = [];
      }
      
      // Legg til H! hvis den ikke allerede finnes
      if (!food.triggers.includes('H!')) {
        food.triggers.push('H!');
        addedCount++;
        console.log(`✓ Lagt til H! for: ${food.name_no} (${food.name_en})`);
      }
    }
  });
  
  // Tell trigger-koder etter
  data.foods.forEach(food => {
    if (food.triggers && food.triggers.length > 0) {
      food.triggers.forEach(trigger => {
        afterStats[trigger] = (afterStats[trigger] || 0) + 1;
      });
    }
  });
  
  // Lagre oppdaterte data
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  
  console.log(`\n✅ Ferdig! Lagt til H! trigger for ${addedCount} matvarer.`);
  
  console.log('\n📊 Trigger-statistikk:');
  console.log('\nFør:');
  Object.entries(beforeStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([trigger, count]) => {
      console.log(`  ${trigger}: ${count} matvarer`);
    });
  
  console.log('\nEtter:');
  Object.entries(afterStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([trigger, count]) => {
      console.log(`  ${trigger}: ${count} matvarer`);
    });
  
  if (afterStats['H!']) {
    console.log(`\n🥩 ${afterStats['H!']} matvarer har nå "H!" (Highly perishable) trigger`);
  }
}

// Kjør scriptet
addMissingTriggers();

export { addMissingTriggers };