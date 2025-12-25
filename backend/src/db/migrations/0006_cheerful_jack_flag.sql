CREATE TYPE "public"."medication_type" AS ENUM('mcas', 'prescription', 'over_counter', 'supplement');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medications_catalog" (
	"id" serial PRIMARY KEY NOT NULL,
	"fest_id" varchar(100),
	"varenummer" varchar(20),
	"name" varchar(500) NOT NULL,
	"active_substance" varchar(500),
	"atc_code" varchar(20),
	"form" varchar(200),
	"strength" varchar(200),
	"manufacturer" varchar(255),
	"prescription_required" boolean DEFAULT true NOT NULL,
	"approved" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"search_vector" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "medications_catalog_fest_id_unique" UNIQUE("fest_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "saved_recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"spoonacular_recipe_id" integer NOT NULL,
	"recipe_data" jsonb NOT NULL,
	"mcas_score" real NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"times_made" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_medications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"catalog_medication_id" integer,
	"custom_name" varchar(255),
	"medication_type" "medication_type" DEFAULT 'mcas' NOT NULL,
	"dosage" varchar(100),
	"dosage_unit" varchar(50),
	"time_taken" timestamp NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "display_name_en" varchar(255);--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "display_name_no" varchar(255);--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "sighi_uncertainty_level" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "saved_recipes" ADD CONSTRAINT "saved_recipes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_medications" ADD CONSTRAINT "user_medications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_medications" ADD CONSTRAINT "user_medications_catalog_medication_id_medications_catalog_id_fk" FOREIGN KEY ("catalog_medication_id") REFERENCES "public"."medications_catalog"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medications_catalog_name_idx" ON "medications_catalog" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medications_catalog_substance_idx" ON "medications_catalog" USING btree ("active_substance");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "medications_catalog_atc_idx" ON "medications_catalog" USING btree ("atc_code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "medications_catalog_fest_id_idx" ON "medications_catalog" USING btree ("fest_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saved_recipes_user_id_idx" ON "saved_recipes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saved_recipes_spoonacular_id_idx" ON "saved_recipes" USING btree ("spoonacular_recipe_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "saved_recipes_user_spoonacular_unique" ON "saved_recipes" USING btree ("user_id","spoonacular_recipe_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "saved_recipes_mcas_score_idx" ON "saved_recipes" USING btree ("mcas_score");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_medications_user_id_idx" ON "user_medications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_medications_time_taken_idx" ON "user_medications" USING btree ("time_taken");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_medications_catalog_id_idx" ON "user_medications" USING btree ("catalog_medication_id");