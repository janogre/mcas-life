ALTER TYPE "public"."food_compatibility" ADD VALUE '3';--> statement-breakpoint
ALTER TABLE "approved_foods" ADD COLUMN "times_consumed" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "approved_foods" ADD COLUMN "avg_reaction_score" real DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "approved_foods" ADD COLUMN "last_consumed" timestamp DEFAULT now() NOT NULL;