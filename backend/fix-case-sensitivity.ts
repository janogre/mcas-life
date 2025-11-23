/**
 * Fix Category Case-Sensitivity Issues
 * Standardizes category names to match JSON source
 */

import { db } from './src/db/connection.js';
import { foods } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

async function fixCaseSensitivity() {
  console.log('🔧 Fixing Category Case-Sensitivity Issues\n');
  console.log('='.repeat(80));

  // Known case-sensitivity issues from JSON analysis
  const caseFixes = [
    { from: 'Sea Food', to: 'Sea food' }
  ];

  console.log('\n📝 Fixes to apply:');
  caseFixes.forEach((fix, idx) => {
    console.log(`   ${idx + 1}. "${fix.from}" → "${fix.to}"`);
  });

  console.log('\n🔍 Checking database for foods with case issues...\n');

  let totalFixed = 0;

  for (const fix of caseFixes) {
    // Check how many foods have this category
    const foodsToFix = await db
      .select()
      .from(foods)
      .where(eq(foods.category, fix.from));

    console.log(`   Found ${foodsToFix.length} foods with category "${fix.from}"`);

    if (foodsToFix.length > 0) {
      // Update all foods with this category
      await db
        .update(foods)
        .set({
          category: fix.to,
          updated_at: new Date()
        })
        .where(eq(foods.category, fix.from));

      console.log(`   ✅ Updated ${foodsToFix.length} foods to "${fix.to}"\n`);
      totalFixed += foodsToFix.length;
    }
  }

  console.log('\n📊 SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total foods updated: ${totalFixed}`);
  console.log('\n✅ Case-sensitivity fixes complete!');
}

// Run fix
fixCaseSensitivity()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error during fix:', error);
    process.exit(1);
  });
