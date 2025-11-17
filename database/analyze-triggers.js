/**
 * SIGHI Food Database - Analyze trigger codes
 * 
 * Analyserer de nåværende trigger-kodene i databasen
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function analyzeTriggers() {
  console.log('🔍 Analyserer trigger-koder i SIGHI database...');
  
  const jsonPath = path.join(__dirname, 'sighi-foods-data.json');
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  const triggerCounts = {};
  let totalWithTriggers = 0;
  
  // Tell trigger-koder
  data.foods.forEach(food => {
    if (food.triggers && food.triggers.length > 0) {
      totalWithTriggers++;
      food.triggers.forEach(trigger => {
        triggerCounts[trigger] = (triggerCounts[trigger] || 0) + 1;
      });
    }
  });
  
  console.log('\n📊 Trigger-koder i bruk:');
  Object.entries(triggerCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([trigger, count]) => {
      console.log(`  ${trigger}: ${count} matvarer`);
    });
  
  console.log(`\nTotalt ${totalWithTriggers} av ${data.foods.length} matvarer har trigger-koder`);
  
  // Vis eksempler på hver trigger-kode
  console.log('\n🥗 Eksempler på matvarer med trigger-koder:');
  Object.keys(triggerCounts).forEach(trigger => {
    const examples = data.foods
      .filter(food => food.triggers && food.triggers.includes(trigger))
      .slice(0, 3);
    
    console.log(`\n${trigger}:`);
    examples.forEach(food => {
      console.log(`  - ${food.name_no} (${food.name_en})`);
    });
  });
}

// Kjør analysen
analyzeTriggers();

export { analyzeTriggers };