/**
 * MCAS-Life Food Types
 * 
 * Comprehensive type definitions for food data based on SIGHI database
 * and enhanced with advanced nutritional and compatibility tracking.
 * 
 * Compatibility system (SIGHI official scale 0-3):
 * - 0 = Well tolerated, no symptoms expected at usual intake
 * - 1 = Moderately compatible, minor symptoms, occasional consumption of small quantities often tolerated
 * - 2 = Incompatible, significant symptoms at usual intake
 * - 3 = Very poorly tolerated, severe symptoms
 */

// SIGHI trigger types for mast cell activation
export type SighiTrigger = 
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

// Compatibility levels matching SIGHI official system (0-3)
export enum FoodCompatibility {
  SAFE = 0,           // Well tolerated, no symptoms expected at usual intake
  MEDIUM = 1,         // Moderately compatible, minor symptoms, occasional consumption of small quantities often tolerated
  INCOMPATIBLE = 2,   // Incompatible, significant symptoms at usual intake
  SEVERE = 3          // Very poorly tolerated, severe symptoms
}

// Biogenic amines tracked in food (advanced feature)
export interface BiogenicAmines {
  histamine: number | null;        // mg/kg
  tyramine: number | null;         // mg/kg
  phenylethylamine: number | null; // mg/kg
  tryptamine: number | null;       // mg/kg
  putrescine: number | null;       // mg/kg
  cadaverine: number | null;       // mg/kg
  spermidine: number | null;       // mg/kg
  spermine: number | null;         // mg/kg
  norepinephrine: number | null;   // mg/kg
  dopamine: number | null;         // mg/kg
}

// Nutritional data from Fooddata.dk (82+ parameters)
export interface NutritionData {
  // Macronutrients
  calories: number | null;         // kcal/100g
  protein: number | null;          // g/100g
  carbohydrates: number | null;    // g/100g
  fat: number | null;              // g/100g
  fiber: number | null;            // g/100g
  sugar: number | null;            // g/100g
  
  // Vitamins (key ones for MCAS patients)
  vitaminB6: number | null;        // mg/100g (DAO cofactor)
  vitaminC: number | null;         // mg/100g (antihistamine)
  vitaminD: number | null;         // μg/100g (mast cell regulation)
  folate: number | null;           // μg/100g
  
  // Minerals (mast cell relevant)
  magnesium: number | null;        // mg/100g (mast cell stabilizer)
  zinc: number | null;             // mg/100g (DAO cofactor)
  copper: number | null;           // mg/100g (DAO cofactor) 
  calcium: number | null;          // mg/100g
  
  // Additional nutritional parameters can be added as needed
  [key: string]: number | null;
}

// Core food interface based on MCAS-search structure
export interface Food {
  id?: number;
  
  // Basic identification
  name_no: string;                 // Norwegian name
  name_en: string;                 // English name
  category: string;                // Food category
  
  // SIGHI compatibility system  
  compatibility: FoodCompatibility;
  triggers: SighiTrigger[];        // Array of trigger types
  
  // Descriptive information
  remarks_no: string;              // Norwegian remarks/notes
  remarks_en: string;              // English remarks/notes
  
  // Enhanced nutritional data (new features)
  biogenic_amines?: BiogenicAmines;
  nutrition?: NutritionData;
  
  // External API integration
  fooddata_dk_id?: number;         // Fooddata.dk reference
  openfoodfacts_id?: string;       // OpenFoodFacts barcode
  
  // Metadata
  created_at?: Date;
  updated_at?: Date;
  verified: boolean;               // Lab-verified vs estimated data
  source: 'sighi' | 'community' | 'fooddata' | 'openfoodfacts';
}

// Food search and filtering interfaces
export interface FoodSearchParams {
  query?: string;
  category?: string;
  compatibility?: FoodCompatibility[];
  triggers?: SighiTrigger[];
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'compatibility' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface FoodSearchResult {
  foods: Food[];
  total: number;
  hasMore: boolean;
}

// Alias for backward compatibility
export type FoodSearchRequest = FoodSearchParams;
export type FoodSearchResponse = FoodSearchResult;

// Community-approved foods (user-contributed safe foods)
export interface ApprovedFood {
  id: number;
  food_id: number;
  user_id: number;
  
  // Approval details
  personal_tolerance: FoodCompatibility;
  notes: string;
  dosage_notes?: string;           // e.g., "small amounts only"
  preparation_notes?: string;      // e.g., "only when cooked"
  
  // Consumption tracking
  times_consumed: number;
  avg_reaction_score: number;
  last_consumed: Date;
  
  // Community validation
  upvotes: number;
  downvotes: number;
  report_count: number;
  
  // Attribution and permissions
  contributor_name?: string;       // Optional public attribution
  is_public: boolean;             // Share with community
  
  // Metadata
  created_at: Date;
  updated_at: Date;
}

// Food diary entry (when user consumes food)
export interface FoodDiaryEntry {
  id: number;
  user_id: number;
  food_id: number;
  
  // Consumption details
  amount: number;                  // grams
  preparation_method?: string;     // raw, cooked, fermented, etc.
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  
  // Timing (critical for MCAS correlation)
  consumed_at: Date;
  
  // User notes
  notes?: string;
  
  // Calculated fields (for correlation analysis)
  estimated_histamine_load?: number;
  trigger_score?: number;          // AI-calculated risk score
  
  created_at: Date;
}

// API response types
// Food search and API request/response types
export interface FoodSearchRequest {
  query?: string;
  category_filter?: string;
  compatibility_filter?: FoodCompatibility;
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

export interface BulkFoodImportRequest {
  foods: Array<{
    name_no: string;
    name_en: string;
    category: string;
    compatibility: number;
    triggers: string | string[];
    remarks_no?: string;
    remarks_en?: string;
    biogenic_amines?: BiogenicAmines;
  }>;
  overwrite_existing?: boolean;
}

export interface BulkFoodImportResponse {
  imported: number;
  skipped: number;
  errors: string[];
  total_processed: number;
}

// API request/response types
export type CreateFoodRequest = Omit<Food, 'id' | 'created_at' | 'updated_at'>;
export type UpdateFoodRequest = Partial<CreateFoodRequest>;

export type CreateApprovedFoodRequest = Omit<ApprovedFood, 'id' | 'created_at' | 'updated_at' | 'upvotes' | 'downvotes' | 'report_count'>;
export type UpdateApprovedFoodRequest = Partial<CreateApprovedFoodRequest>;

export type CreateFoodDiaryEntryRequest = Omit<FoodDiaryEntry, 'id' | 'created_at' | 'estimated_histamine_load' | 'trigger_score'>;
export type UpdateFoodDiaryEntryRequest = Partial<CreateFoodDiaryEntryRequest>;