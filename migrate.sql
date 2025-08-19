CREATE TYPE "public"."account_status" AS ENUM('active', 'suspended', 'deleted');
CREATE TYPE "public"."food_compatibility" AS ENUM('0', '1', '2');
CREATE TYPE "public"."mcas_severity" AS ENUM('mild', 'moderate', 'severe', 'unknown');
CREATE TYPE "public"."subscription_tier" AS ENUM('free', 'premium', 'professional');
CREATE TYPE "public"."supplement_type" AS ENUM('antihistamine', 'mast_cell_stabilizer', 'dao_supplement', 'probiotic', 'vitamin', 'mineral', 'herbal', 'prescription', 'other');
CREATE TYPE "public"."symptom_category" AS ENUM('skin', 'digestive', 'respiratory', 'cardiovascular', 'neurological', 'musculoskeletal', 'genitourinary', 'systemic');
CREATE TYPE "public"."user_role" AS ENUM('patient', 'expert', 'researcher', 'admin');

-- Drop existing incomplete tables
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS mcas_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

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

CREATE TABLE IF NOT EXISTS "user_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"notification_preferences" jsonb NOT NULL,
	"privacy_settings" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign keys
ALTER TABLE "mcas_profiles" ADD CONSTRAINT "mcas_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;