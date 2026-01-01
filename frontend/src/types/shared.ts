// Simplified shared types for frontend
// In a real implementation, this would import from @mcas-life/shared package

export type SighiTrigger = 
  | 'H!' // Highly perishable - rapid histamine formation
  | 'H'  // Histamine content
  | 'L'  // Histamine liberator  
  | 'A'  // DAO enzyme inhibitor (Alcohol, etc.)
  | 'B'  // Biogenic amines
  | 'S'  // Salicylates
  | 'T'  // Tyramine
  | 'P'  // Phenylethylamine
  | 'N'  // Noradrenaline/Norepinephrine
  | 'D'  // Dopamine
  | 'C'; // Choline

// Norwegian trigger names for UI display
export const SIGHI_TRIGGER_NAMES_NO: Record<SighiTrigger, string> = {
  'H!': 'Lett bedervelig',
  H: 'Histamin',
  L: 'Histaminliberator', 
  A: 'Andre aminer',
  B: 'Biogene aminer',
  S: 'Salicylater',
  T: 'Tyramin',
  P: 'Fenoliske forbindelser',
  N: 'Naturlige forbindelser',
  D: 'Fordøyelsesirritanter',
  C: 'Kryssreaktive allergener'
};

// Trigger categories with colors for UI
export const TRIGGER_DISPLAY: Record<SighiTrigger, { 
  name: string; 
  color: string; 
  bgColor: string;
  description: string;
}> = {
  'H!': { 
    name: 'Lett bedervelig', 
    color: 'text-red-800', 
    bgColor: 'bg-red-200',
    description: 'Lett bedervelig - rask histamindannelse'
  },
  H: { 
    name: 'Histamin', 
    color: 'text-red-700', 
    bgColor: 'bg-red-100',
    description: 'Inneholder histamin som kan utløse MCAS-symptomer'
  },
  L: { 
    name: 'Histaminliberator', 
    color: 'text-orange-700', 
    bgColor: 'bg-orange-100',
    description: 'Kan frigjøre histamin fra kroppens mastceller'
  },
  A: { 
    name: 'Andre aminer', 
    color: 'text-purple-700', 
    bgColor: 'bg-purple-100',
    description: 'Inneholder andre biogene aminer som kan være problematiske'
  },
  B: { 
    name: 'Biogene aminer', 
    color: 'text-pink-700', 
    bgColor: 'bg-pink-100',
    description: 'Inneholder biogene aminer som tyramin, phenylethylamin osv.'
  },
  S: { 
    name: 'Salicylater', 
    color: 'text-yellow-700', 
    bgColor: 'bg-yellow-100',
    description: 'Inneholder salicylater som kan forverre symptomer'
  },
  T: { 
    name: 'Tyramin', 
    color: 'text-indigo-700', 
    bgColor: 'bg-indigo-100',
    description: 'Høyt tyramininnhold'
  },
  P: { 
    name: 'Fenoliske forbindelser', 
    color: 'text-green-700', 
    bgColor: 'bg-green-100',
    description: 'Inneholder fenoliske forbindelser'
  },
  N: { 
    name: 'Naturlige forbindelser', 
    color: 'text-blue-700', 
    bgColor: 'bg-blue-100',
    description: 'Inneholder naturlige forbindelser som kan være triggere'
  },
  D: { 
    name: 'Fordøyelsesirritanter', 
    color: 'text-red-600', 
    bgColor: 'bg-red-50',
    description: 'Kan irritere fordøyelsessystemet'
  },
  C: { 
    name: 'Kryssreaktive allergener', 
    color: 'text-gray-700', 
    bgColor: 'bg-gray-100',
    description: 'Kan forårsake kryssreaktive allergiske reaksjoner'
  }
};

export enum FoodCompatibility {
  SAFE = 0,           // Well tolerated, no symptoms expected at usual intake
  MEDIUM = 1,         // Moderately compatible, minor symptoms, occasional consumption of small quantities often tolerated
  INCOMPATIBLE = 2,   // Incompatible, significant symptoms at usual intake
  SEVERE = 3          // Very poorly tolerated, severe symptoms
}

export interface BiogenicAmines {
  histamine: number | null;
  tyramine: number | null;
  phenylethylamine: number | null;
  tryptamine: number | null;
  putrescine: number | null;
  cadaverine: number | null;
  spermidine: number | null;
  spermine: number | null;
  norepinephrine: number | null;
  dopamine: number | null;
}

export interface Food {
  id?: number;
  name_no: string;
  name_en: string;
  category: string;
  compatibility: FoodCompatibility;
  triggers: SighiTrigger[];
  remarks_no: string;
  remarks_en: string;
  biogenic_amines?: BiogenicAmines;
  nutrition_data?: any;
  verified?: boolean;
  source?: 'sighi' | 'community' | 'fooddata' | 'openfoodfacts';

  // Display names without SIGHI uncertainty notation
  display_name_en?: string | null;
  display_name_no?: string | null;
  sighi_uncertainty_level?: number; // 0 = certain, 1 = ?, 2 = ??, 3 = ???

  created_at?: Date;
  updated_at?: Date;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: 'patient' | 'expert' | 'researcher' | 'admin';
  created_at: Date;
  updated_at: Date;
}

export interface SymptomEntry {
  id: number;
  user_id: number;
  category: 'skin' | 'digestive' | 'respiratory' | 'cardiovascular' | 'neurological' | 'musculoskeletal' | 'genitourinary' | 'systemic';
  type: string;
  severity: number;
  duration_minutes: number;
  intensity_change?: 'improving' | 'worsening' | 'stable';
  body_regions?: string[];
  started_at: Date;
  ended_at?: Date;
  suspected_triggers?: string[];
  treatment_taken?: string;
  treatment_effective?: boolean;
  capture_method?: 'quick' | 'detailed' | 'retrospective';
  enrichment_status?: 'minimal' | 'partial' | 'complete';
  notes?: string;
  weather_data?: {
    temperature: number;
    humidity: number;
    pressure: number;
    weather_code: number;
  };
  room_exposures?: Array<{
    room_id: string;
    room_name: string;
    time_spent_minutes?: number;
  }>;
  created_at: Date;
  updated_at: Date;
}

export interface ApprovedFood {
  id: number;
  food_id: number;
  user_id: number;
  personal_tolerance: FoodCompatibility;
  notes: string;
  times_consumed: number;
  avg_reaction_score: number;
  last_consumed: Date;
  created_at: Date;
  updated_at: Date;
}

export interface PersonalFoodRating {
  id: number;
  food_id: number;
  user_id: number;
  personal_rating: FoodCompatibility;
  notes: string;
  created_at: Date;
  updated_at: Date;
}

export interface TriggerAnalysisResult {
  analysis_confidence: number;
  data_quality_score: number;
  total_meals_analyzed?: number;
  analysis_window_start: string;
  analysis_window_end: string;
  likely_food_triggers: Array<{
    food_id: number;
    food_name_no: string;
    food_name_en: string;
    food_name?: string; // Legacy support
    compatibility: number;
    correlation_score: number;
    time_consumed: string;
    time_to_symptom_hours: number;
    confidence_level: 'low' | 'medium' | 'high';
  }>;
  likely_air_quality_triggers?: Array<{
    room_id: string;
    room_name: string;
    time_spent_minutes: number;
    correlation_score: number;
    confidence_level: 'low' | 'medium' | 'high';
    air_quality_metrics: {
      co2?: number;
      voc?: number;
      humidity?: number;
      temperature?: number;
      radon?: number;
      pm25?: number;
    };
    risk_assessment: {
      risk_level: 'low' | 'moderate' | 'high' | 'unknown';
      risk_score: number;
      concerns: string[];
    };
  }>;
  improvement_suggestions: string[];
  created_at: Date;
}

export interface FoodSearchRequest {
  query?: string;
  compatibility_filter?: FoodCompatibility;
  category_filter?: string;
  trigger_filter?: SighiTrigger;
  user_id?: number;
  include_approved?: boolean;
  page?: number;
  limit?: number;
}

export interface FoodSearchResponse {
  foods: Food[];
  approved_foods: ApprovedFood[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  filters_applied: {
    query: string | null;
    compatibility: FoodCompatibility | null;
    category: string | null;
    trigger: SighiTrigger | null;
  };
}

// ==================== RECIPE TYPES ====================

export interface SpoonacularIngredient {
  id: number;
  name: string;
  amount: number;
  unit: string;
  image: string;
  original?: string;
}

export interface SpoonacularRecipe {
  id: number;
  title: string;
  image: string;
  imageType: string;
  usedIngredientCount: number;
  missedIngredientCount: number;
  missedIngredients: SpoonacularIngredient[];
  usedIngredients: SpoonacularIngredient[];
  unusedIngredients: SpoonacularIngredient[];
  likes: number;
}

export interface SpoonacularRecipeDetails extends SpoonacularRecipe {
  readyInMinutes: number;
  servings: number;
  sourceUrl: string;
  summary: string;
  cuisines: string[];
  dishTypes: string[];
  diets: string[];
  instructions: string;
  analyzedInstructions: Array<{
    name: string;
    steps: Array<{
      number: number;
      step: string;
      ingredients: Array<{ id: number; name: string; }>;
      equipment: Array<{ id: number; name: string; }>;
    }>;
  }>;
  extendedIngredients: SpoonacularIngredient[];
}

export type RecipeSafetyLevel = 'safe' | 'caution' | 'risky' | 'unsafe';

export interface McasRecipe extends SpoonacularRecipe {
  mcasScore: number; // 0-100, higher is safer
  safetyLevel: RecipeSafetyLevel;
  triggerWarnings: string[];
  safeIngredients: string[];
  riskyIngredients: string[];
  unknownIngredients: string[];
}

export interface RecipeSearchRequest {
  ingredients: string[];
  number?: number;
  ranking?: 1 | 2;
  ignorePantry?: boolean;
}

export interface RecipeSearchResponse {
  recipes: McasRecipe[];
  totalResults: number;
  searchParams: {
    ingredientsUsed: string[];
    maxRecipes: number;
  };
}

export interface SavedRecipe {
  id: number;
  user_id: number;
  spoonacular_recipe_id: number;
  recipe_data: SpoonacularRecipeDetails;
  mcas_score: number;
  notes: string;
  times_made: number;
  created_at: Date;
  updated_at: Date;
}

// User Recipe Types - Custom user-created recipes
export interface RecipeIngredient {
  food_id: number;
  amount: number;
  unit: 'g' | 'kg' | 'ml' | 'dl' | 'l' | 'stk' | 'ss' | 'ts' | 'kopp';
  custom_name?: string;
  food?: Food; // Populated when fetching recipe with details
}

export interface UserRecipe {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  prep_time_minutes?: number;
  servings: number;
  ingredients: RecipeIngredient[];
  instructions?: string;
  notes?: string;
  calculated_mcas_score: number; // 0-100
  calculated_histamine_load?: number;
  trigger_warnings?: string[];
  safety_level: RecipeSafetyLevel;
  times_made: number;
  last_made_at?: Date;
  is_public: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRecipeInput {
  title: string;
  description?: string;
  prep_time_minutes?: number;
  servings: number;
  ingredients: RecipeIngredient[];
  instructions?: string;
  notes?: string;
}

export interface UpdateRecipeInput {
  title?: string;
  description?: string;
  prep_time_minutes?: number;
  servings?: number;
  ingredients?: RecipeIngredient[];
  instructions?: string;
  notes?: string;
}

export interface PortionIngredient {
  food_id: number;
  amount: number;
  unit: string;
  custom_name?: string;
  food?: Food;
}

export interface RecipePortionCalculation {
  recipe_title: string;
  total_servings: number;
  portions_consumed: number;
  ingredients: PortionIngredient[];
}

export interface LogMealFromRecipeInput {
  recipe_id: number;
  portions_consumed: number; // 0.25 - 20
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'evening';
  meal_time: string; // ISO datetime
  dao_taken_before?: boolean;
  dao_minutes_before?: number;
  notes?: string;
}

// ==================== SHARED RECIPES TYPES ====================

export interface RecipeAuthor {
  id: number;
  first_name: string;
  username?: string;
}

export interface UserRecipeWithAuthor extends UserRecipe {
  author: RecipeAuthor;
  likes_count: number;
  is_liked?: boolean; // Only when current user context exists
}

export interface RecipeExtendedInfo {
  recipe: UserRecipe;
  author: RecipeAuthor;
  likes_count: number;
  is_liked_by_current_user: boolean;
  is_saved_by_current_user: boolean;
}

export interface CommunityRecipesParams {
  sortBy?: 'created_at' | 'mcas_score' | 'likes' | 'times_made';
  order?: 'asc' | 'desc';
  search?: string;
  page?: number;
  limit?: number;
}

export interface CommunityRecipesResponse {
  recipes: UserRecipeWithAuthor[];
  total: number;
  page: number;
  limit: number;
}

export interface UserPublicRecipesResponse {
  recipes: UserRecipe[];
  user: RecipeAuthor;
  total: number;
}