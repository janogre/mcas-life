import { db } from '../db/index.js';
import { foods } from '../db/schema.js';
import { eq } from 'drizzle-orm';

async function addTriggerTestData() {
  try {
    console.log('Adding test trigger data...');

    // Add histamine and liberator triggers to minced meat
    await db
      .update(foods)
      .set({
        triggers: ['H', 'L'], // Histamine + Liberator
        updated_at: new Date()
      })
      .where(eq(foods.id, 58));

    // Add histamine to cheddar cheese
    await db
      .update(foods)
      .set({
        triggers: ['H'], // Histamine
        updated_at: new Date()
      })
      .where(eq(foods.id, 13));

    // Add various triggers to different foods for testing
    await db
      .update(foods)
      .set({
        triggers: ['H', 'T'], // Histamine + Tyramine
        updated_at: new Date()
      })
      .where(eq(foods.id, 57));

    console.log('✅ Test trigger data added successfully!');
    
    // Verify the changes
    const updatedFoods = await db
      .select({ id: foods.id, name_en: foods.name_en, triggers: foods.triggers })
      .from(foods)
      .where(eq(foods.id, 58))
      .limit(1);

    console.log('Verification:', updatedFoods[0]);

  } catch (error) {
    console.error('❌ Error adding trigger data:', error);
  }
  
  process.exit(0);
}

addTriggerTestData();