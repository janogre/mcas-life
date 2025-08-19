/**
 * Quick SIGHI Data Import
 */

import * as fs from 'fs';
import * as path from 'path';
import { foodService } from '../services/food/foodService.js';

const SERVER_JS_FILE = path.join(process.cwd(), '..', '..', 'MCAS-search', 'server.js');

async function quickImport() {
  console.log('🍎 Quick SIGHI Import');
  console.log(`📍 Reading from: ${SERVER_JS_FILE}`);
  
  try {
    // Read and extract foods array
    const fileContent = fs.readFileSync(SERVER_JS_FILE, 'utf-8');
    const startMatch = fileContent.match(/const foods = \[/);
    if (!startMatch) {
      throw new Error('Could not find foods array');
    }
    
    const startIndex = startMatch.index! + startMatch[0].length;
    let bracketCount = 1;
    let endIndex = startIndex;
    
    for (let i = startIndex; i < fileContent.length; i++) {
      if (fileContent[i] === '[') bracketCount++;
      else if (fileContent[i] === ']') {
        bracketCount--;
        if (bracketCount === 0) {
          endIndex = i;
          break;
        }
      }
    }
    
    const foodsArrayStr = '[' + fileContent.substring(startIndex, endIndex + 1);
    console.log(`📊 Extracted array (${Math.round(foodsArrayStr.length / 1024)}KB)`);
    
    // Parse the array
    const foods = eval(foodsArrayStr) as any[];
    console.log(`✅ Found ${foods.length} foods`);
    
    // Show first few foods
    console.log('\n🥗 Sample foods:');
    foods.slice(0, 5).forEach((food, i) => {
      console.log(`${i + 1}. ${food.name_no} (${food.name_en}) - compatibility: ${food.compatibility}`);
    });
    
    // Import to database
    console.log('\n📥 Starting database import...');
    const result = await foodService.bulkImportFoods({
      foods: foods,
      overwrite_existing: true
    });
    
    console.log(`\n✅ Import completed!`);
    console.log(`   - Imported: ${result.imported}`);
    console.log(`   - Skipped: ${result.skipped}`);
    console.log(`   - Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log('\n❌ Errors:');
      result.errors.slice(0, 3).forEach(err => console.log(`   - ${err}`));
    }
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

quickImport();