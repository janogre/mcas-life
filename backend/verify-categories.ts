/**
 * Verify Category Distribution in Database
 * Shows final state after fixes
 */

import { db } from './src/db/connection.js';
import { sql } from 'drizzle-orm';

async function verifyCategories() {
  console.log('✅ MCAS-Life Database - Final Category Distribution\n');
  console.log('='.repeat(80));

  // Get category counts
  const categoryCounts = await db.execute(
    sql`
      SELECT
        category,
        COUNT(*) as food_count
      FROM foods
      GROUP BY category
      ORDER BY category
    `
  );

  console.log('\n📊 Foods per Category:\n');

  let total = 0;
  categoryCounts.forEach((row: any, idx: number) => {
    const count = Number(row.food_count || row.foodCount || 0);
    total += count;
    const category = row.category || '';
    console.log(`   ${(idx + 1).toString().padStart(2)}. ${category.padEnd(60)} ${count.toString().padStart(4)} foods`);
  });

  console.log('\n' + '='.repeat(80));
  console.log(`   ${'TOTAL'.padEnd(60)} ${total.toString().padStart(4)} foods`);
  console.log('='.repeat(80));

  // Count of Ukjent kategori
  const unknownCount = categoryCounts.find((row: any) => row.category === 'Ukjent kategori');
  const unknownNum = unknownCount ? Number(unknownCount.food_count || unknownCount.foodCount || 0) : 0;

  console.log(`\n⚠️  Foods still with "Ukjent kategori": ${unknownNum}`);
  console.log(`✅ Foods with proper categories: ${total - unknownNum} (${((total - unknownNum) / total * 100).toFixed(1)}%)`);

  console.log('\n📈 Statistics:');
  console.log(`   - Total unique categories: ${categoryCounts.length}`);
  console.log(`   - Total foods in database: ${total}`);
  console.log(`   - Average foods per category: ${(total / categoryCounts.length).toFixed(1)}`);

  // Show categories with most foods
  const sortedByCount = [...categoryCounts].sort((a: any, b: any) => {
    const countA = Number(a.food_count || a.foodCount || 0);
    const countB = Number(b.food_count || b.foodCount || 0);
    return countB - countA;
  });

  console.log('\n🔝 Top 10 Categories by Food Count:\n');
  sortedByCount.slice(0, 10).forEach((row: any, idx: number) => {
    const count = Number(row.food_count || row.foodCount || 0);
    const category = row.category || '';
    console.log(`   ${(idx + 1).toString().padStart(2)}. ${category.padEnd(50)} ${count.toString().padStart(4)} foods`);
  });

  console.log('\n✅ Verification complete!');
}

// Run verification
verifyCategories()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error during verification:', error);
    process.exit(1);
  });
