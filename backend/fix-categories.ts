/**
 * Category Fix Script
 * Updates database with correct categories from JSON source
 */

import fs from 'fs';
import path from 'path';
import { db } from './src/db/connection.js';
import { foods } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

interface CategoryFix {
  dbId: number;
  dbNameNo: string;
  dbNameEn: string;
  currentCategory: string;
  correctCategory: string;
  jsonId: number;
}

interface AnalysisResults {
  categoryFixes: CategoryFix[];
  categoryMismatches: CategoryFix[];
  totalFixes: number;
}

async function fixCategories() {
  console.log('🔧 MCAS-Life Category Fix Script\n');
  console.log('='.repeat(80));

  // Load analysis results
  console.log('\n📁 Loading analysis results...');
  const resultsPath = path.join(process.cwd(), 'category-analysis-results.json');

  if (!fs.existsSync(resultsPath)) {
    console.error('❌ Error: category-analysis-results.json not found!');
    console.error('   Please run analyze-categories.ts first.');
    process.exit(1);
  }

  const results: AnalysisResults = JSON.parse(fs.readFileSync(resultsPath, 'utf-8'));

  const allFixes = [...results.categoryFixes, ...results.categoryMismatches];

  console.log(`   Total fixes to apply: ${allFixes.length}`);

  if (allFixes.length === 0) {
    console.log('\n✅ No fixes needed! All categories are correct.');
    process.exit(0);
  }

  // Confirm before proceeding
  console.log('\n⚠️  WARNING: This will update the database with correct categories.');
  console.log('\n   Fixes to apply:');

  allFixes.forEach((fix, idx) => {
    console.log(`   ${(idx + 1).toString().padStart(3)}. ID:${fix.dbId.toString().padStart(4)} - ${fix.dbNameEn}`);
    console.log(`        "${fix.currentCategory}" → "${fix.correctCategory}"`);
  });

  console.log('\n📝 Starting database updates...\n');

  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ fix: CategoryFix; error: string }> = [];

  for (const fix of allFixes) {
    try {
      await db
        .update(foods)
        .set({
          category: fix.correctCategory,
          updated_at: new Date()
        })
        .where(eq(foods.id, fix.dbId));

      successCount++;
      console.log(`   ✅ ID:${fix.dbId.toString().padStart(4)} - Updated to "${fix.correctCategory}"`);
    } catch (error) {
      errorCount++;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      errors.push({ fix, error: errorMsg });
      console.error(`   ❌ ID:${fix.dbId.toString().padStart(4)} - Error: ${errorMsg}`);
    }
  }

  // Summary
  console.log('\n\n📊 FIX SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total fixes attempted:     ${allFixes.length}`);
  console.log(`Successfully updated:      ${successCount}`);
  console.log(`Errors:                    ${errorCount}`);

  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    errors.forEach((err, idx) => {
      console.log(`   ${idx + 1}. ID:${err.fix.dbId} - ${err.error}`);
    });
  }

  // Verify updates
  console.log('\n\n🔍 Verifying updates...');
  const unknownCount = await db
    .select()
    .from(foods)
    .where(eq(foods.category, 'Ukjent kategori'));

  console.log(`   Remaining "Ukjent kategori" foods: ${unknownCount.length}`);

  if (unknownCount.length > 0) {
    console.log('\n   Still unknown:');
    unknownCount.forEach((food, idx) => {
      console.log(`   ${(idx + 1).toString().padStart(3)}. ID:${food.id.toString().padStart(4)} - ${food.name_en} (${food.name_no})`);
    });
  }

  console.log('\n✅ Category fix complete!');
}

// Run fix
fixCategories()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error during fix:', error);
    process.exit(1);
  });
