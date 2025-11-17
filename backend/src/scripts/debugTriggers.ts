import { db } from '../db/index.js';
import { foods } from '../db/schema.js';
import { eq } from 'drizzle-orm';

async function debugTriggers() {
  try {
    console.log('🔍 Debugging trigger data...');

    const result = await db.select().from(foods).where(eq(foods.id, 58)).limit(1);
    
    if (result.length > 0) {
      const food = result[0];
      console.log('📊 Food ID 58 data:');
      console.log('  Name EN:', food.name_en);
      console.log('  Raw triggers field:', food.triggers);
      console.log('  Triggers type:', typeof food.triggers);
      console.log('  Triggers JSON:', JSON.stringify(food.triggers));
      
      // Test parsing
      let parsed;
      try {
        parsed = JSON.parse(food.triggers as any);
        console.log('  Parsed triggers:', parsed);
        console.log('  Parsed type:', typeof parsed);
        console.log('  Is array:', Array.isArray(parsed));
      } catch (e) {
        console.log('  ❌ Parse error:', e.message);
      }
    } else {
      console.log('❌ No food found with ID 58');
    }
    
    // Also check food 13 and 57
    const foods13_57 = await db.select().from(foods).where(eq(foods.id, 13)).orWhere(eq(foods.id, 57));
    console.log('\n📊 Other test foods:');
    for (const f of foods13_57) {
      console.log(`  Food ${f.id} (${f.name_en}): triggers = ${JSON.stringify(f.triggers)}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

debugTriggers();