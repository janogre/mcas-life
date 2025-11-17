CREATE TABLE IF NOT EXISTS "personal_food_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"food_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"personal_rating" "food_compatibility" NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "health_metrics" ADD COLUMN "dao_supplement_taken" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "health_metrics" ADD COLUMN "compression_worn" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "health_metrics" ADD COLUMN "sensory_environment_controlled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "health_metrics" ADD COLUMN "physical_activity_level" integer;--> statement-breakpoint
ALTER TABLE "health_metrics" ADD COLUMN "weather_temperature" real;--> statement-breakpoint
ALTER TABLE "health_metrics" ADD COLUMN "weather_humidity" integer;--> statement-breakpoint
ALTER TABLE "health_metrics" ADD COLUMN "weather_barometric_pressure" real;--> statement-breakpoint
ALTER TABLE "health_metrics" ADD COLUMN "infection_symptoms" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "health_metrics" ADD COLUMN "incubating_illness" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "health_metrics" ADD COLUMN "menstrual_cycle_day" integer;--> statement-breakpoint
ALTER TABLE "health_metrics" ADD COLUMN "perimenopause_symptoms" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "health_metrics" ADD COLUMN "had_reactions_yesterday" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "health_metrics" ADD COLUMN "physical_activity_yesterday" integer;--> statement-breakpoint
ALTER TABLE "health_metrics" ADD COLUMN "fatigue_level_yesterday" integer;--> statement-breakpoint
ALTER TABLE "health_metrics" ADD COLUMN "stress_level_yesterday" integer;--> statement-breakpoint
ALTER TABLE "health_metrics" ADD COLUMN "ate_heavy_food" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "health_metrics" ADD COLUMN "current_concerns" text;--> statement-breakpoint
ALTER TABLE "health_metrics" ADD COLUMN "controlled_stimuli" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "health_metrics" ADD COLUMN "physically_tired_when_eating" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "health_metrics" ADD COLUMN "psychologically_tired_when_eating" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "health_metrics" ADD COLUMN "cumulative_stress_score" integer;--> statement-breakpoint
ALTER TABLE "health_metrics" ADD COLUMN "reaction_risk_level" integer;--> statement-breakpoint
ALTER TABLE "symptom_entries" ADD COLUMN "dao_taken_before_meal" boolean;--> statement-breakpoint
ALTER TABLE "symptom_entries" ADD COLUMN "sensory_environment_calm" boolean;--> statement-breakpoint
ALTER TABLE "symptom_entries" ADD COLUMN "compression_worn_during_day" boolean;--> statement-breakpoint
ALTER TABLE "symptom_entries" ADD COLUMN "physical_fatigue_level" integer;--> statement-breakpoint
ALTER TABLE "symptom_entries" ADD COLUMN "psychological_fatigue_level" integer;--> statement-breakpoint
ALTER TABLE "symptom_entries" ADD COLUMN "time_since_last_meal_minutes" integer;--> statement-breakpoint
ALTER TABLE "symptom_entries" ADD COLUMN "had_heavy_food_today" boolean;--> statement-breakpoint
ALTER TABLE "symptom_entries" ADD COLUMN "current_stress_factors" jsonb;--> statement-breakpoint
ALTER TABLE "symptom_entries" ADD COLUMN "weather_conditions" jsonb;--> statement-breakpoint
ALTER TABLE "symptom_entries" ADD COLUMN "menstrual_cycle_phase" varchar(20);--> statement-breakpoint
ALTER TABLE "symptom_entries" ADD COLUMN "sleep_quality_last_night" integer;--> statement-breakpoint
ALTER TABLE "symptom_entries" ADD COLUMN "reactions_in_last_24h" integer;--> statement-breakpoint
ALTER TABLE "symptom_entries" ADD COLUMN "cumulative_day_stress" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "personal_food_ratings" ADD CONSTRAINT "personal_food_ratings_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "personal_food_ratings" ADD CONSTRAINT "personal_food_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "personal_food_ratings_food_user_idx" ON "personal_food_ratings" USING btree ("food_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "personal_food_ratings_food_idx" ON "personal_food_ratings" USING btree ("food_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "personal_food_ratings_user_idx" ON "personal_food_ratings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "personal_food_ratings_rating_idx" ON "personal_food_ratings" USING btree ("personal_rating");