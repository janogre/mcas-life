/**
 * Run Recipe Migration Script
 * Creates the saved_recipes table
 */

import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🔄 Running recipe migration...');

    // Execute SQL directly - CREATE TABLE first
    console.log('Creating saved_recipes table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "saved_recipes" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "spoonacular_recipe_id" INTEGER NOT NULL,
        "recipe_data" JSONB NOT NULL,
        "mcas_score" REAL NOT NULL,
        "notes" TEXT NOT NULL DEFAULT '',
        "times_made" INTEGER NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes
    console.log('Creating indexes...');
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "saved_recipes_user_id_idx" ON "saved_recipes" ("user_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "saved_recipes_spoonacular_id_idx" ON "saved_recipes" ("spoonacular_recipe_id")`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "saved_recipes_mcas_score_idx" ON "saved_recipes" ("mcas_score")`);

    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS "saved_recipes_user_spoonacular_unique"
        ON "saved_recipes" ("user_id", "spoonacular_recipe_id")
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "saved_recipes_recipe_data_gin"
        ON "saved_recipes" USING GIN ("recipe_data")
    `);

    console.log('✅ Recipe migration completed successfully!');

    // Verify table was created
    const result = await db.execute(sql`
      SELECT COUNT(*) as count FROM saved_recipes
    `);

    console.log('✅ saved_recipes table verified, current rows:', result.rows[0]);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error);
  } finally {
    process.exit(0);
  }
}

runMigration();
