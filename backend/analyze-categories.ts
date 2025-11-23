/**
 * Category Analysis and Quality Check Script
 * Analyzes food categories in JSON source vs database
 */

import fs from 'fs';
import path from 'path';
import { db } from './src/db/connection.js';
import { foods } from './src/db/schema.js';
import { sql, eq } from 'drizzle-orm';

interface FoodData {
  id: number;
  name_no: string;
  name_en: string;
  category: string;
  compatibility: number;
  triggers: string[];
  remarks_no: string;
  remarks_en: string;
}

interface SourceData {
  foods: FoodData[];
}

async function analyzeCategories() {
  console.log('📊 MCAS-Life Category Quality Check\n');
  console.log('='.repeat(80));

  // Step 1: Read JSON source data
  console.log('\n📁 Step 1: Reading JSON source data...');
  const jsonPath = path.join(process.cwd(), '..', 'database', 'sighi-foods-data.json');
  const jsonData: SourceData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  console.log(`   Total foods in JSON: ${jsonData.foods.length}`);

  // Step 2: Extract unique categories from JSON
  console.log('\n📋 Step 2: Extracting unique categories from JSON...');
  const jsonCategories = new Set<string>();
  jsonData.foods.forEach(food => {
    jsonCategories.add(food.category);
  });

  const sortedJsonCategories = Array.from(jsonCategories).sort();
  console.log(`   Unique categories in JSON: ${sortedJsonCategories.length}`);
  console.log('\n   Categories in JSON:');
  sortedJsonCategories.forEach((cat, idx) => {
    const count = jsonData.foods.filter(f => f.category === cat).length;
    console.log(`   ${(idx + 1).toString().padStart(2)}. ${cat.padEnd(40)} (${count} foods)`);
  });

  // Step 3: Query database for categories
  console.log('\n\n🔍 Step 3: Querying database for categories...');
  const dbFoods = await db.select({
    id: foods.id,
    name_no: foods.name_no,
    name_en: foods.name_en,
    category: foods.category
  }).from(foods);

  console.log(`   Total foods in database: ${dbFoods.length}`);

  const dbCategories = new Set<string>();
  dbFoods.forEach(food => {
    dbCategories.add(food.category);
  });

  const sortedDbCategories = Array.from(dbCategories).sort();
  console.log(`   Unique categories in database: ${sortedDbCategories.length}`);
  console.log('\n   Categories in database:');
  sortedDbCategories.forEach((cat, idx) => {
    const count = dbFoods.filter(f => f.category === cat).length;
    console.log(`   ${(idx + 1).toString().padStart(2)}. ${cat.padEnd(40)} (${count} foods)`);
  });

  // Step 4: Identify "Ukjent kategori" foods
  console.log('\n\n⚠️  Step 4: Identifying foods with "Ukjent kategori"...');
  const unknownCategoryFoods = dbFoods.filter(f => f.category === 'Ukjent kategori');
  console.log(`   Foods with "Ukjent kategori": ${unknownCategoryFoods.length}`);

  if (unknownCategoryFoods.length > 0) {
    console.log('\n   List of foods with "Ukjent kategori":');
    unknownCategoryFoods.forEach((food, idx) => {
      console.log(`   ${(idx + 1).toString().padStart(3)}. ID:${food.id.toString().padStart(4)} - ${food.name_en} (${food.name_no})`);
    });
  }

  // Step 5: Cross-reference with JSON to find correct categories
  console.log('\n\n🔄 Step 5: Cross-referencing with JSON source data...');

  interface CategoryFix {
    dbId: number;
    dbNameNo: string;
    dbNameEn: string;
    currentCategory: string;
    correctCategory: string;
    jsonId: number;
  }

  const categoryFixes: CategoryFix[] = [];

  for (const dbFood of unknownCategoryFoods) {
    // Match by name (IDs may have changed between versions)
    const jsonFood = jsonData.foods.find(f =>
      f.name_en.toLowerCase() === dbFood.name_en.toLowerCase() ||
      f.name_no.toLowerCase() === dbFood.name_no.toLowerCase()
    );

    if (jsonFood && jsonFood.category !== 'Ukjent kategori') {
      categoryFixes.push({
        dbId: dbFood.id,
        dbNameNo: dbFood.name_no,
        dbNameEn: dbFood.name_en,
        currentCategory: dbFood.category,
        correctCategory: jsonFood.category,
        jsonId: jsonFood.id
      });
    }
  }

  console.log(`   Foods that can be fixed: ${categoryFixes.length}`);

  if (categoryFixes.length > 0) {
    console.log('\n   Foods to fix:');
    categoryFixes.forEach((fix, idx) => {
      console.log(`   ${(idx + 1).toString().padStart(3)}. ID:${fix.dbId.toString().padStart(4)} - ${fix.dbNameEn}`);
      console.log(`        Current: "${fix.currentCategory}" → Correct: "${fix.correctCategory}"`);
    });
  }

  // Step 6: Check for category mismatches (foods with wrong categories)
  console.log('\n\n🔎 Step 6: Checking for category mismatches...');

  const categoryMismatches: CategoryFix[] = [];

  for (const dbFood of dbFoods) {
    if (dbFood.category === 'Ukjent kategori') continue; // Already handled

    // Match by name (IDs may have changed between versions)
    const jsonFood = jsonData.foods.find(f =>
      f.name_en.toLowerCase() === dbFood.name_en.toLowerCase() ||
      f.name_no.toLowerCase() === dbFood.name_no.toLowerCase()
    );

    if (jsonFood && jsonFood.category !== dbFood.category) {
      categoryMismatches.push({
        dbId: dbFood.id,
        dbNameNo: dbFood.name_no,
        dbNameEn: dbFood.name_en,
        currentCategory: dbFood.category,
        correctCategory: jsonFood.category,
        jsonId: jsonFood.id
      });
    }
  }

  console.log(`   Foods with mismatched categories: ${categoryMismatches.length}`);

  if (categoryMismatches.length > 0) {
    console.log('\n   Category mismatches:');
    categoryMismatches.forEach((fix, idx) => {
      console.log(`   ${(idx + 1).toString().padStart(3)}. ID:${fix.dbId.toString().padStart(4)} - ${fix.dbNameEn}`);
      console.log(`        Current: "${fix.currentCategory}" → Correct: "${fix.correctCategory}"`);
    });
  }

  // Step 7: Summary
  console.log('\n\n📈 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total foods in JSON:                    ${jsonData.foods.length}`);
  console.log(`Total foods in database:                ${dbFoods.length}`);
  console.log(`Unique categories in JSON:              ${sortedJsonCategories.length}`);
  console.log(`Unique categories in database:          ${sortedDbCategories.length}`);
  console.log(`Foods with "Ukjent kategori":           ${unknownCategoryFoods.length}`);
  console.log(`Foods with fixable unknown category:    ${categoryFixes.length}`);
  console.log(`Foods with mismatched category:         ${categoryMismatches.length}`);
  console.log(`Total fixes needed:                     ${categoryFixes.length + categoryMismatches.length}`);

  // Return data for fix script
  return {
    categoryFixes,
    categoryMismatches,
    unknownCategoryFoods,
    jsonCategories: sortedJsonCategories,
    dbCategories: sortedDbCategories,
    totalFixes: categoryFixes.length + categoryMismatches.length
  };
}

// Run analysis
analyzeCategories()
  .then(async (results) => {
    console.log('\n✅ Analysis complete!');

    // Save results to JSON for the fix script
    const resultsPath = path.join(process.cwd(), 'category-analysis-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to: ${resultsPath}`);

    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error during analysis:', error);
    process.exit(1);
  });
