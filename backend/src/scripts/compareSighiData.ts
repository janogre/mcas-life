/**
 * Compare SIGHI PDF data with database
 */

import { db } from '../db/index.js';
import { foods } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';

async function compareSighiData() {
  console.log('🔍 Comparing SIGHI data from JSON with database...\n');

  // Get sample foods from database across all compatibility levels
  console.log('📊 Sample foods from database (by compatibility level):\n');

  for (let level = 0; level <= 3; level++) {
    const levelName = level === 0 ? 'Safe (0)' :
                     level === 1 ? 'Medium (1)' :
                     level === 2 ? 'Incompatible (2)' : 'Severe (3)';

    const samples = await db
      .select()
      .from(foods)
      .where(eq(foods.compatibility, String(level) as '0' | '1' | '2' | '3'))
      .limit(5);

    console.log(`${levelName}:`);
    samples.forEach(food => {
      console.log(`  - ${food.name_en} (${food.name_no})`);
      console.log(`    Category: ${food.category}`);
      console.log(`    Triggers: ${JSON.stringify(food.triggers)}`);
      if (food.remarks_en) {
        console.log(`    Remarks: ${food.remarks_en.substring(0, 60)}...`);
      }
      console.log('');
    });
    console.log('');
  }

  // Get statistics
  const stats = await db
    .select({
      compatibility: foods.compatibility,
      count: sql<number>`count(*)::int`
    })
    .from(foods)
    .groupBy(foods.compatibility);

  console.log('📈 Database statistics:');
  console.log(`Total foods: ${stats.reduce((sum, s) => sum + s.count, 0)}`);
  stats.forEach(stat => {
    const levelName = stat.compatibility === '0' ? 'Safe' :
                     stat.compatibility === '1' ? 'Medium' :
                     stat.compatibility === '2' ? 'Incompatible' : 'Severe';
    console.log(`  ${levelName} (${stat.compatibility}): ${stat.count} foods`);
  });

  process.exit(0);
}

compareSighiData();
