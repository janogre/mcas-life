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

// Users table - Core user management
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  
  // Authentication
  email: varchar('email', { length: 255 }).notNull().unique(),
  username: varchar('username', { length: 100 }).notNull().unique(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  
  // Personal information
  first_name: varchar('first_name', { length: 100 }),
  last_name: varchar('last_name', { length: 100 }),
  date_of_birth: date('date_of_birth'),
  gender: varchar('gender', { length: 30 }),
  
  // Location and preferences
  country: varchar('country', { length: 2 }), // ISO 3166-1 alpha-2
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
  source: varchar('source', { length: 20 }).notNull().default('sighi'), // sighi, community, fooddata, openfoodfacts
  
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
  
  // Treatment information
  treatment_taken: text('treatment_taken'),
  treatment_effective: boolean('treatment_effective'),
  
  // AI-calculated correlation data (updated by background analysis)
  correlation_score: real('correlation_score'), // 0-1 probability this was triggered by recent foods
  likely_food_triggers: jsonb('likely_food_triggers').$type<number[]>(), // food_ids with highest correlation
  
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

// Daily health metrics for pattern recognition
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
  id: varchar('id', { length: 128 }).primaryKey(), // Session token
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
  foodDiaryEntries: many(foodDiaryEntries),
  symptomEntries: many(symptomEntries),
  healthMetrics: many(healthMetrics),
  supplementEntries: many(supplementEntries),
  triggerAnalyses: many(triggerAnalyses),
  sessions: many(userSessions)
}));

export const foodsRelations = relations(foods, ({ many }) => ({
  approvedFoods: many(approvedFoods),
  foodDiaryEntries: many(foodDiaryEntries)
}));

export const symptomEntriesRelations = relations(symptomEntries, ({ one, many }) => ({
  user: one(users, {
    fields: [symptomEntries.user_id],
    references: [users.id]
  }),
  triggerAnalyses: many(triggerAnalyses)
}));

// Note: Zod validation schemas will be added when drizzle-zod compatibility is resolved

// Export all table types for use in services
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Food = typeof foods.$inferSelect;
export type NewFood = typeof foods.$inferInsert;
export type SymptomEntry = typeof symptomEntries.$inferSelect;
export type NewSymptomEntry = typeof symptomEntries.$inferInsert;