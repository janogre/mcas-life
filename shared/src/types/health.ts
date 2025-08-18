/**
 * MCAS-Life Health Types
 * 
 * Comprehensive type definitions for health tracking, symptom logging,
 * and health metrics specifically designed for MCAS patients.
 * 
 * Focuses on:
 * - Detailed symptom tracking with body mapping
 * - Supplement and medication logging
 * - Daily health metrics (sleep, stress, energy, mood)
 * - 72-hour trigger correlation windows
 */

// Comprehensive MCAS symptom categories
export enum SymptomCategory {
  // Dermatological
  SKIN = 'skin',
  
  // Gastrointestinal  
  DIGESTIVE = 'digestive',
  
  // Respiratory
  RESPIRATORY = 'respiratory',
  
  // Cardiovascular
  CARDIOVASCULAR = 'cardiovascular',
  
  // Neurological
  NEUROLOGICAL = 'neurological',
  
  // Musculoskeletal
  MUSCULOSKELETAL = 'musculoskeletal',
  
  // Genitourinary
  GENITOURINARY = 'genitourinary',
  
  // Systemic/General
  SYSTEMIC = 'systemic'
}

// Specific symptoms within each category
export enum SymptomType {
  // Skin symptoms
  HIVES = 'hives',
  ITCHING = 'itching',
  RASH = 'rash',
  FLUSHING = 'flushing',
  SWELLING = 'swelling',
  
  // Digestive symptoms
  NAUSEA = 'nausea',
  VOMITING = 'vomiting',
  DIARRHEA = 'diarrhea',
  ABDOMINAL_PAIN = 'abdominal_pain',
  BLOATING = 'bloating',
  CRAMPING = 'cramping',
  
  // Respiratory symptoms
  WHEEZING = 'wheezing',
  COUGHING = 'coughing',
  SHORTNESS_OF_BREATH = 'shortness_of_breath',
  NASAL_CONGESTION = 'nasal_congestion',
  RUNNY_NOSE = 'runny_nose',
  
  // Cardiovascular symptoms
  RAPID_HEART_RATE = 'rapid_heart_rate',
  LOW_BLOOD_PRESSURE = 'low_blood_pressure',
  CHEST_PAIN = 'chest_pain',
  PALPITATIONS = 'palpitations',
  
  // Neurological symptoms
  HEADACHE = 'headache',
  MIGRAINE = 'migraine',
  DIZZINESS = 'dizziness',
  BRAIN_FOG = 'brain_fog',
  CONFUSION = 'confusion',
  ANXIETY = 'anxiety',
  DEPRESSION = 'depression',
  
  // Musculoskeletal symptoms
  JOINT_PAIN = 'joint_pain',
  MUSCLE_PAIN = 'muscle_pain',
  BONE_PAIN = 'bone_pain',
  
  // Systemic symptoms  
  FATIGUE = 'fatigue',
  FEVER = 'fever',
  CHILLS = 'chills',
  WEAKNESS = 'weakness'
}

// Body regions for symptom location mapping
export enum BodyRegion {
  HEAD = 'head',
  NECK = 'neck',
  CHEST = 'chest',
  UPPER_BACK = 'upper_back',
  LOWER_BACK = 'lower_back',
  ABDOMEN = 'abdomen',
  PELVIS = 'pelvis',
  LEFT_ARM = 'left_arm',
  RIGHT_ARM = 'right_arm',
  LEFT_LEG = 'left_leg',
  RIGHT_LEG = 'right_leg',
  HANDS = 'hands',
  FEET = 'feet',
  WHOLE_BODY = 'whole_body'
}

// Supplement/medication types relevant to MCAS
export enum SupplementType {
  ANTIHISTAMINE = 'antihistamine',
  MAST_CELL_STABILIZER = 'mast_cell_stabilizer',
  DAO_SUPPLEMENT = 'dao_supplement',
  PROBIOTIC = 'probiotic',
  VITAMIN = 'vitamin',
  MINERAL = 'mineral',
  HERBAL = 'herbal',
  PRESCRIPTION = 'prescription',
  OTHER = 'other'
}

// Core symptom entry interface
export interface SymptomEntry {
  id: number;
  user_id: number;
  
  // Symptom identification
  category: SymptomCategory;
  type: SymptomType;
  custom_description?: string;     // For symptoms not in enum
  
  // Severity and impact
  severity: number;                // 1-10 scale
  duration_minutes: number;        // How long it lasted
  intensity_change: 'improving' | 'worsening' | 'stable';
  
  // Location mapping (for visual body map)
  body_regions: BodyRegion[];
  
  // Timing (critical for correlation)
  started_at: Date;
  ended_at?: Date;
  
  // Potential triggers (user-reported)
  suspected_triggers?: string[];
  environmental_factors?: string[];
  
  // Treatment taken
  treatment_taken?: string;
  treatment_effective: boolean | null;
  
  // AI-calculated correlation data
  correlation_score?: number;      // 0-1 probability this was triggered by recent foods
  likely_food_triggers?: number[]; // food_ids with highest correlation
  
  // User notes
  notes?: string;
  
  created_at: Date;
  updated_at: Date;
}

// Daily health metrics for pattern recognition
export interface HealthMetrics {
  id: number;
  user_id: number;
  date: Date;                      // Date for this metrics entry
  
  // Sleep tracking
  sleep_hours: number | null;      // Total sleep time
  sleep_quality: number | null;    // 1-10 scale
  
  // Energy and wellness
  energy_level: number | null;     // 1-10 scale
  overall_wellness: number | null; // 1-10 scale
  
  // Stress and mood
  stress_level: number | null;     // 1-10 scale
  mood_rating: number | null;      // 1-10 scale
  anxiety_level: number | null;    // 1-10 scale
  
  // Physical metrics
  weight: number | null;           // kg
  temperature: number | null;      // celsius
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  heart_rate: number | null;       // bpm
  
  // MCAS-specific tracking
  total_symptom_severity: number | null;  // Sum of all symptoms that day
  symptom_count: number | null;           // Number of symptom episodes
  trigger_exposure_count: number | null;  // Known trigger exposures
  
  // Daily notes
  notes?: string;
  
  created_at: Date;
  updated_at: Date;
}

// Supplement and medication tracking
export interface SupplementEntry {
  id: number;
  user_id: number;
  
  // Supplement identification
  name: string;
  type: SupplementType;
  brand?: string;
  
  // Dosage information
  dosage_amount: number;
  dosage_unit: string;             // mg, mcg, IU, etc.
  frequency: string;               // "twice daily", "as needed", etc.
  
  // Timing
  taken_at: Date;
  next_dose_due?: Date;
  
  // Effectiveness tracking
  intended_for?: SymptomType[];    // What symptoms this targets
  effectiveness_rating?: number;   // 1-10 scale
  side_effects?: string[];
  
  // Medication compliance
  missed_dose: boolean;
  late_dose: boolean;
  
  notes?: string;
  
  created_at: Date;
  updated_at: Date;
}

// Comprehensive diary entry (combines multiple types)
export interface DiaryEntry {
  id: number;
  user_id: number;
  entry_date: Date;
  
  // Entry type classification
  entry_type: 'symptom' | 'meal' | 'supplement' | 'metrics' | 'general';
  
  // Associated data (populated based on entry_type)
  symptom_entry?: SymptomEntry;
  health_metrics?: HealthMetrics;
  supplement_entry?: SupplementEntry;
  
  // General diary fields
  title?: string;
  description?: string;
  mood?: number;                   // 1-10 scale
  
  // Environmental factors (for correlation)
  weather?: string;
  location?: string;
  stress_factors?: string[];
  
  // AI analysis results
  trigger_analysis?: TriggerAnalysis;
  
  created_at: Date;
  updated_at: Date;
}

// AI-driven trigger correlation analysis
export interface TriggerAnalysis {
  id: number;
  user_id: number;
  symptom_entry_id: number;
  
  // Analysis window (72-hour lookback)
  analysis_window_start: Date;
  analysis_window_end: Date;
  
  // Food correlation results
  likely_food_triggers: {
    food_id: number;
    food_name: string;
    correlation_score: number;      // 0-1 probability
    time_consumed: Date;
    time_to_symptom_hours: number;
  }[];
  
  // Pattern recognition
  similar_past_episodes: number[];  // IDs of similar symptom patterns
  improvement_suggestions: string[];
  
  // Environmental factors
  environmental_correlations: {
    factor: string;
    correlation_score: number;
  }[];
  
  // Confidence metrics
  analysis_confidence: number;      // 0-1 how confident the AI is
  data_quality_score: number;      // 0-1 based on completeness of user data
  
  created_at: Date;
}

// API request/response types
export type CreateSymptomEntryRequest = Omit<SymptomEntry, 'id' | 'created_at' | 'updated_at' | 'correlation_score' | 'likely_food_triggers'>;
export type UpdateSymptomEntryRequest = Partial<CreateSymptomEntryRequest>;

export type CreateHealthMetricsRequest = Omit<HealthMetrics, 'id' | 'created_at' | 'updated_at'>;
export type UpdateHealthMetricsRequest = Partial<CreateHealthMetricsRequest>;

export type CreateSupplementEntryRequest = Omit<SupplementEntry, 'id' | 'created_at' | 'updated_at'>;
export type UpdateSupplementEntryRequest = Partial<CreateSupplementEntryRequest>;

// Dashboard and analytics types
export interface SymptomPattern {
  symptom_type: SymptomType;
  frequency: number;               // episodes per week
  average_severity: number;        // 1-10 scale
  common_triggers: string[];
  improvement_trend: 'improving' | 'worsening' | 'stable';
}

export interface HealthDashboard {
  user_id: number;
  period_start: Date;
  period_end: Date;
  
  // Summary statistics
  total_symptom_episodes: number;
  average_daily_wellness: number;
  most_common_symptoms: SymptomPattern[];
  
  // Correlation insights
  strongest_food_correlations: {
    food_name: string;
    trigger_probability: number;
  }[];
  
  // Trends
  wellness_trend: 'improving' | 'worsening' | 'stable';
  symptom_frequency_trend: 'improving' | 'worsening' | 'stable';
  
  // Recommendations
  ai_recommendations: string[];
  
  generated_at: Date;
}