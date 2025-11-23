/**
 * Category helpers for food categorization and meal-specific recommendations
 */

export interface CategoryInfo {
  name: string;
  emoji: string;
  keywords: string[]; // For matching SIGHI category strings
}

/**
 * Comprehensive category mapping with emojis and keywords
 */
export const FOOD_CATEGORIES: Record<string, CategoryInfo> = {
  meat: {
    name: 'Kjøtt',
    emoji: '🥩',
    keywords: ['meat', 'beef', 'pork', 'lamb', 'kjøtt', 'storfe', 'svin', 'lam']
  },
  poultry: {
    name: 'Fjærfe',
    emoji: '🍗',
    keywords: ['poultry', 'chicken', 'turkey', 'duck', 'kylling', 'kalkun', 'and']
  },
  fish: {
    name: 'Fisk',
    emoji: '🐟',
    keywords: ['fish', 'seafood', 'salmon', 'cod', 'fisk', 'laks', 'torsk']
  },
  vegetables: {
    name: 'Grønnsaker',
    emoji: '🥕',
    keywords: ['vegetable', 'veggie', 'grønnsaker', 'grønt']
  },
  fruits: {
    name: 'Frukt & Bær',
    emoji: '🍎',
    keywords: ['fruit', 'berry', 'berries', 'frukt', 'bær', 'eple', 'pære']
  },
  grains: {
    name: 'Korn & Stivelse',
    emoji: '🌾',
    keywords: ['grain', 'cereal', 'rice', 'pasta', 'bread', 'korn', 'ris', 'pasta', 'brød']
  },
  dairy: {
    name: 'Meieri',
    emoji: '🥛',
    keywords: ['dairy', 'milk', 'cheese', 'yogurt', 'meieri', 'melk', 'ost', 'yoghurt']
  },
  eggs: {
    name: 'Egg',
    emoji: '🥚',
    keywords: ['egg', 'eggs']
  },
  nuts: {
    name: 'Nøtter & Frø',
    emoji: '🥜',
    keywords: ['nut', 'nuts', 'seed', 'seeds', 'nøtter', 'frø', 'mandel', 'valnøtt']
  },
  legumes: {
    name: 'Belgfrukter',
    emoji: '🫘',
    keywords: ['legume', 'bean', 'beans', 'lentil', 'pea', 'belgfrukt', 'bønner', 'linser', 'erter']
  },
  oils: {
    name: 'Oljer & Fett',
    emoji: '🫒',
    keywords: ['oil', 'fat', 'butter', 'olje', 'fett', 'smør']
  },
  spices: {
    name: 'Krydder',
    emoji: '🌶️',
    keywords: ['spice', 'herb', 'seasoning', 'krydder', 'urter']
  },
  beverages: {
    name: 'Drikke',
    emoji: '☕',
    keywords: ['beverage', 'drink', 'tea', 'coffee', 'juice', 'drikke', 'te', 'kaffe', 'juice']
  },
  sweets: {
    name: 'Søtsaker',
    emoji: '🍰',
    keywords: ['sweet', 'dessert', 'sugar', 'candy', 'søt', 'dessert', 'sukker', 'godteri']
  },
  condiments: {
    name: 'Tilbehør',
    emoji: '🧂',
    keywords: ['condiment', 'sauce', 'dressing', 'saus', 'dressing']
  },
  other: {
    name: 'Annet',
    emoji: '🍽️',
    keywords: ['other', 'misc', 'annet']
  }
};

/**
 * Recommended categories for each meal type
 */
export const MEAL_TYPE_RECOMMENDATIONS: Record<string, string[]> = {
  breakfast: ['grains', 'dairy', 'eggs', 'fruits', 'beverages', 'nuts'],
  lunch: ['meat', 'poultry', 'fish', 'vegetables', 'grains', 'legumes', 'oils'],
  dinner: ['meat', 'poultry', 'fish', 'vegetables', 'grains', 'oils', 'condiments'],
  evening: ['grains', 'dairy', 'fruits', 'beverages', 'nuts'],
  snack: ['fruits', 'nuts', 'dairy', 'vegetables', 'sweets']
};

/**
 * Maps a SIGHI category string to our standardized category key
 */
export function mapSighiCategory(sighiCategory: string): string {
  if (!sighiCategory) return 'other';

  const categoryLower = sighiCategory.toLowerCase();

  // Find matching category by keywords
  for (const [key, info] of Object.entries(FOOD_CATEGORIES)) {
    if (info.keywords.some(keyword => categoryLower.includes(keyword))) {
      return key;
    }
  }

  return 'other';
}

/**
 * Gets category info for a SIGHI category string
 */
export function getCategoryInfo(sighiCategory: string): CategoryInfo {
  const categoryKey = mapSighiCategory(sighiCategory);
  return FOOD_CATEGORIES[categoryKey] || FOOD_CATEGORIES.other;
}

/**
 * Sorts categories with recommended ones first
 */
export function sortCategoriesByRelevance(
  categories: string[],
  mealType: string
): string[] {
  const recommended = MEAL_TYPE_RECOMMENDATIONS[mealType] || [];

  const recommendedCategories = categories.filter(cat => recommended.includes(cat));
  const otherCategories = categories.filter(cat => !recommended.includes(cat));

  return [
    ...recommendedCategories.sort(),
    ...otherCategories.sort()
  ];
}

/**
 * Extracts unique category keys from approved foods
 */
export function getUniqueCategoriesFromFoods(foods: Array<{ food?: { category?: string } }>): string[] {
  const categoryKeys = new Set<string>();

  foods.forEach(food => {
    if (food.food?.category) {
      const categoryKey = mapSighiCategory(food.food.category);
      categoryKeys.add(categoryKey);
    }
  });

  return Array.from(categoryKeys).sort();
}

/**
 * Checks if a food belongs to a category
 */
export function foodMatchesCategory(
  food: { category?: string },
  categoryKey: string
): boolean {
  if (!food.category) return categoryKey === 'other';
  return mapSighiCategory(food.category) === categoryKey;
}
