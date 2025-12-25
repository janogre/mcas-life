CREATE TYPE "public"."meal_type" AS ENUM('breakfast', 'lunch', 'dinner', 'snack', 'other');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"meal_type" "meal_type" NOT NULL,
	"meal_name" varchar(255),
	"consumed_at" timestamp NOT NULL,
	"dao_taken_before" boolean DEFAULT false NOT NULL,
	"location" varchar(255),
	"notes" text,
	"immediate_reaction" boolean DEFAULT false NOT NULL,
	"reaction_description" text,
	"total_histamine_load" real,
	"total_trigger_score" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "meal_foods" (
	"id" serial PRIMARY KEY NOT NULL,
	"meal_id" integer NOT NULL,
	"food_id" integer NOT NULL,
	"amount" real NOT NULL,
	"preparation_method" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meal_entries" ADD CONSTRAINT "meal_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meal_foods" ADD CONSTRAINT "meal_foods_meal_id_meal_entries_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meal_entries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "meal_foods" ADD CONSTRAINT "meal_foods_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meal_entries_user_id_idx" ON "meal_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meal_entries_meal_type_idx" ON "meal_entries" USING btree ("meal_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meal_entries_consumed_at_idx" ON "meal_entries" USING btree ("consumed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meal_entries_user_consumed_idx" ON "meal_entries" USING btree ("user_id","consumed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meal_foods_meal_id_idx" ON "meal_foods" USING btree ("meal_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "meal_foods_food_id_idx" ON "meal_foods" USING btree ("food_id");