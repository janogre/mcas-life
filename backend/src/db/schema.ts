/**
 * MCAS-Life Database Schema
 * 
 * Drizzle ORM schema definitions based on shared TypeScript types.
 * Designed for PostgreSQL with MCAS-specific features:
 * - JSONB support for biogenic amines and trigger arrays
 * - Temporal tracking for 72-hour correlation analysis
 * - HIPAA-compliant audit logging
 * - Efficient indexing for symptom correlation queries
 */

import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  foreignKey,
  pgEnum,
  real,
  date
} from 'drizzle-orm/pg-core';
// Note: drizzle-zod schemas will be added when needed for validation
import { relations } from 'drizzle-orm';

// Enums matching shared types - SIGHI official scale 0-3
export const foodCompatibilityEnum = pgEnum('food_compatibility', ['0', '1', '2', '3']); // SAFE, MEDIUM, INCOMPATIBLE, SEVERE
export const userRoleEnum = pgEnum('user_role', ['patient', 'expert', 'researcher', 'admin']);
export const mcasSeverityEnum = pgEnum('mcas_severity', ['mild', 'moderate', 'severe', 'unknown']);
export const symptomCategoryEnum = pgEnum('symptom_category', [
  'skin', 'digestive', 'respiratory', 'cardiovascular', 'neurological', 
  'musculoskeletal', 'genitourinary', 'systemic'
]);
export const supplementTypeEnum = pgEnum('supplement_type', [
  'antihistamine', 'mast_cell_stabilizer', 'dao_supplement', 'probiotic',
  'vitamin', 'mineral', 'herbal', 'prescription', 'other'
]);
export const accountStatusEnum = pgEnum('account_status', ['active', 'suspended', 'deleted']);
export const subscriptionTierEnum = pgEnum('subscription_tier', ['free', 'premium', 'professional']);
export const captureMethodEnum = pgEnum('capture_method', ['quick', 'detailed', 'retrospective']);
export const enrichmentStatusEnum = pgEnum('enrichment_status', ['minimal', 'partial', 'complete']);
export const medicationTypeEnum = pgEnum('medication_type', ['mcas', 'prescription', 'over_counter', 'supplement']);
export const activityTypeEnum = pgEnum('activity_type', ['temperature_change', 'social_trigger', 'physical_activity']);
export const temperatureChangeEnum = pgEnum('temperature_change_type', ['hot_to_cold', 'cold_to_hot']);
export const physicalIntensityEnum = pgEnum('physical_intensity', ['light', 'moderate', 'intense']);
export const illnessTypeEnum = pgEnum('illness_type', ['cold', 'flu', 'infection', 'stomach_bug', 'fever', 'other']);
export const illnessStatusEnum = pgEnum('illness_status', ['incubating', 'active', 'recovering', 'resolved']);
export const mealTypeEnum = pgEnum('meal_type', ['breakfast', 'lunch', 'dinner', 'snack', 'other']);

// Users table - Core user management
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  
  // Authentication
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  
  // Password reset
  password_reset_token: varchar('password_reset_token', { length: 255 }),
  password_reset_expires: timestamp('password_reset_expires'),
  
  // Personal information
  first_name: varchar('first_name', { length: 100 }),
  last_name: varchar('last_name', { length: 100 }),
  date_of_birth: date('date_of_birth'),
  gender: varchar('gender', { length: 30 }),
  
  // Location and preferences
  country: varchar('country', { length: 2 }), // ISO 3166-1 alpha-2
  city: varchar('city', { length: 100 }), // User's city for automatic weather data
  latitude: decimal('latitude', { precision: 10, scale: 7 }), // For precise weather data
  longitude: decimal('longitude', { precision: 10, scale: 7 }), // For precise weather data
  timezone: varchar('timezone', { length: 50 }).notNull().default('Europe/Oslo'),
  language: varchar('language', { length: 2 }).notNull().default('no'), // ISO 639-1
  
  // Account management
  role: userRoleEnum('role').notNull().default('patient'),
  email_verified: boolean('email_verified').notNull().default(false),
  account_status: accountStatusEnum('account_status').notNull().default('active'),
  
  // App preferences
  preferred_units: varchar('preferred_units', { length: 10 }).notNull().default('metric'),
  dark_mode: boolean('dark_mode').notNull().default(false),
  onboarding_completed: boolean('onboarding_completed').notNull().default(false),
  
  // Professional verification
  verified_professional: boolean('verified_professional').notNull().default(false),
  professional_credentials: text('professional_credentials'),
  verification_date: timestamp('verification_date'),
  
  // Usage analytics
  last_login: timestamp('last_login'),
  total_logins: integer('total_logins').notNull().default(0),
  days_active: integer('days_active').notNull().default(0),
  
  // Subscription
  subscription_tier: subscriptionTierEnum('subscription_tier').notNull().default('free'),
  subscription_expires: timestamp('subscription_expires'),

  // Airthings integration (OAuth 2.0 tokens for indoor air quality data)
  airthings_access_token: text('airthings_access_token'),
  airthings_refresh_token: text('airthings_refresh_token'),
  airthings_token_expires_at: timestamp('airthings_token_expires_at'),
  airthings_connected: boolean('airthings_connected').notNull().default(false),

  // Audit fields
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  usernameIdx: uniqueIndex('users_username_idx').on(table.username),
  roleIdx: index('users_role_idx').on(table.role),
  statusIdx: index('users_status_idx').on(table.account_status)
}));

// MCAS-specific user profile information
export const mcasProfiles = pgTable('mcas_profiles', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Diagnosis information
  diagnosis_date: date('diagnosis_date'),
  severity: mcasSeverityEnum('severity').notNull().default('unknown'),
  confirmed_by_doctor: boolean('confirmed_by_doctor').notNull().default(false),
  
  // Related conditions (stored as JSON for flexibility)
  comorbidities: jsonb('comorbidities').$type<{
    mastocytosis: boolean;
    histamine_intolerance: boolean;
    pots: boolean;
    eds: boolean;
    food_allergies: boolean;
    other: string[];
  }>(),
  
  // Current treatments
  current_medications: jsonb('current_medications').$type<string[]>(),
  current_supplements: jsonb('current_supplements').$type<string[]>(),
  treatment_plan: text('treatment_plan'),
  
  // Known triggers (food_ids will reference foods table)
  known_food_triggers: jsonb('known_food_triggers').$type<number[]>(),
  known_environmental_triggers: jsonb('known_environmental_triggers').$type<string[]>(),
  known_stress_triggers: jsonb('known_stress_triggers').$type<string[]>(),
  
  // Tolerance levels for AI personalization
  histamine_tolerance_level: varchar('histamine_tolerance_level', { length: 20 }).notNull().default('moderate'),
  exercise_tolerance: varchar('exercise_tolerance', { length: 20 }).notNull().default('moderate'),
  stress_tolerance: varchar('stress_tolerance', { length: 20 }).notNull().default('moderate'),
  
  // Emergency information
  emergency_contacts: jsonb('emergency_contacts').$type<string[]>(),
  allergic_to_medications: jsonb('allergic_to_medications').$type<string[]>(),
  emergency_action_plan: text('emergency_action_plan'),
  
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  userIdIdx: uniqueIndex('mcas_profiles_user_id_idx').on(table.user_id),
  severityIdx: index('mcas_profiles_severity_idx').on(table.severity)
}));

// User preferences for notifications and privacy
export const userPreferences = pgTable('user_preferences', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Notification preferences
  notification_preferences: jsonb('notification_preferences').$type<{
    supplement_reminders: boolean;
    daily_check_in: boolean;
    symptom_followup: boolean;
    trigger_alerts: boolean;
    pattern_insights: boolean;
    community_updates: boolean;
    research_participation: boolean;
    push_notifications: boolean;
    email_notifications: boolean;
    sms_notifications: boolean;
  }>().notNull(),
  
  // Privacy settings
  privacy_settings: jsonb('privacy_settings').$type<{
    share_anonymous_data: boolean;
    share_improvement_data: boolean;
    public_profile: boolean;
    show_in_expert_network: boolean;
    allow_expert_contact: boolean;
    share_reports_with_doctors: boolean;
    auto_delete_old_data: boolean;
    data_retention_months: number;
  }>().notNull(),
  
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  userIdIdx: uniqueIndex('user_preferences_user_id_idx').on(table.user_id)
}));

// Foods table - Enhanced SIGHI database with nutritional data
export const foods = pgTable('foods', {
  id: serial('id').primaryKey(),
  
  // Basic identification (from SIGHI/MCAS-search)
  name_no: varchar('name_no', { length: 255 }).notNull(),
  name_en: varchar('name_en', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  
  // SIGHI compatibility system (0=safe, 1=medium, 2=incompatible, 3=severe)
  compatibility: foodCompatibilityEnum('compatibility').notNull(),
  triggers: jsonb('triggers').$type<string[]>().notNull(), // ['H', 'L', 'A', etc.]
  
  // Descriptive information
  remarks_no: text('remarks_no').notNull().default(''),
  remarks_en: text('remarks_en').notNull().default(''),
  
  // Enhanced nutritional data (Fooddata.dk integration)
  biogenic_amines: jsonb('biogenic_amines').$type<{
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
  }>(),
  
  // Core nutritional data (82+ parameters can be added)
  nutrition_data: jsonb('nutrition_data').$type<{
    calories: number | null;
    protein: number | null;
    carbohydrates: number | null;
    fat: number | null;
    fiber: number | null;
    sugar: number | null;
    vitaminB6: number | null;
    vitaminC: number | null;
    vitaminD: number | null;
    folate: number | null;
    magnesium: number | null;
    zinc: number | null;
    copper: number | null;
    calcium: number | null;
    [key: string]: number | null;
  }>(),
  
  // External API integration
  fooddata_dk_id: integer('fooddata_dk_id'),
  openfoodfacts_id: varchar('openfoodfacts_id', { length: 50 }),
  
  // Data quality and sourcing
  verified: boolean('verified').notNull().default(false),
  source: varchar('source', { length: 20 }).notNull().default('sighi'), // sighi, community, fooddata, openfoodfacts, custom
  created_by_user_id: integer('created_by_user_id').references(() => users.id, { onDelete: 'set null' }), // For custom user-created foods

  // Display names without SIGHI uncertainty notation (? prefix)
  display_name_en: varchar('display_name_en', { length: 255 }),
  display_name_no: varchar('display_name_no', { length: 255 }),
  sighi_uncertainty_level: integer('sighi_uncertainty_level').notNull().default(0), // 0 = certain, 1 = ?, 2 = ??, 3 = ???

  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  nameNoIdx: index('foods_name_no_idx').on(table.name_no),
  nameEnIdx: index('foods_name_en_idx').on(table.name_en),
  categoryIdx: index('foods_category_idx').on(table.category),
  compatibilityIdx: index('foods_compatibility_idx').on(table.compatibility),
  sourceIdx: index('foods_source_idx').on(table.source),
  fooddataIdx: index('foods_fooddata_dk_id_idx').on(table.fooddata_dk_id)
  // Note: GIN index for JSONB will be added in migration manually
}));

// Community-approved foods (user-contributed safe foods)
export const approvedFoods = pgTable('approved_foods', {
  id: serial('id').primaryKey(),
  food_id: integer('food_id').notNull().references(() => foods.id, { onDelete: 'cascade' }),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Approval details
  personal_tolerance: foodCompatibilityEnum('personal_tolerance').notNull(),
  notes: text('notes').notNull().default(''),
  dosage_notes: text('dosage_notes'),
  preparation_notes: text('preparation_notes'),
  
  // Consumption tracking (missing fields that Food Service expects)
  times_consumed: integer('times_consumed').notNull().default(1),
  avg_reaction_score: real('avg_reaction_score').notNull().default(0),
  last_consumed: timestamp('last_consumed').notNull().defaultNow(),
  
  // Community validation
  upvotes: integer('upvotes').notNull().default(0),
  downvotes: integer('downvotes').notNull().default(0),
  report_count: integer('report_count').notNull().default(0),
  
  // Attribution and permissions
  contributor_name: varchar('contributor_name', { length: 100 }),
  is_public: boolean('is_public').notNull().default(true),
  
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  foodUserIdx: uniqueIndex('approved_foods_food_user_idx').on(table.food_id, table.user_id),
  foodIdx: index('approved_foods_food_idx').on(table.food_id),
  userIdx: index('approved_foods_user_idx').on(table.user_id),
  publicIdx: index('approved_foods_public_idx').on(table.is_public),
  toleranceIdx: index('approved_foods_tolerance_idx').on(table.personal_tolerance)
}));

// Personal food ratings (separate from safe foods list)
export const personalFoodRatings = pgTable('personal_food_ratings', {
  id: serial('id').primaryKey(),
  food_id: integer('food_id').notNull().references(() => foods.id, { onDelete: 'cascade' }),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Personal rating (0-3 scale matching SIGHI)
  personal_rating: foodCompatibilityEnum('personal_rating').notNull(),
  
  // Optional notes about the rating
  notes: text('notes').notNull().default(''),
  
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  foodUserIdx: uniqueIndex('personal_food_ratings_food_user_idx').on(table.food_id, table.user_id),
  foodIdx: index('personal_food_ratings_food_idx').on(table.food_id),
  userIdx: index('personal_food_ratings_user_idx').on(table.user_id),
  ratingIdx: index('personal_food_ratings_rating_idx').on(table.personal_rating)
}));

// Food diary entries (when user consumes food)
export const foodDiaryEntries = pgTable('food_diary_entries', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  food_id: integer('food_id').notNull().references(() => foods.id),
  
  // Consumption details
  amount: real('amount').notNull(), // grams
  preparation_method: varchar('preparation_method', { length: 100 }),
  meal_type: varchar('meal_type', { length: 20 }).notNull(), // breakfast, lunch, dinner, snack
  
  // Critical timing for MCAS correlation (indexed for fast queries)
  consumed_at: timestamp('consumed_at').notNull(),
  
  // User notes
  notes: text('notes'),
  
  // AI-calculated fields (updated by background processes)
  estimated_histamine_load: real('estimated_histamine_load'),
  trigger_score: real('trigger_score'), // 0-1 AI-calculated risk score
  
  created_at: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  userIdx: index('food_diary_user_idx').on(table.user_id),
  foodIdx: index('food_diary_food_idx').on(table.food_id),
  consumedAtIdx: index('food_diary_consumed_at_idx').on(table.consumed_at),
  userConsumedIdx: index('food_diary_user_consumed_idx').on(table.user_id, table.consumed_at),
  mealTypeIdx: index('food_diary_meal_type_idx').on(table.meal_type)
}));

// Symptom templates - Predefined symptom types with follow-up questions
export const symptomTemplates = pgTable('symptom_templates', {
  id: serial('id').primaryKey(),

  // Basic identification
  category: symptomCategoryEnum('category').notNull(),
  name_no: varchar('name_no', { length: 100 }).notNull(),
  name_en: varchar('name_en', { length: 100 }).notNull(),
  icon: varchar('icon', { length: 50 }), // Icon name or emoji

  // Severity scale labels for this symptom
  severity_label_low_no: varchar('severity_label_low_no', { length: 50 }).notNull().default('Umerkelig'),
  severity_label_mid_no: varchar('severity_label_mid_no', { length: 50 }).notNull().default('Merkbar'),
  severity_label_high_no: varchar('severity_label_high_no', { length: 50 }).notNull().default('Utålelig'),

  // Follow-up questions configuration (JSONB array of question objects)
  follow_up_questions: jsonb('follow_up_questions').$type<Array<{
    id: string;
    question_no: string;
    question_en: string;
    type: 'single_choice' | 'multiple_choice' | 'slider' | 'text' | 'body_map' | 'time_since';
    options?: string[]; // For choice questions
    min?: number; // For slider
    max?: number; // For slider
    unit?: string; // For slider (e.g., "min", "timer")
    required?: boolean;
  }>>(),

  // Body regions commonly affected by this symptom
  common_body_regions: jsonb('common_body_regions').$type<string[]>(),

  // Display order and metadata
  display_order: integer('display_order').notNull().default(0),
  is_active: boolean('is_active').notNull().default(true),

  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  categoryIdx: index('symptom_templates_category_idx').on(table.category),
  activeIdx: index('symptom_templates_active_idx').on(table.is_active),
  orderIdx: index('symptom_templates_order_idx').on(table.display_order)
}));

// Symptom entries - Core MCAS tracking
export const symptomEntries = pgTable('symptom_entries', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Symptom identification
  category: symptomCategoryEnum('category').notNull(),
  type: varchar('symptom_type', { length: 50 }).notNull(),
  custom_description: text('custom_description'),
  
  // Severity and impact (1-10 scale)
  severity: integer('severity').notNull(),
  duration_minutes: integer('duration_minutes').notNull(),
  intensity_change: varchar('intensity_change', { length: 20 }).notNull(), // improving, worsening, stable
  
  // Location mapping (for visual body map) - stored as JSON array
  body_regions: jsonb('body_regions').$type<string[]>().notNull(),
  
  // Critical timing for 72-hour correlation analysis
  started_at: timestamp('started_at').notNull(),
  ended_at: timestamp('ended_at'),
  
  // User-reported potential triggers
  suspected_triggers: jsonb('suspected_triggers').$type<string[]>(),
  environmental_factors: jsonb('environmental_factors').$type<string[]>(),
  
  // Extended trigger context - Based on patient experience
  dao_taken_before_meal: boolean('dao_taken_before_meal'),
  sensory_environment_calm: boolean('sensory_environment_calm'),
  compression_worn_during_day: boolean('compression_worn_during_day'),
  physical_fatigue_level: integer('physical_fatigue_level'), // 0-10 when symptom occurred
  psychological_fatigue_level: integer('psychological_fatigue_level'), // 0-10 when symptom occurred
  time_since_last_meal_minutes: integer('time_since_last_meal_minutes'),
  had_heavy_food_today: boolean('had_heavy_food_today'),
  current_stress_factors: jsonb('current_stress_factors').$type<string[]>(),
  weather_conditions: jsonb('weather_conditions').$type<{
    temperature?: number;
    humidity?: number;
    pressure?: number;
    weather_type?: string; // sunny, rainy, stormy, etc
  }>(),
  // Airthings indoor air quality data (if available)
  indoor_air_quality: jsonb('indoor_air_quality').$type<{
    temperature?: number; // Celsius
    humidity?: number; // Percentage
    co2?: number; // ppm
    voc?: number; // ppb (Volatile Organic Compounds)
    pm25?: number; // μg/m³ (Particulate Matter 2.5)
    radon_short_term?: number; // Bq/m³
    pressure?: number; // mbar
    room_name?: string; // Which Airthings device/room
    measured_at?: string; // ISO timestamp when data was captured
  }>(),
  menstrual_cycle_phase: varchar('menstrual_cycle_phase', { length: 20 }), // pre, during, post, null
  sleep_quality_last_night: integer('sleep_quality_last_night'), // 1-10
  reactions_in_last_24h: integer('reactions_in_last_24h'), // count of previous reactions
  cumulative_day_stress: integer('cumulative_day_stress'), // 1-10 how stressful the day has been so far
  
  // Treatment information
  treatment_taken: text('treatment_taken'),
  treatment_effective: boolean('treatment_effective'),
  
  // AI-calculated correlation data (updated by background analysis)
  correlation_score: real('correlation_score'), // 0-1 probability this was triggered by recent foods
  likely_food_triggers: jsonb('likely_food_triggers').$type<number[]>(), // food_ids with highest correlation

  // Room location tracking (Airthings integration)
  room_locations: jsonb('room_locations').$type<Array<{
    room_id: string;
    room_name: string;
    time_spent_minutes?: number;
  }>>(),

  // Capture metadata
  capture_method: captureMethodEnum('capture_method').notNull().default('quick'),
  enrichment_status: enrichmentStatusEnum('enrichment_status').notNull().default('minimal'),
  follow_up_completed_at: timestamp('follow_up_completed_at'),

  // User notes
  notes: text('notes'),

  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  userIdx: index('symptom_entries_user_idx').on(table.user_id),
  categoryIdx: index('symptom_entries_category_idx').on(table.category),
  typeIdx: index('symptom_entries_type_idx').on(table.type),
  severityIdx: index('symptom_entries_severity_idx').on(table.severity),
  startedAtIdx: index('symptom_entries_started_at_idx').on(table.started_at),
  userStartedIdx: index('symptom_entries_user_started_idx').on(table.user_id, table.started_at),
  // Critical index for correlation queries - 72 hour lookback
  correlationIdx: index('symptom_entries_correlation_idx').on(table.user_id, table.started_at, table.correlation_score)
}));

// Daily health metrics for pattern recognition - Enhanced with patient insights
export const healthMetrics = pgTable('health_metrics', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(), // Date for this metrics entry
  
  // Sleep tracking
  sleep_hours: real('sleep_hours'),
  sleep_quality: integer('sleep_quality'), // 1-10 scale
  
  // Energy and wellness
  energy_level: integer('energy_level'), // 1-10 scale
  overall_wellness: integer('overall_wellness'), // 1-10 scale
  
  // Stress and mood
  stress_level: integer('stress_level'), // 1-10 scale
  mood_rating: integer('mood_rating'), // 1-10 scale
  anxiety_level: integer('anxiety_level'), // 1-10 scale
  
  // Physical metrics
  weight: real('weight'), // kg
  temperature: real('temperature'), // celsius
  blood_pressure_systolic: integer('blood_pressure_systolic'),
  blood_pressure_diastolic: integer('blood_pressure_diastolic'),
  heart_rate: integer('heart_rate'), // bpm
  
  // MCAS-specific triggers - Based on patient experience
  dao_supplement_taken: boolean('dao_supplement_taken').notNull().default(false),
  compression_worn: boolean('compression_worn').notNull().default(false), // for legs
  sensory_environment_controlled: boolean('sensory_environment_controlled').notNull().default(false),
  physical_activity_level: integer('physical_activity_level'), // 0-10 scale
  weather_temperature: real('weather_temperature'), // celsius
  weather_humidity: integer('weather_humidity'), // 0-100%
  weather_barometric_pressure: real('weather_barometric_pressure'), // hPa
  
  // Health status factors
  infection_symptoms: boolean('infection_symptoms').notNull().default(false),
  incubating_illness: boolean('incubating_illness').notNull().default(false),
  menstrual_cycle_day: integer('menstrual_cycle_day'), // 1-28+ or null
  perimenopause_symptoms: boolean('perimenopause_symptoms').notNull().default(false),
  
  // Previous day influence
  had_reactions_yesterday: boolean('had_reactions_yesterday').notNull().default(false),
  physical_activity_yesterday: integer('physical_activity_yesterday'), // 0-10 scale
  fatigue_level_yesterday: integer('fatigue_level_yesterday'), // 0-10 scale
  stress_level_yesterday: integer('stress_level_yesterday'), // 0-10 scale
  
  // Daily context factors
  ate_heavy_food: boolean('ate_heavy_food').notNull().default(false), // blood sugar impacting
  current_concerns: text('current_concerns'), // what's stressing them
  controlled_stimuli: boolean('controlled_stimuli').notNull().default(false),
  physically_tired_when_eating: boolean('physically_tired_when_eating').notNull().default(false),
  psychologically_tired_when_eating: boolean('psychologically_tired_when_eating').notNull().default(false),
  
  // Cumulative load tracking
  cumulative_stress_score: integer('cumulative_stress_score'), // calculated field 0-100
  reaction_risk_level: integer('reaction_risk_level'), // calculated field 1-10
  
  // MCAS-specific aggregated data (calculated fields)
  total_symptom_severity: integer('total_symptom_severity'), // Sum of all symptoms that day
  symptom_count: integer('symptom_count'), // Number of symptom episodes
  trigger_exposure_count: integer('trigger_exposure_count'), // Known trigger exposures
  
  // Daily notes
  notes: text('notes'),
  
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  userDateIdx: uniqueIndex('health_metrics_user_date_idx').on(table.user_id, table.date),
  userIdx: index('health_metrics_user_idx').on(table.user_id),
  dateIdx: index('health_metrics_date_idx').on(table.date)
}));

// Supplement and medication tracking
export const supplementEntries = pgTable('supplement_entries', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Supplement identification
  name: varchar('name', { length: 255 }).notNull(),
  type: supplementTypeEnum('type').notNull(),
  brand: varchar('brand', { length: 100 }),
  
  // Dosage information
  dosage_amount: real('dosage_amount').notNull(),
  dosage_unit: varchar('dosage_unit', { length: 20 }).notNull(), // mg, mcg, IU, etc.
  frequency: text('frequency').notNull(), // "twice daily", "as needed", etc.
  
  // Timing
  taken_at: timestamp('taken_at').notNull(),
  next_dose_due: timestamp('next_dose_due'),
  
  // Effectiveness tracking
  intended_for: jsonb('intended_for').$type<string[]>(), // Symptom types this targets
  effectiveness_rating: integer('effectiveness_rating'), // 1-10 scale
  side_effects: jsonb('side_effects').$type<string[]>(),
  
  // Medication compliance
  missed_dose: boolean('missed_dose').notNull().default(false),
  late_dose: boolean('late_dose').notNull().default(false),
  
  notes: text('notes'),
  
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  userIdx: index('supplement_entries_user_idx').on(table.user_id),
  typeIdx: index('supplement_entries_type_idx').on(table.type),
  takenAtIdx: index('supplement_entries_taken_at_idx').on(table.taken_at),
  userTakenIdx: index('supplement_entries_user_taken_idx').on(table.user_id, table.taken_at),
  nameIdx: index('supplement_entries_name_idx').on(table.name)
}));

// AI-driven trigger correlation analysis results
export const triggerAnalyses = pgTable('trigger_analyses', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  symptom_entry_id: integer('symptom_entry_id').notNull().references(() => symptomEntries.id, { onDelete: 'cascade' }),
  
  // Analysis window (72-hour lookback)
  analysis_window_start: timestamp('analysis_window_start').notNull(),
  analysis_window_end: timestamp('analysis_window_end').notNull(),
  
  // Food correlation results (stored as JSONB for complex queries)
  likely_food_triggers: jsonb('likely_food_triggers').$type<Array<{
    food_id: number;
    food_name: string;
    correlation_score: number;
    time_consumed: string;
    time_to_symptom_hours: number;
  }>>(),
  
  // Pattern recognition
  similar_past_episodes: jsonb('similar_past_episodes').$type<number[]>(), // Symptom entry IDs
  improvement_suggestions: jsonb('improvement_suggestions').$type<string[]>(),
  
  // Environmental correlations
  environmental_correlations: jsonb('environmental_correlations').$type<Array<{
    factor: string;
    correlation_score: number;
  }>>(),
  
  // Confidence metrics
  analysis_confidence: real('analysis_confidence').notNull(), // 0-1
  data_quality_score: real('data_quality_score').notNull(), // 0-1
  
  created_at: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  userIdx: index('trigger_analyses_user_idx').on(table.user_id),
  symptomIdx: index('trigger_analyses_symptom_idx').on(table.symptom_entry_id),
  windowIdx: index('trigger_analyses_window_idx').on(table.analysis_window_start, table.analysis_window_end),
  confidenceIdx: index('trigger_analyses_confidence_idx').on(table.analysis_confidence)
}));

// User sessions for security and analytics
export const userSessions = pgTable('user_sessions', {
  id: varchar('id', { length: 512 }).primaryKey(), // JWT refresh token
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  // Session information
  device_info: text('device_info').notNull(),
  ip_address: varchar('ip_address', { length: 45 }).notNull(), // IPv6 compatible
  user_agent: text('user_agent').notNull(),
  
  // Session lifecycle
  last_activity: timestamp('last_activity').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
  expires_at: timestamp('expires_at').notNull(),
  is_active: boolean('is_active').notNull().default(true)
}, (table) => ({
  userIdIdx: index('user_sessions_user_id_idx').on(table.user_id),
  expiresAtIdx: index('user_sessions_expires_at_idx').on(table.expires_at),
  activeIdx: index('user_sessions_active_idx').on(table.is_active),
  lastActivityIdx: index('user_sessions_last_activity_idx').on(table.last_activity)
}));

// Define relations for type-safe joins
export const usersRelations = relations(users, ({ one, many }) => ({
  mcasProfile: one(mcasProfiles),
  preferences: one(userPreferences),
  approvedFoods: many(approvedFoods),
  personalFoodRatings: many(personalFoodRatings),
  foodDiaryEntries: many(foodDiaryEntries),
  symptomEntries: many(symptomEntries),
  healthMetrics: many(healthMetrics),
  supplementEntries: many(supplementEntries),
  triggerAnalyses: many(triggerAnalyses),
  sessions: many(userSessions)
}));

export const foodsRelations = relations(foods, ({ many }) => ({
  approvedFoods: many(approvedFoods),
  personalFoodRatings: many(personalFoodRatings),
  foodDiaryEntries: many(foodDiaryEntries)
}));

export const symptomEntriesRelations = relations(symptomEntries, ({ one, many }) => ({
  user: one(users, {
    fields: [symptomEntries.user_id],
    references: [users.id]
  }),
  triggerAnalyses: many(triggerAnalyses)
}));

// System Settings table - Store application-wide configuration
export const systemSettings = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  setting_key: varchar('setting_key', { length: 100 }).notNull().unique(),
  setting_value: text('setting_value'),
  encrypted: boolean('encrypted').notNull().default(false),
  description: text('description'),
  updated_by: integer('updated_by').references(() => users.id),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  keyIdx: uniqueIndex('system_settings_key_idx').on(table.setting_key)
}));

// Saved Recipes table - User's saved recipes from Spoonacular
export const savedRecipes = pgTable('saved_recipes', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  spoonacular_recipe_id: integer('spoonacular_recipe_id').notNull(),

  // Cached recipe data from Spoonacular (full recipe details)
  recipe_data: jsonb('recipe_data').$type<{
    id: number;
    title: string;
    image?: string;
    readyInMinutes?: number;
    servings?: number;
    sourceUrl?: string;
    summary?: string;
    instructions?: string;
    extendedIngredients?: Array<{
      id: number;
      name: string;
      amount: number;
      unit: string;
      original: string;
    }>;
    [key: string]: any;
  }>().notNull(),

  // MCAS-specific data
  mcas_score: real('mcas_score').notNull(), // 0-100 safety score
  notes: text('notes').notNull().default(''),
  times_made: integer('times_made').notNull().default(0),

  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  userIdIdx: index('saved_recipes_user_id_idx').on(table.user_id),
  spoonacularIdIdx: index('saved_recipes_spoonacular_id_idx').on(table.spoonacular_recipe_id),
  userSpoonacularUnique: uniqueIndex('saved_recipes_user_spoonacular_unique').on(
    table.user_id,
    table.spoonacular_recipe_id
  ),
  mcasScoreIdx: index('saved_recipes_mcas_score_idx').on(table.mcas_score)
}));

// Medications Catalog table - FEST (Norwegian medication database)
export const medicationsCatalog = pgTable('medications_catalog', {
  id: serial('id').primaryKey(),

  // FEST identifiers
  fest_id: varchar('fest_id', { length: 100 }).unique(), // Unique ID from FEST
  varenummer: varchar('varenummer', { length: 20 }), // Norwegian product number

  // Medication details
  name: varchar('name', { length: 500 }).notNull(), // Full medication name
  active_substance: varchar('active_substance', { length: 500 }), // Active ingredient(s)
  atc_code: varchar('atc_code', { length: 20 }), // Anatomical Therapeutic Chemical code

  // Form and strength
  form: varchar('form', { length: 200 }), // tablet, mixture, injection, etc.
  strength: varchar('strength', { length: 200 }), // e.g., "10 mg", "5 mg/ml"

  // Manufacturer and prescription
  manufacturer: varchar('manufacturer', { length: 255 }),
  prescription_required: boolean('prescription_required').notNull().default(true),

  // Additional metadata
  approved: boolean('approved').notNull().default(true), // Active/approved in Norway
  metadata: jsonb('metadata').$type<{
    package_sizes?: string[];
    warnings?: string[];
    indications?: string[];
    [key: string]: any;
  }>(),

  // Search optimization
  search_vector: text('search_vector'), // For full-text search

  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  nameIdx: index('medications_catalog_name_idx').on(table.name),
  substanceIdx: index('medications_catalog_substance_idx').on(table.active_substance),
  atcIdx: index('medications_catalog_atc_idx').on(table.atc_code),
  festIdIdx: uniqueIndex('medications_catalog_fest_id_idx').on(table.fest_id)
}));

// User Medications table - Track user's medication intake
export const userMedications = pgTable('user_medications', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Medication reference (can be from catalog or custom)
  catalog_medication_id: integer('catalog_medication_id').references(() => medicationsCatalog.id),
  custom_name: varchar('custom_name', { length: 255 }), // If not in catalog

  // Classification
  medication_type: medicationTypeEnum('medication_type').notNull().default('mcas'),

  // Dosage information
  dosage: varchar('dosage', { length: 100 }), // e.g., "10"
  dosage_unit: varchar('dosage_unit', { length: 50 }), // e.g., "mg", "ml", "tabletter"

  // Timing
  time_taken: timestamp('time_taken').notNull(),

  // Notes
  notes: text('notes'),

  created_at: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  userIdIdx: index('user_medications_user_id_idx').on(table.user_id),
  timeTakenIdx: index('user_medications_time_taken_idx').on(table.time_taken),
  catalogIdIdx: index('user_medications_catalog_id_idx').on(table.catalog_medication_id)
}));

// Activity Entries table - Track MCAS triggers from activities
export const activityEntries = pgTable('activity_entries', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Activity type classification
  activity_type: activityTypeEnum('activity_type').notNull(),

  // Temperature change specific fields
  temperature_change_type: temperatureChangeEnum('temperature_change_type'),
  temperature_from: real('temperature_from'), // Celsius
  temperature_to: real('temperature_to'), // Celsius

  // Social trigger specific fields
  social_trigger_type: varchar('social_trigger_type', { length: 100 }), // 'crowds', 'noise', 'social_stress', 'sensory_overload'
  estimated_people_count: integer('estimated_people_count'), // Approximate number of people
  noise_level: integer('noise_level'), // 1-10 scale

  // Physical activity specific fields
  physical_activity_type: varchar('physical_activity_type', { length: 100 }), // 'walking', 'running', 'cycling', 'household', etc.
  intensity: physicalIntensityEnum('intensity'),
  duration_minutes: integer('duration_minutes'),

  // Common fields for all activities
  time_started: timestamp('time_started').notNull(),
  time_ended: timestamp('time_ended'),

  // Location context
  location_description: varchar('location_description', { length: 255 }), // e.g., "Kjøpesenter", "Ute på tur"

  // Notes and reactions
  notes: text('notes'),
  immediate_symptoms: boolean('immediate_symptoms').notNull().default(false),
  symptom_description: text('symptom_description'),

  created_at: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  userIdIdx: index('activity_entries_user_id_idx').on(table.user_id),
  activityTypeIdx: index('activity_entries_activity_type_idx').on(table.activity_type),
  timeStartedIdx: index('activity_entries_time_started_idx').on(table.time_started),
  userTimeIdx: index('activity_entries_user_time_idx').on(table.user_id, table.time_started)
}));

// Illness Entries table - Track illness episodes and their impact on MCAS
export const illnessEntries = pgTable('illness_entries', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Illness classification
  illness_type: illnessTypeEnum('illness_type').notNull(),
  custom_illness_name: varchar('custom_illness_name', { length: 255 }), // For 'other' type

  // Illness status tracking
  status: illnessStatusEnum('status').notNull().default('incubating'),

  // Symptom details
  symptoms: jsonb('symptoms').$type<string[]>(), // Array of symptoms: ['fever', 'cough', 'headache', etc.]
  severity: integer('severity').notNull(), // 1-10 scale

  // Temperature tracking
  has_fever: boolean('has_fever').notNull().default(false),
  temperature_celsius: real('temperature_celsius'), // Body temperature

  // Timeline
  first_symptoms_at: timestamp('first_symptoms_at').notNull(), // When first noticed
  became_sick_at: timestamp('became_sick_at'), // When fully symptomatic
  recovered_at: timestamp('recovered_at'), // When recovered

  // MCAS impact
  mcas_flare_during_illness: boolean('mcas_flare_during_illness').notNull().default(false),
  mcas_severity_increase: integer('mcas_severity_increase'), // 1-10 scale of how much worse MCAS got

  // Treatment
  treatments_taken: jsonb('treatments_taken').$type<string[]>(), // Medications/remedies taken

  // Context
  suspected_source: varchar('suspected_source', { length: 255 }), // e.g., "From kids", "After shopping"
  notes: text('notes'),

  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow()
}, (table) => ({
  userIdIdx: index('illness_entries_user_id_idx').on(table.user_id),
  illnessTypeIdx: index('illness_entries_illness_type_idx').on(table.illness_type),
  statusIdx: index('illness_entries_status_idx').on(table.status),
  firstSymptomsIdx: index('illness_entries_first_symptoms_idx').on(table.first_symptoms_at),
  userTimeIdx: index('illness_entries_user_time_idx').on(table.user_id, table.first_symptoms_at)
}));

// Meal Entries table - Track complete meals with multiple foods
export const mealEntries = pgTable('meal_entries', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

  // Meal classification
  meal_type: mealTypeEnum('meal_type').notNull(),
  meal_name: varchar('meal_name', { length: 255 }), // Optional name like "Pasta carbonara"

  // Timing - Critical for MCAS correlation
  consumed_at: timestamp('consumed_at').notNull(),

  // DAO supplement tracking (important for MCAS)
  dao_taken_before: boolean('dao_taken_before').notNull().default(false),

  // Context
  location: varchar('location', { length: 255 }), // e.g., "Hjemme", "Restaurant"
  notes: text('notes'),

  // Immediate reaction tracking
  immediate_reaction: boolean('immediate_reaction').notNull().default(false),
  reaction_description: text('reaction_description'),

  // AI-calculated fields (updated by background processes)
  total_histamine_load: real('total_histamine_load'), // Sum of all foods
  total_trigger_score: real('total_trigger_score'), // 0-1 combined risk score

  created_at: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  userIdIdx: index('meal_entries_user_id_idx').on(table.user_id),
  mealTypeIdx: index('meal_entries_meal_type_idx').on(table.meal_type),
  consumedAtIdx: index('meal_entries_consumed_at_idx').on(table.consumed_at),
  userConsumedIdx: index('meal_entries_user_consumed_idx').on(table.user_id, table.consumed_at)
}));

// Meal Foods junction table - Links meals to foods with portions
export const mealFoods = pgTable('meal_foods', {
  id: serial('id').primaryKey(),
  meal_id: integer('meal_id').notNull().references(() => mealEntries.id, { onDelete: 'cascade' }),
  food_id: integer('food_id').notNull().references(() => foods.id),

  // Portion details
  amount: real('amount').notNull(), // grams
  preparation_method: varchar('preparation_method', { length: 100 }), // e.g., "Raw", "Cooked", "Fried"

  created_at: timestamp('created_at').notNull().defaultNow()
}, (table) => ({
  mealIdIdx: index('meal_foods_meal_id_idx').on(table.meal_id),
  foodIdIdx: index('meal_foods_food_id_idx').on(table.food_id)
}));

// Note: Zod validation schemas will be added when drizzle-zod compatibility is resolved

// Export all table types for use in services
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Food = typeof foods.$inferSelect;
export type NewFood = typeof foods.$inferInsert;
export type PersonalFoodRating = typeof personalFoodRatings.$inferSelect;
export type NewPersonalFoodRating = typeof personalFoodRatings.$inferInsert;
export type SymptomTemplate = typeof symptomTemplates.$inferSelect;
export type NewSymptomTemplate = typeof symptomTemplates.$inferInsert;
export type SymptomEntry = typeof symptomEntries.$inferSelect;
export type NewSymptomEntry = typeof symptomEntries.$inferInsert;
export type SavedRecipe = typeof savedRecipes.$inferSelect;
export type NewSavedRecipe = typeof savedRecipes.$inferInsert;
export type MedicationCatalog = typeof medicationsCatalog.$inferSelect;
export type NewMedicationCatalog = typeof medicationsCatalog.$inferInsert;
export type UserMedication = typeof userMedications.$inferSelect;
export type NewUserMedication = typeof userMedications.$inferInsert;
export type ActivityEntry = typeof activityEntries.$inferSelect;
export type NewActivityEntry = typeof activityEntries.$inferInsert;
export type IllnessEntry = typeof illnessEntries.$inferSelect;
export type NewIllnessEntry = typeof illnessEntries.$inferInsert;
export type MealEntry = typeof mealEntries.$inferSelect;
export type NewMealEntry = typeof mealEntries.$inferInsert;
export type MealFood = typeof mealFoods.$inferSelect;
export type NewMealFood = typeof mealFoods.$inferInsert; 

