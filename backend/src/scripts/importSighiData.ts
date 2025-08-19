/**
 * SIGHI Data Import Script
 * 
 * Imports SIGHI food data from MCAS-search server.js into MCAS-Life database
 * Uses the corrected server.js as the authoritative source instead of the error-prone JS files
 */

import * as fs from 'fs';
import * as path from 'path';
import { foodService } from '../services/food/foodService.js';

// Path to MCAS-search project data
const MCAS_SEARCH_PATH = path.join(process.cwd(), '..', '..', 'MCAS-search');
const SERVER_JS_FILE = path.join(MCAS_SEARCH_PATH, 'server.js');

console.log('🍎 MCAS-Life SIGHI Data Import (from server.js)');
console.log('================================================\n');

interface McasSearchFood {
  name_no: string;
  name_en: string;
  category: string;
  compatibility: number;
  triggers: string | string[];
  remarks_no: string;
  remarks_en: string;
}

/**
 * Extract foods array from server.js file
 */
function extractFoodsFromServerJs(filePath: string): McasSearchFood[] {
  try {
    console.log(`📂 Reading food data from: ${filePath}`);
    
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // Find the foods array in server.js between "const foods = [" and "];"
    const startMatch = fileContent.match(/const foods = \[/);
    if (!startMatch) {
      throw new Error('Could not find "const foods = [" in server.js');
    }
    
    const startIndex = startMatch.index! + startMatch[0].length;
    
    // Find the matching closing bracket - need to count brackets to handle nested arrays
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
    
    console.log(`📊 Extracted foods array (${Math.round(foodsArrayStr.length / 1024)}KB)`);
    
    // Use eval to parse the JavaScript array (controlled source)
    const foods = eval(foodsArrayStr) as McasSearchFood[];
    
    console.log(`✅ Successfully extracted ${foods.length} food items from server.js`);
    return foods;
    
  } catch (error) {
    console.error(`❌ Error reading server.js file:`, error);
    throw error;
  }
}

/**
 * Clean and validate food data from server.js
 */
function cleanFoodData(foods: McasSearchFood[]): McasSearchFood[] {
  console.log('🧹 Cleaning and validating food data from server.js...');
  
  const cleaned = foods
    .filter(food => {
      // Filter out invalid entries
      if (!food.name_no || !food.name_en) {
        console.log(`⚠️  Skipping food with missing name: ${food.name_no || food.name_en}`);
        return false;
      }
      
      // Server.js uses compatibility levels 0-3, which matches our updated SIGHI scale
      if (![0, 1, 2, 3].includes(food.compatibility)) {
        console.log(`⚠️  Skipping food with invalid compatibility: ${food.name_no} (${food.compatibility})`);
        return false;
      }
      
      return true;
    })
    .map(food => {
      // Clean up the data - no mapping needed, use original 0-3 scale
      
      return {
        ...food,
        name_no: food.name_no.trim(),
        name_en: food.name_en.trim(),
        category: food.category || 'Ukjent kategori',
        compatibility: food.compatibility,
        remarks_no: food.remarks_no === 'nan' ? '' : food.remarks_no || '',
        remarks_en: food.remarks_en === 'nan' ? '' : food.remarks_en || '',
        triggers: food.triggers || []
      };
    });
  
  console.log(`✅ Cleaned data: ${cleaned.length} valid food items`);
  console.log(`📊 Food compatibility distribution (SIGHI 0-3 scale):`);
  
  const compatibilityCount = { 0: 0, 1: 0, 2: 0, 3: 0 };
  cleaned.forEach(food => {
    compatibilityCount[food.compatibility as keyof typeof compatibilityCount]++;
  });
  
  console.log(`   - Safe (0): ${compatibilityCount[0]} foods`);
  console.log(`   - Medium (1): ${compatibilityCount[1]} foods`);
  console.log(`   - Incompatible (2): ${compatibilityCount[2]} foods`);
  console.log(`   - Severe (3): ${compatibilityCount[3]} foods`);
  
  return cleaned;
}

/**
 * Analyze trigger distribution
 */
function analyzeTriggers(foods: McasSearchFood[]) {
  console.log('\n🔍 Analyzing SIGHI triggers from server.js...');
  
  const triggerCounts: Record<string, number> = {};
  const triggerNames: Record<string, string> = {
    'H': 'Histamine',
    'L': 'Lectins',
    'A': 'Aromatic compounds',
    'B': 'Biogenic amines',
    'S': 'Salicylates',
    'T': 'Tyramine',
    'P': 'Phenolic compounds',
    'N': 'Natural compounds',
    'D': 'Digestive irritants',
    'C': 'Cross-reactive allergens'
  };
  
  foods.forEach(food => {
    if (food.triggers) {
      try {
        const triggers = typeof food.triggers === 'string' 
          ? JSON.parse(food.triggers) 
          : food.triggers;
          
        triggers.forEach((trigger: string) => {
          // Clean trigger (remove exclamation marks etc.)
          const cleanTrigger = trigger.replace(/[^A-Z]/g, '');
          if (cleanTrigger) {
            triggerCounts[cleanTrigger] = (triggerCounts[cleanTrigger] || 0) + 1;
          }
        });
      } catch (e) {
        // Skip invalid trigger data
      }
    }
  });
  
  console.log('📊 Trigger distribution:');
  Object.entries(triggerCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([trigger, count]) => {
      const name = triggerNames[trigger] || 'Unknown';
      console.log(`   - ${trigger} (${name}): ${count} foods`);
    });
}

/**
 * Show food categories from server.js
 */
function analyzeCategories(foods: McasSearchFood[]) {
  console.log('\n📂 Analyzing food categories from server.js...');
  
  const categoryCount: Record<string, number> = {};
  foods.forEach(food => {
    const category = food.category || 'Ukjent kategori';
    categoryCount[category] = (categoryCount[category] || 0) + 1;
  });
  
  console.log('📊 Category distribution:');
  Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([category, count]) => {
      console.log(`   - ${category}: ${count} foods`);
    });
}

/**
 * Show sample foods from server.js
 */
function showSampleFoods(foods: McasSearchFood[]) {
  console.log('\n🥗 Sample foods from server.js (each compatibility level):');
  
  [0, 1, 2, 3].forEach(compatibility => {
    const levelName = compatibility === 0 ? 'Safe' : 
                     compatibility === 1 ? 'Medium' : 
                     compatibility === 2 ? 'Incompatible' : 'Severe';
    const samples = foods.filter(f => f.compatibility === compatibility).slice(0, 5);
    
    console.log(`\n${levelName} foods (${compatibility}):`);
    samples.forEach(food => {
      const triggers = food.triggers ? 
        (typeof food.triggers === 'string' ? JSON.parse(food.triggers) : food.triggers) : [];
      console.log(`   - ${food.name_no} (${food.name_en})`);
      if (triggers.length > 0) {
        console.log(`     Triggers: ${triggers.join(', ')}`);
      }
      if (food.remarks_no && food.remarks_no !== 'nan') {
        console.log(`     Note: ${food.remarks_no.substring(0, 50)}${food.remarks_no.length > 50 ? '...' : ''}`);
      }
    });
  });
}

/**
 * Show differences from the problematic JS file
 */
function showDataQualityComparison(foods: McasSearchFood[]) {
  console.log('\n🔍 Data Quality Analysis (server.js vs problematic JS files):');
  
  // Analyze data quality indicators
  const qualityMetrics = {
    total_foods: foods.length,
    foods_with_names: foods.filter(f => f.name_no && f.name_en).length,
    foods_with_valid_compatibility: foods.filter(f => [0,1,2,3].includes(f.compatibility)).length,
    foods_with_remarks: foods.filter(f => f.remarks_no && f.remarks_no !== 'nan').length,
    foods_with_triggers: foods.filter(f => f.triggers && Array.isArray(JSON.parse(f.triggers)) && JSON.parse(f.triggers).length > 0).length,
    unique_norwegian_names: new Set(foods.map(f => f.name_no)).size,
    unique_english_names: new Set(foods.map(f => f.name_en)).size
  };
  
  console.log('📊 Data quality metrics:');
  console.log(`   - Total foods: ${qualityMetrics.total_foods}`);
  console.log(`   - Foods with both names: ${qualityMetrics.foods_with_names} (${Math.round(qualityMetrics.foods_with_names/qualityMetrics.total_foods*100)}%)`);
  console.log(`   - Foods with valid compatibility: ${qualityMetrics.foods_with_valid_compatibility} (${Math.round(qualityMetrics.foods_with_valid_compatibility/qualityMetrics.total_foods*100)}%)`);
  console.log(`   - Foods with remarks: ${qualityMetrics.foods_with_remarks} (${Math.round(qualityMetrics.foods_with_remarks/qualityMetrics.total_foods*100)}%)`);
  console.log(`   - Foods with triggers: ${qualityMetrics.foods_with_triggers} (${Math.round(qualityMetrics.foods_with_triggers/qualityMetrics.total_foods*100)}%)`);
  console.log(`   - Unique Norwegian names: ${qualityMetrics.unique_norwegian_names}`);
  console.log(`   - Unique English names: ${qualityMetrics.unique_english_names}`);
  
  // Check for potential duplicates
  const duplicateCheck = foods.reduce((acc, food, index) => {
    const key = `${food.name_no}|${food.name_en}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(index);
    return acc;
  }, {} as Record<string, number[]>);
  
  const duplicates = Object.entries(duplicateCheck).filter(([, indices]) => indices.length > 1);
  
  if (duplicates.length > 0) {
    console.log(`\n⚠️  Found ${duplicates.length} potential duplicate foods:`);
    duplicates.slice(0, 5).forEach(([key, indices]) => {
      const [name_no, name_en] = key.split('|');
      console.log(`   - "${name_no}" / "${name_en}" (appears ${indices.length} times)`);
    });
    if (duplicates.length > 5) {
      console.log(`   ... and ${duplicates.length - 5} more duplicates`);
    }
  } else {
    console.log('✅ No duplicate foods found in server.js data');
  }
}

/**
 * Main import function using server.js
 */
async function importSighiData() {
  try {
    console.log(`📍 Looking for MCAS-search server.js at: ${MCAS_SEARCH_PATH}`);
    
    // Check if MCAS-search directory exists
    if (!fs.existsSync(MCAS_SEARCH_PATH)) {
      throw new Error(`MCAS-search directory not found at: ${MCAS_SEARCH_PATH}`);
    }
    
    // Check if server.js file exists
    if (!fs.existsSync(SERVER_JS_FILE)) {
      throw new Error(`server.js file not found at: ${SERVER_JS_FILE}`);
    }
    
    console.log('✅ Found server.js - using as authoritative SIGHI data source\n');
    
    return importFromServerJs(SERVER_JS_FILE);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

async function importFromServerJs(filePath: string) {
  // Extract food data from server.js
  const rawFoods = extractFoodsFromServerJs(filePath);
  
  // Clean and validate
  const cleanedFoods = cleanFoodData(rawFoods);
  
  // Analyze the data
  analyzeTriggers(cleanedFoods);
  analyzeCategories(cleanedFoods);
  showSampleFoods(cleanedFoods);
  showDataQualityComparison(cleanedFoods);
  
  // Ask for confirmation
  console.log(`\n🤔 Ready to import ${cleanedFoods.length} foods from server.js into MCAS-Life database.`);
  console.log('This will overwrite existing food data with the corrected server.js data.');
  
  // For automated import, skip confirmation
  if (process.argv.includes('--auto')) {
    console.log('🚀 Auto-import enabled, proceeding...');
  } else {
    console.log('👉 Add --auto flag to proceed with import');
    console.log('   Example: npm run import:sighi -- --auto');
    return;
  }
  
  // Perform the import
  console.log('\n📥 Starting database import from server.js...');
  
  const result = await foodService.bulkImportFoods({
    foods: cleanedFoods,
    overwrite_existing: true
  });
  
  console.log('\n✅ Import from server.js completed!');
  console.log(`📊 Results:`);
  console.log(`   - Imported: ${result.imported} foods`);
  console.log(`   - Skipped: ${result.skipped} foods`);
  console.log(`   - Errors: ${result.errors.length}`);
  
  if (result.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    result.errors.slice(0, 5).forEach(error => console.log(`   - ${error}`));
    if (result.errors.length > 5) {
      console.log(`   ... and ${result.errors.length - 5} more errors`);
    }
  }
  
  // Show final statistics
  console.log('\n📈 Final database statistics:');
  const stats = await foodService.getFoodStatistics();
  console.log(`   - Total foods: ${stats.total_foods}`);
  console.log(`   - Safe foods: ${stats.by_compatibility.Safe || 0}`);
  console.log(`   - Medium foods: ${stats.by_compatibility.Medium || 0}`);
  console.log(`   - Incompatible foods: ${stats.by_compatibility.Incompatible || 0}`);
  console.log(`   - Severe foods: ${stats.by_compatibility.Severe || 0}`);
  
  console.log('\n🎉 SIGHI data import from server.js successful!');
  console.log('The MCAS-Life food database now contains the corrected data from server.js.');
}

// Run the import if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  importSighiData();
}

export { importSighiData };