CREATE TYPE "public"."illness_status" AS ENUM('incubating', 'active', 'recovering', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."illness_type" AS ENUM('cold', 'flu', 'infection', 'stomach_bug', 'fever', 'other');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "illness_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"illness_type" "illness_type" NOT NULL,
	"custom_illness_name" varchar(255),
	"status" "illness_status" DEFAULT 'incubating' NOT NULL,
	"symptoms" jsonb,
	"severity" integer NOT NULL,
	"has_fever" boolean DEFAULT false NOT NULL,
	"temperature_celsius" real,
	"first_symptoms_at" timestamp NOT NULL,
	"became_sick_at" timestamp,
	"recovered_at" timestamp,
	"mcas_flare_during_illness" boolean DEFAULT false NOT NULL,
	"mcas_severity_increase" integer,
	"treatments_taken" jsonb,
	"suspected_source" varchar(255),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "illness_entries" ADD CONSTRAINT "illness_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "illness_entries_user_id_idx" ON "illness_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "illness_entries_illness_type_idx" ON "illness_entries" USING btree ("illness_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "illness_entries_status_idx" ON "illness_entries" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "illness_entries_first_symptoms_idx" ON "illness_entries" USING btree ("first_symptoms_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "illness_entries_user_time_idx" ON "illness_entries" USING btree ("user_id","first_symptoms_at");