CREATE TYPE "public"."activity_type" AS ENUM('temperature_change', 'social_trigger', 'physical_activity');--> statement-breakpoint
CREATE TYPE "public"."physical_intensity" AS ENUM('light', 'moderate', 'intense');--> statement-breakpoint
CREATE TYPE "public"."temperature_change_type" AS ENUM('hot_to_cold', 'cold_to_hot');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activity_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"activity_type" "activity_type" NOT NULL,
	"temperature_change_type" "temperature_change_type",
	"temperature_from" real,
	"temperature_to" real,
	"social_trigger_type" varchar(100),
	"estimated_people_count" integer,
	"noise_level" integer,
	"physical_activity_type" varchar(100),
	"intensity" "physical_intensity",
	"duration_minutes" integer,
	"time_started" timestamp NOT NULL,
	"time_ended" timestamp,
	"location_description" varchar(255),
	"notes" text,
	"immediate_symptoms" boolean DEFAULT false NOT NULL,
	"symptom_description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activity_entries" ADD CONSTRAINT "activity_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_entries_user_id_idx" ON "activity_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_entries_activity_type_idx" ON "activity_entries" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_entries_time_started_idx" ON "activity_entries" USING btree ("time_started");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activity_entries_user_time_idx" ON "activity_entries" USING btree ("user_id","time_started");