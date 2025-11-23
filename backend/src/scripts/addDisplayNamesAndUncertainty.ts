/**
 * Add Display Names and Uncertainty Level Script
 *
 * Adds new columns to foods table and populates them:
 * - display_name_en: Clean English name without "?" prefix
 * - display_name_no: Clean Norwegian name without "?" prefix
 * - sighi_uncertainty_level: Count of "?" symbols (0-3)
 */

import { db } from '../db/connection.js';
import { foods } from '../db/schema.js';
import { sql } from 'drizzle-orm';

console.log('🔧 Adding Display Names and Uncertainty Level to Foods Table');
console.log('=============================================================\n');

async function addDisplayNamesAndUncertainty() {
  try {
    // Step 1: Add columns to database
    console.log('📋 Step 1: Adding new columns to foods table...');

    await db.execute(sql`
      ALTER TABLE foods
      ADD COLUMN IF NOT EXISTS display_name_en VARCHAR(255),
      ADD COLUMN IF NOT EXISTS display_name_no VARCHAR(255),
      ADD COLUMN IF NOT EXISTS sighi_uncertainty_level INTEGER NOT NULL DEFAULT 0;
    `);

    console.log('✅ Columns added successfully!\n');

    // Step 2: Populate display names and uncertainty levels
    console.log('📋 Step 2: Populating display names and uncertainty levels...');

    // Get all foods
    const allFoods = await db.select().from(foods);
    console.log(`Found ${allFoods.length} foods in database\n`);

    let updated = 0;
    let withUncertainty = 0;

    for (const food of allFoods) {
      // Count "?" at the start of names
      const questionMarkMatchEn = food.name_en.match(/^(\?+)\s*/);
      const questionMarkMatchNo = food.name_no.match(/^(\?+)\s*/);

      // Calculate uncertainty level (max of both languages)
      const uncertaintyLevelEn = questionMarkMatchEn ? questionMarkMatchEn[1].length : 0;
      const uncertaintyLevelNo = questionMarkMatchNo ? questionMarkMatchNo[1].length : 0;
      const uncertaintyLevel = Math.max(uncertaintyLevelEn, uncertaintyLevelNo);

      // Remove "?" prefix and trim for display names
      const displayNameEn = food.name_en.replace(/^\?+\s*/, '').trim();
      const displayNameNo = food.name_no.replace(/^\?+\s*/, '').trim();

      // Update the food record
      await db.update(foods)
        .set({
          display_name_en: displayNameEn,
          display_name_no: displayNameNo,
          sighi_uncertainty_level: uncertaintyLevel,
        })
        .where(sql`${foods.id} = ${food.id}`);

      updated++;

      if (uncertaintyLevel > 0) {
        withUncertainty++;
        console.log(`  ✨ ${food.name_en} → ${displayNameEn} (uncertainty: ${'?'.repeat(uncertaintyLevel)})`);
      }

      // Progress indicator for large datasets
      if (updated % 100 === 0) {
        console.log(`  ... processed ${updated}/${allFoods.length} foods`);
      }
    }

    console.log(`\n✅ Updated ${updated} foods!`);
    console.log(`📊 ${withUncertainty} foods have SIGHI uncertainty notation\n`);

    // Step 3: Verify the results
    console.log('📋 Step 3: Verifying results...\n');

    // Count by uncertainty level using proper Drizzle query
    const uncertaintyStats = await db
      .select({
        level: foods.sighi_uncertainty_level,
        count: sql<number>`count(*)::int`
      })
      .from(foods)
      .groupBy(foods.sighi_uncertainty_level)
      .orderBy(foods.sighi_uncertainty_level);

    console.log('Uncertainty level distribution:');
    for (const row of uncertaintyStats) {
      const level = row.level;
      const count = row.count;
      const label = level === 0 ? 'Certain' : `${'?'.repeat(level)} (${level})`;
      console.log(`  ${label}: ${count} foods`);
    }

    // Show some examples
    console.log('\nExample foods with uncertainty:');
    const examples = await db
      .select({
        name_en: foods.name_en,
        display_name_en: foods.display_name_en,
        sighi_uncertainty_level: foods.sighi_uncertainty_level
      })
      .from(foods)
      .where(sql`${foods.sighi_uncertainty_level} > 0`)
      .orderBy(sql`${foods.sighi_uncertainty_level} DESC, ${foods.name_en}`)
      .limit(10);

    for (const row of examples) {
      const level = row.sighi_uncertainty_level;
      console.log(`  ${'?'.repeat(level)} ${row.name_en} → "${row.display_name_en}"`);
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('The foods table now has display names and uncertainty levels.');

    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
addDisplayNamesAndUncertainty();
