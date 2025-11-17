/**
 * Update Categories Script
 * 
 * Updates categories in PostgreSQL database from our corrected JSON file
 */

import * as fs from 'fs';
import * as path from 'path';
import { db } from '../db/connection.js';

// Path to our corrected JSON file
const UPDATED_JSON_PATH = path.join(process.cwd(), '..', 'database', 'sighi-foods-data.json');

console.log('🔧 MCAS-Life Category Update Script');
console.log('====================================\n');

async function updateCategories() {
  try {
    console.log(`📂 Reading updated data from: ${UPDATED_JSON_PATH}`);
    
    const rawData = fs.readFileSync(UPDATED_JSON_PATH, 'utf-8');
    const jsonData = JSON.parse(rawData);
    const foods = jsonData.foods;
    
    console.log(`✅ Loaded ${foods.length} foods from JSON`);
    
    let updatedCount = 0;
    
    // Update categories in batches using Drizzle
    const { foods: foodsTable } = await import('../db/schema.js');
    const { eq, and } = await import('drizzle-orm');
    
    for (const food of foods) {
      if (food.category && food.category !== 'Ukjent kategori') {
        try {
          const result = await db
            .update(foodsTable)
            .set({ 
              category: food.category, 
              triggers: food.triggers 
            })
            .where(and(
              eq(foodsTable.name_no, food.name_no),
              eq(foodsTable.name_en, food.name_en)
            ));
          
          updatedCount++;
          console.log(`✓ Updated: ${food.name_no} → ${food.category}`);
        } catch (error) {
          console.log(`❌ Error updating ${food.name_no}: ${error.message}`);
        }
      }
    }
    
    console.log(`\n✅ Update completed! ${updatedCount} foods updated.`);
    
    // Test a few updated foods using Drizzle
    console.log('\n🔍 Testing updated foods:');
    const { ne, desc } = await import('drizzle-orm');
    
    const testResults = await db
      .select()
      .from(foodsTable)
      .where(ne(foodsTable.category, 'Ukjent kategori'))
      .orderBy(foodsTable.name_no)
      .limit(5);
    
    testResults.forEach(row => {
      console.log(`  ${row.name_no} (${row.name_en}) - ${row.category} - Triggers: ${JSON.stringify(row.triggers)}`);
    });
    
    // Count categories
    const { count } = await import('drizzle-orm');
    
    const categoryResults = await db
      .select({ 
        category: foodsTable.category, 
        count: count() 
      })
      .from(foodsTable)
      .groupBy(foodsTable.category)
      .orderBy(desc(count()))
      .limit(10);
    
    console.log('\n📊 Top categories in database:');
    categoryResults.forEach(row => {
      console.log(`  ${row.category}: ${row.count} foods`);
    });
    
  } catch (error) {
    console.error('❌ Update failed:', error);
  } finally {
    // Drizzle connection will be handled automatically
    process.exit(0);
  }
}

// Run the update
updateCategories();