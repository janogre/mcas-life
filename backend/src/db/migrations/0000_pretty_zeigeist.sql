CREATE TYPE "public"."account_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."food_compatibility" AS ENUM('0', '1', '2');--> statement-breakpoint
CREATE TYPE "public"."mcas_severity" AS ENUM('mild', 'moderate', 'severe', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."subscription_tier" AS ENUM('free', 'premium', 'professional');--> statement-breakpoint
CREATE TYPE "public"."supplement_type" AS ENUM('antihistamine', 'mast_cell_stabilizer', 'dao_supplement', 'probiotic', 'vitamin', 'mineral', 'herbal', 'prescription', 'other');--> statement-breakpoint
CREATE TYPE "public"."symptom_category" AS ENUM('skin', 'digestive', 'respiratory', 'cardiovascular', 'neurological', 'musculoskeletal', 'genitourinary', 'systemic');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('patient', 'expert', 'researcher', 'admin');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "approved_foods" (
	"id" serial PRIMARY KEY NOT NULL,
	"food_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"personal_tolerance" "food_compatibility" NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"dosage_notes" text,
	"preparation_notes" text,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL,
	"contributor_name" varchar(100),
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "food_diary_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"food_id" integer NOT NULL,
	"amount" real NOT NULL,
	"preparation_method" varchar(100),
	"meal_type" varchar(20) NOT NULL,
	"consumed_at" timestamp NOT NULL,
	"notes" text,
	"estimated_histamine_load" real,
	"trigger_score" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "foods" (
	"id" serial PRIMARY KEY NOT NULL,
	"name_no" varchar(255) NOT NULL,
	"name_en" varchar(255) NOT NULL,
	"category" varchar(100) NOT NULL,
	"compatibility" "food_compatibility" NOT NULL,
	"triggers" jsonb NOT NULL,
	"remarks_no" text DEFAULT '' NOT NULL,
	"remarks_en" text DEFAULT '' NOT NULL,
	"biogenic_amines" jsonb,
	"nutrition_data" jsonb,
	"fooddata_dk_id" integer,
	"openfoodfacts_id" varchar(50),
	"verified" boolean DEFAULT false NOT NULL,
	"source" varchar(20) DEFAULT 'sighi' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "health_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"date" date NOT NULL,
	"sleep_hours" real,
	"sleep_quality" integer,
	"energy_level" integer,
	"overall_wellness" integer,
	"stress_level" integer,
	"mood_rating" integer,
	"anxiety_level" integer,
	"weight" real,
	"temperature" real,
	"blood_pressure_systolic" integer,
	"blood_pressure_diastolic" integer,
	"heart_rate" integer,
	"total_symptom_severity" integer,
	"symptom_count" integer,
	"trigger_exposure_count" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mcas_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"diagnosis_date" date,
	"severity" "mcas_severity" DEFAULT 'unknown' NOT NULL,
	"confirmed_by_doctor" boolean DEFAULT false NOT NULL,
	"comorbidities" jsonb,
	"current_medications" jsonb,
	"current_supplements" jsonb,
	"treatment_plan" text,
	"known_food_triggers" jsonb,
	"known_environmental_triggers" jsonb,
	"known_stress_triggers" jsonb,
	"histamine_tolerance_level" varchar(20) DEFAULT 'moderate' NOT NULL,
	"exercise_tolerance" varchar(20) DEFAULT 'moderate' NOT NULL,
	"stress_tolerance" varchar(20) DEFAULT 'moderate' NOT NULL,
	"emergency_contacts" jsonb,
	"allergic_to_medications" jsonb,
	"emergency_action_plan" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "supplement_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "supplement_type" NOT NULL,
	"brand" varchar(100),
	"dosage_amount" real NOT NULL,
	"dosage_unit" varchar(20) NOT NULL,
	"frequency" text NOT NULL,
	"taken_at" timestamp NOT NULL,
	"next_dose_due" timestamp,
	"intended_for" jsonb,
	"effectiveness_rating" integer,
	"side_effects" jsonb,
	"missed_dose" boolean DEFAULT false NOT NULL,
	"late_dose" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "symptom_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"category" "symptom_category" NOT NULL,
	"symptom_type" varchar(50) NOT NULL,
	"custom_description" text,
	"severity" integer NOT NULL,
	"duration_minutes" integer NOT NULL,
	"intensity_change" varchar(20) NOT NULL,
	"body_regions" jsonb NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp,
	"suspected_triggers" jsonb,
	"environmental_factors" jsonb,
	"treatment_taken" text,
	"treatment_effective" boolean,
	"correlation_score" real,
	"likely_food_triggers" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trigger_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"symptom_entry_id" integer NOT NULL,
	"analysis_window_start" timestamp NOT NULL,
	"analysis_window_end" timestamp NOT NULL,
	"likely_food_triggers" jsonb,
	"similar_past_episodes" jsonb,
	"improvement_suggestions" jsonb,
	"environmental_correlations" jsonb,
	"analysis_confidence" real NOT NULL,
	"data_quality_score" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"notification_preferences" jsonb NOT NULL,
	"privacy_settings" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_sessions" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"device_info" text NOT NULL,
	"ip_address" varchar(45) NOT NULL,
	"user_agent" text NOT NULL,
	"last_activity" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(100) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"date_of_birth" date,
	"gender" varchar(30),
	"country" varchar(2),
	"timezone" varchar(50) DEFAULT 'Europe/Oslo' NOT NULL,
	"language" varchar(2) DEFAULT 'no' NOT NULL,
	"role" "user_role" DEFAULT 'patient' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"account_status" "account_status" DEFAULT 'active' NOT NULL,
	"preferred_units" varchar(10) DEFAULT 'metric' NOT NULL,
	"dark_mode" boolean DEFAULT false NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"verified_professional" boolean DEFAULT false NOT NULL,
	"professional_credentials" text,
	"verification_date" timestamp,
	"last_login" timestamp,
	"total_logins" integer DEFAULT 0 NOT NULL,
	"days_active" integer DEFAULT 0 NOT NULL,
	"subscription_tier" "subscription_tier" DEFAULT 'free' NOT NULL,
	"subscription_expires" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "approved_foods" ADD CONSTRAINT "approved_foods_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "approved_foods" ADD CONSTRAINT "approved_foods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "food_diary_entries" ADD CONSTRAINT "food_diary_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "food_diary_entries" ADD CONSTRAINT "food_diary_entries_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "health_metrics" ADD CONSTRAINT "health_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mcas_profiles" ADD CONSTRAINT "mcas_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "supplement_entries" ADD CONSTRAINT "supplement_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "symptom_entries" ADD CONSTRAINT "symptom_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trigger_analyses" ADD CONSTRAINT "trigger_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trigger_analyses" ADD CONSTRAINT "trigger_analyses_symptom_entry_id_symptom_entries_id_fk" FOREIGN KEY ("symptom_entry_id") REFERENCES "public"."symptom_entries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "approved_foods_food_user_idx" ON "approved_foods" USING btree ("food_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approved_foods_food_idx" ON "approved_foods" USING btree ("food_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approved_foods_user_idx" ON "approved_foods" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approved_foods_public_idx" ON "approved_foods" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "approved_foods_tolerance_idx" ON "approved_foods" USING btree ("personal_tolerance");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "food_diary_user_idx" ON "food_diary_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "food_diary_food_idx" ON "food_diary_entries" USING btree ("food_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "food_diary_consumed_at_idx" ON "food_diary_entries" USING btree ("consumed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "food_diary_user_consumed_idx" ON "food_diary_entries" USING btree ("user_id","consumed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "food_diary_meal_type_idx" ON "food_diary_entries" USING btree ("meal_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "foods_name_no_idx" ON "foods" USING btree ("name_no");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "foods_name_en_idx" ON "foods" USING btree ("name_en");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "foods_category_idx" ON "foods" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "foods_compatibility_idx" ON "foods" USING btree ("compatibility");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "foods_source_idx" ON "foods" USING btree ("source");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "foods_fooddata_dk_id_idx" ON "foods" USING btree ("fooddata_dk_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "health_metrics_user_date_idx" ON "health_metrics" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_metrics_user_idx" ON "health_metrics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "health_metrics_date_idx" ON "health_metrics" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "mcas_profiles_user_id_idx" ON "mcas_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mcas_profiles_severity_idx" ON "mcas_profiles" USING btree ("severity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplement_entries_user_idx" ON "supplement_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplement_entries_type_idx" ON "supplement_entries" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplement_entries_taken_at_idx" ON "supplement_entries" USING btree ("taken_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplement_entries_user_taken_idx" ON "supplement_entries" USING btree ("user_id","taken_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "supplement_entries_name_idx" ON "supplement_entries" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "symptom_entries_user_idx" ON "symptom_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "symptom_entries_category_idx" ON "symptom_entries" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "symptom_entries_type_idx" ON "symptom_entries" USING btree ("symptom_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "symptom_entries_severity_idx" ON "symptom_entries" USING btree ("severity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "symptom_entries_started_at_idx" ON "symptom_entries" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "symptom_entries_user_started_idx" ON "symptom_entries" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "symptom_entries_correlation_idx" ON "symptom_entries" USING btree ("user_id","started_at","correlation_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trigger_analyses_user_idx" ON "trigger_analyses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trigger_analyses_symptom_idx" ON "trigger_analyses" USING btree ("symptom_entry_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trigger_analyses_window_idx" ON "trigger_analyses" USING btree ("analysis_window_start","analysis_window_end");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "trigger_analyses_confidence_idx" ON "trigger_analyses" USING btree ("analysis_confidence");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_preferences_user_id_idx" ON "user_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sessions_user_id_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sessions_expires_at_idx" ON "user_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sessions_active_idx" ON "user_sessions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_sessions_last_activity_idx" ON "user_sessions" USING btree ("last_activity");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_status_idx" ON "users" USING btree ("account_status");