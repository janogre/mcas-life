/**
 * Import Updated SIGHI Data Script
 * 
 * Imports the updated SIGHI food data from our corrected JSON file into PostgreSQL database
 */

import * as fs from 'fs';
import * as path from 'path';
import { foodService } from '../services/food/foodService.js';

// Path to our corrected JSON file
const UPDATED_JSON_PATH = path.join(process.cwd(), '..', '..', 'database', 'sighi-foods-data.json');

console.log('🍎 MCAS-Life SIGHI Data Import (from updated JSON)');
console.log('==================================================\n');

interface UpdatedSighiFood {
  id: number;
  name_no: string;
  name_en: string;
  category: string;
  compatibility: number;
  triggers: string[];
  remarks_no: string;
  remarks_en: string;
}

/**
 * Import from updated JSON file
 */
async function importFromUpdatedJson() {
  try {
    console.log(`📂 Reading updated SIGHI data from: ${UPDATED_JSON_PATH}`);
    
    if (!fs.existsSync(UPDATED_JSON_PATH)) {
      throw new Error(`Updated JSON file not found at: ${UPDATED_JSON_PATH}`);
    }
    
    const rawData = fs.readFileSync(UPDATED_JSON_PATH, 'utf-8');
    const jsonData = JSON.parse(rawData);
    
    if (!jsonData.foods || !Array.isArray(jsonData.foods)) {
      throw new Error('Invalid JSON structure - missing foods array');
    }
    
    const foods = jsonData.foods as UpdatedSighiFood[];
    console.log(`✅ Loaded ${foods.length} foods from updated JSON`);
    
    // Transform data for import
    const foodsForImport = foods.map(food => ({
      name_no: food.name_no.trim(),
      name_en: food.name_en.trim(),
      category: food.category,
      compatibility: food.compatibility,
      triggers: food.triggers,
      remarks_no: food.remarks_no || '',
      remarks_en: food.remarks_en || ''
    }));
    
    console.log('\n📊 Data statistics:');
    
    // Count categories
    const categoryStats = {};
    foodsForImport.forEach(food => {
      categoryStats[food.category] = (categoryStats[food.category] || 0) + 1;
    });
    
    console.log('\nTop categories:');
    Object.entries(categoryStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([category, count]) => {
        console.log(`  ${category}: ${count} foods`);
      });
    
    // Count triggers
    const triggerStats = {};
    foodsForImport.forEach(food => {
      if (food.triggers && food.triggers.length > 0) {
        food.triggers.forEach(trigger => {
          triggerStats[trigger] = (triggerStats[trigger] || 0) + 1;
        });
      }
    });
    
    console.log('\nTrigger distribution:');
    Object.entries(triggerStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([trigger, count]) => {
        console.log(`  ${trigger}: ${count} foods`);
      });
    
    // Count compatibility levels
    const compatStats = {};
    foodsForImport.forEach(food => {
      compatStats[food.compatibility] = (compatStats[food.compatibility] || 0) + 1;
    });
    
    console.log('\nCompatibility distribution:');
    [0, 1, 2, 3].forEach(level => {
      const levelName = level === 0 ? 'Safe' : 
                       level === 1 ? 'Medium' : 
                       level === 2 ? 'Incompatible' : 'Severe';
      console.log(`  ${level} (${levelName}): ${compatStats[level] || 0} foods`);
    });
    
    console.log(`\n🤔 Ready to import ${foodsForImport.length} foods into PostgreSQL database.`);
    console.log('This will overwrite existing food data with the corrected categories and triggers.');
    
    // For automated import, check for --auto flag
    if (process.argv.includes('--auto')) {
      console.log('🚀 Auto-import enabled, proceeding...');
    } else {
      console.log('👉 Add --auto flag to proceed with import');
      console.log('   Example: npm run import:updated -- --auto');
      return;
    }
    
    // Perform the import
    console.log('\n📥 Starting database import from updated JSON...');
    
    const result = await foodService.bulkImportFoods({
      foods: foodsForImport,
      overwrite_existing: true
    });
    
    console.log('\n✅ Import completed!');
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
    
    console.log('\n🎉 SIGHI data import from updated JSON successful!');
    console.log('The MCAS-Life food database now contains the corrected categories and triggers.');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run the import if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  importFromUpdatedJson();
}

export { importFromUpdatedJson };