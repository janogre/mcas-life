CREATE TYPE "public"."capture_method" AS ENUM('quick', 'detailed', 'retrospective');--> statement-breakpoint
CREATE TYPE "public"."enrichment_status" AS ENUM('minimal', 'partial', 'complete');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "symptom_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" "symptom_category" NOT NULL,
	"name_no" varchar(100) NOT NULL,
	"name_en" varchar(100) NOT NULL,
	"icon" varchar(50),
	"severity_label_low_no" varchar(50) DEFAULT 'Umerkelig' NOT NULL,
	"severity_label_mid_no" varchar(50) DEFAULT 'Merkbar' NOT NULL,
	"severity_label_high_no" varchar(50) DEFAULT 'Utålelig' NOT NULL,
	"follow_up_questions" jsonb,
	"common_body_regions" jsonb,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"setting_key" varchar(100) NOT NULL,
	"setting_value" text,
	"encrypted" boolean DEFAULT false NOT NULL,
	"description" text,
	"updated_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_settings_setting_key_unique" UNIQUE("setting_key")
);
--> statement-breakpoint
ALTER TABLE "user_sessions" ALTER COLUMN "id" SET DATA TYPE varchar(512);--> statement-breakpoint
ALTER TABLE "symptom_entries" ADD COLUMN "indoor_air_quality" jsonb;--> statement-breakpoint
ALTER TABLE "symptom_entries" ADD COLUMN "room_locations" jsonb;--> statement-breakpoint
ALTER TABLE "symptom_entries" ADD COLUMN "capture_method" "capture_method" DEFAULT 'quick' NOT NULL;--> statement-breakpoint
ALTER TABLE "symptom_entries" ADD COLUMN "enrichment_status" "enrichment_status" DEFAULT 'minimal' NOT NULL;--> statement-breakpoint
ALTER TABLE "symptom_entries" ADD COLUMN "follow_up_completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "latitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "longitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "airthings_access_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "airthings_refresh_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "airthings_token_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "airthings_connected" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "symptom_templates_category_idx" ON "symptom_templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "symptom_templates_active_idx" ON "symptom_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "symptom_templates_order_idx" ON "symptom_templates" USING btree ("display_order");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "system_settings_key_idx" ON "system_settings" USING btree ("setting_key");