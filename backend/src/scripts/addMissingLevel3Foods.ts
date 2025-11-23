/**
 * Add Missing Level 3 (Severe) Foods Script
 *
 * This script adds the 55 missing level 3 foods from the JSON source
 * that were somehow not imported into the database.
 */

import * as fs from 'fs';
import * as path from 'path';
import { db } from '../db/connection.js';
import { foods } from '../db/schema.js';

// Path to JSON file
const JSON_PATH = path.join(process.cwd(), '..', 'database', 'sighi-foods-data.json');

console.log('🍎 Adding Missing Level 3 (Severe) SIGHI Foods');
console.log('=============================================\n');

async function addMissingLevel3Foods() {
  try {
    console.log(`📂 Reading JSON from: ${JSON_PATH}`);

    if (!fs.existsSync(JSON_PATH)) {
      throw new Error(`JSON file not found at: ${JSON_PATH}`);
    }

    const rawData = fs.readFileSync(JSON_PATH, 'utf-8');
    const jsonData = JSON.parse(rawData);

    if (!jsonData.foods || !Array.isArray(jsonData.foods)) {
      throw new Error('Invalid JSON structure - missing foods array');
    }

    // Filter only level 3 foods
    const level3Foods = jsonData.foods.filter((f: any) => f.compatibility === 3);

    console.log(`✅ Found ${level3Foods.length} level 3 foods in JSON\n`);

    console.log('📋 Level 3 foods to add:');
    level3Foods.forEach((food: any, index: number) => {
      console.log(`  ${index + 1}. ${food.name_en} (${food.name_no})`);
    });

    console.log(`\n🔄 Inserting ${level3Foods.length} level 3 foods into database...`);

    let inserted = 0;
    let errors = 0;

    for (const food of level3Foods) {
      try {
        await db.insert(foods).values({
          name_no: food.name_no.trim(),
          name_en: food.name_en.trim(),
          category: food.category || 'Unknown',
          compatibility: '3', // enum requires string
          triggers: food.triggers || [],
          remarks_no: food.remarks_no || '',
          remarks_en: food.remarks_en || '',
          verified: false,
          source: 'sighi_manual_import',
        });
        inserted++;
        console.log(`  ✅ Added: ${food.name_en}`);
      } catch (error: any) {
        // Check if it's a duplicate error
        if (error.code === '23505') {
          console.log(`  ⚠️  Skipped (already exists): ${food.name_en}`);
        } else {
          console.error(`  ❌ Error adding ${food.name_en}:`, error.message);
          errors++;
        }
      }
    }

    console.log('\n✅ Import completed!');
    console.log(`📊 Results:`);
    console.log(`   - Inserted: ${inserted} foods`);
    console.log(`   - Skipped (duplicates): ${level3Foods.length - inserted - errors}`);
    console.log(`   - Errors: ${errors}`);

    // Verify database now has level 3 foods
    console.log('\n🔍 Verifying database...');
    const verifyResult = await db.select().from(foods).where(foods.compatibility === '3');
    console.log(`✅ Database now has ${verifyResult.length} level 3 foods!`);

    if (verifyResult.length > 0) {
      console.log('\nSample level 3 foods in database:');
      verifyResult.slice(0, 5).forEach(food => {
        console.log(`  - ${food.name_en} (${food.name_no})`);
      });
    }

    console.log('\n🎉 Mission accomplished! All level 3 foods should now be in the database.');
    process.exit(0);

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

// Run the script
addMissingLevel3Foods();
