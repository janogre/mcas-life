/**
 * SIGHI Food Database - Fix remaining categories
 * 
 * Retter de gjenværende "Ukjent kategori" matvarene manuelt
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tilleggsmapping for gjenværende matvarer
const ADDITIONAL_MAPPINGS = {
  // Dairy products
  'Dairy products': [
    'camembert', 'ghee', 'clarified butter'
  ],
  
  // Fish (smoked fish)
  'Fish': [
    'salmon', 'smoked salmon', 'salmon smoked'
  ],
  
  // Fats and oils
  'Fats and oils': [
    'lard', 'svinefedt'
  ],
  
  // Meat
  'Meat': [
    'liver', 'lever', 'kidney', 'nyre'
  ],
  
  // Vegetables
  'Vegetables': [
    'jerusalem artichoke', 'jordskokk', 'sweet pepper', 'paprika',
    'capsicum', 'bell pepper', 'green pepper', 'red pepper'
  ],
  
  // Herbs
  'Herbs': [
    'bay leaf', 'laurbærblad', 'bay leaves'
  ],
  
  // Spices, seasoning, aroma
  'Spices, seasoning, aroma': [
    'wasabi', 'horseradish sauce', 'pepperrot saus',
    'miso', 'tamari', 'fish sauce', 'fisksaus'
  ],
  
  // Sweeteners
  'Sweeteners': [
    'corn syrup', 'maissirup', 'high fructose corn syrup'
  ],
  
  // Beverages
  'Beverages': [
    'kvass', 'kombucha'
  ],
  
  // Food additives
  'Food additives': [
    'monosodium glutamate', 'msg', 'natriumglutamat'
  ]
};

/**
 * Finner kategori basert på tilleggsmappingen
 */
function findAdditionalCategory(foodNameEn, foodNameNo) {
  const searchText = (foodNameEn + ' ' + foodNameNo).toLowerCase();
  
  for (const [category, keywords] of Object.entries(ADDITIONAL_MAPPINGS)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }
  
  return null;
}

/**
 * Hovedfunksjon som fikser de gjenværende kategoriene
 */
function fixRemainingCategories() {
  console.log('🔧 Starter retting av gjenværende kategorier...');
  
  const jsonPath = path.join(__dirname, 'sighi-foods-data.json');
  
  // Les eksisterende data
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  
  let fixedCount = 0;
  const remainingItems = [];
  
  // Gå gjennom alle matvarer med "Ukjent kategori"
  data.foods.forEach(food => {
    if (food.category === 'Ukjent kategori') {
      const correctCategory = findAdditionalCategory(food.name_en, food.name_no);
      
      if (correctCategory) {
        food.category = correctCategory;
        fixedCount++;
        console.log(`✓ ${food.name_en} → ${correctCategory}`);
      } else {
        remainingItems.push({
          id: food.id,
          name_en: food.name_en,
          name_no: food.name_no,
          compatibility: food.compatibility,
          triggers: food.triggers
        });
      }
    }
  });
  
  // Lagre oppdaterte data
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  
  console.log(`\n✅ Ferdig! ${fixedCount} ytterligere matvarer fikk korrigerte kategorier.`);
  
  if (remainingItems.length > 0) {
    console.log(`\n⚠️  ${remainingItems.length} matvarer trenger fortsatt manuell kategorisering:`);
    remainingItems.forEach(item => {
      console.log(`  ID ${item.id}: "${item.name_en}" / "${item.name_no}" (comp: ${item.compatibility}, triggers: [${item.triggers.join(', ')}])`);
    });
    
    // Lagre liste over gjenværende til fil for videre arbeid
    fs.writeFileSync(
      path.join(__dirname, 'remaining-uncategorized.json'),
      JSON.stringify(remainingItems, null, 2)
    );
    console.log('\n📝 Liste over gjenværende matvarer lagret til: remaining-uncategorized.json');
  }
}

// Kjør scriptet
fixRemainingCategories();

export { fixRemainingCategories };