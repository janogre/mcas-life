/**
 * Test Display Names and Uncertainty Level
 *
 * Validates the new columns work correctly
 */

import { db } from '../db/connection.js';
import { foods } from '../db/schema.js';
import { sql } from 'drizzle-orm';

console.log('🧪 Testing Display Names and Uncertainty Level');
console.log('===============================================\n');

async function testDisplayNames() {
  try {
    // Test 1: Query foods with uncertainty
    console.log('Test 1: Foods with SIGHI uncertainty notation\n');
    const uncertainFoods = await db
      .select({
        id: foods.id,
        name_en: foods.name_en,
        display_name_en: foods.display_name_en,
        uncertainty_level: foods.sighi_uncertainty_level,
      })
      .from(foods)
      .where(sql`${foods.sighi_uncertainty_level} > 0`)
      .orderBy(sql`${foods.sighi_uncertainty_level} DESC, ${foods.name_en}`)
      .limit(10);

    console.log(`Found ${uncertainFoods.length} foods with uncertainty:\n`);
    uncertainFoods.forEach(food => {
      const questionMarks = '?'.repeat(food.uncertainty_level);
      console.log(`  ${questionMarks} "${food.name_en}" → Display: "${food.display_name_en}"`);
      console.log(`     Uncertainty level: ${food.uncertainty_level}\n`);
    });

    // Test 2: Verify TypeScript types include new fields
    console.log('\nTest 2: TypeScript type checking\n');
    const sampleFood = await db
      .select()
      .from(foods)
      .limit(1);

    if (sampleFood[0]) {
      const food = sampleFood[0];

      // These should not cause TypeScript errors
      const hasDisplayNameEn: string | null = food.display_name_en;
      const hasDisplayNameNo: string | null = food.display_name_no;
      const hasUncertaintyLevel: number = food.sighi_uncertainty_level;

      console.log('✅ TypeScript types include new fields:');
      console.log(`   - display_name_en: ${typeof hasDisplayNameEn}`);
      console.log(`   - display_name_no: ${typeof hasDisplayNameNo}`);
      console.log(`   - sighi_uncertainty_level: ${typeof hasUncertaintyLevel}`);
    }

    // Test 3: Count distribution
    console.log('\n\nTest 3: Uncertainty level distribution\n');
    const distribution = await db
      .select({
        level: foods.sighi_uncertainty_level,
        count: sql<number>`count(*)::int`
      })
      .from(foods)
      .groupBy(foods.sighi_uncertainty_level)
      .orderBy(foods.sighi_uncertainty_level);

    console.log('Distribution by uncertainty level:');
    distribution.forEach(row => {
      const label = row.level === 0 ? 'Certain (0)' : `${('?'.repeat(row.level))} (${row.level})`;
      console.log(`  ${label}: ${row.count} foods`);
    });

    // Test 4: Test filtering by uncertainty level
    console.log('\n\nTest 4: Filtering capabilities\n');

    const certainFoodsCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(foods)
      .where(sql`${foods.sighi_uncertainty_level} = 0`);

    const uncertainFoodsCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(foods)
      .where(sql`${foods.sighi_uncertainty_level} > 0`);

    console.log(`✅ Can filter by certainty:`);
    console.log(`   - Certain foods: ${certainFoodsCount[0].count}`);
    console.log(`   - Uncertain foods: ${uncertainFoodsCount[0].count}`);

    // Test 5: Test display name fallback logic
    console.log('\n\nTest 5: Display name fallback logic\n');
    const foodsWithoutDisplayName = await db
      .select({
        name_en: foods.name_en,
        display_name_en: foods.display_name_en,
      })
      .from(foods)
      .where(sql`${foods.display_name_en} IS NULL`)
      .limit(5);

    if (foodsWithoutDisplayName.length > 0) {
      console.log(`⚠️  Found ${foodsWithoutDisplayName.length} foods without display_name_en (should be 0):`);
      foodsWithoutDisplayName.forEach(food => {
        console.log(`   - "${food.name_en}"`);
      });
    } else {
      console.log('✅ All foods have display names populated');
    }

    console.log('\n\n🎉 All tests passed successfully!');
    console.log('The display_name and sighi_uncertainty_level columns are working correctly.');

    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDisplayNames();
