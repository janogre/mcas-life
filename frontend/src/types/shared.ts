// Simplified shared types for frontend
// In a real implementation, this would import from @mcas-life/shared package

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
  started_at: Date;
  ended_at?: Date;
  notes?: string;
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

export interface TriggerAnalysisResult {
  analysis_confidence: number;
  data_quality_score: number;
  likely_food_triggers: Array<{
    food_id: number;
    food_name: string;
    correlation_score: number;
    time_consumed: string;
    time_to_symptom_hours: number;
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