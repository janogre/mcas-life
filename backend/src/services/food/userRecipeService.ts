/**
 * User Recipe Service - Custom user-created recipes with MCAS scoring
 *
 * Allows users to create their own recipes with automatic MCAS analysis:
 * - MCAS score calculation (0-100)
 * - Histamine load estimation
 * - Trigger warning extraction
 * - Portion calculation for meal logging
 */

import { eq, and, desc, asc } from 'drizzle-orm';
import { db } from '../../db/connection.js';
import { userRecipes, foods } from '../../db/schema.js';
import type { UserRecipe, NewUserRecipe } from '../../db/schema.js';

// Types
export interface RecipeIngredient {
  food_id: number;
  amount: number;
  unit: string;
  custom_name?: string;
}

export interface CreateRecipeInput {
  title: string;
  description?: string;
  prep_time_minutes?: number;
  servings: number;
  ingredients: RecipeIngredient[];
  instructions?: string;
  notes?: string;
}

export interface UpdateRecipeInput {
  title?: string;
  description?: string;
  prep_time_minutes?: number;
  servings?: number;
  ingredients?: RecipeIngredient[];
  instructions?: string;
  notes?: string;
}

export interface McasScoreResult {
  score: number; // 0-100
  safetyLevel: 'safe' | 'caution' | 'risky' | 'unsafe';
  triggerWarnings: string[];
  histamineLoad: number;
}

export interface PortionIngredient {
  food_id: number;
  amount: number;
  unit: string;
  custom_name?: string;
  food?: any; // Food details
}

export interface RecipeListOptions {
  sortBy?: 'created_at' | 'times_made' | 'mcas_score';
  order?: 'asc' | 'desc';
}

export class UserRecipeService {

  /**
   * Create new user recipe with automatic MCAS calculation
   */
  async createRecipe(userId: number, data: CreateRecipeInput): Promise<UserRecipe> {
    // Calculate MCAS score and analysis
    const mcasAnalysis = await this.calculateRecipeMcasScore(data.ingredients);

    // Explicitly serialize ingredients to prevent Drizzle JSONB field loss
    // This ensures custom_name is preserved and food_id stays snake_case
    const serializedIngredients = data.ingredients.map(ing => ({
      food_id: ing.food_id,
      amount: ing.amount,
      unit: ing.unit,
      custom_name: ing.custom_name || null
    }));

    console.log('🔵 Creating recipe with ingredients:', JSON.stringify(serializedIngredients, null, 2));

    // Insert recipe
    const [recipe] = await db
      .insert(userRecipes)
      .values({
        user_id: userId,
        title: data.title,
        description: data.description ?? null,
        prep_time_minutes: data.prep_time_minutes ?? null,
        servings: data.servings,
        ingredients: serializedIngredients as any,
        instructions: data.instructions ?? null,
        notes: data.notes ?? null,
        calculated_mcas_score: mcasAnalysis.score,
        calculated_histamine_load: mcasAnalysis.histamineLoad ?? null,
        trigger_warnings: mcasAnalysis.triggerWarnings as any,
        safety_level: mcasAnalysis.safetyLevel,
        times_made: 0,
        is_public: false
      })
      .returning();

    if (!recipe) {
      throw new Error('Failed to create recipe');
    }

    console.log('🟢 Recipe created with ingredients:', JSON.stringify(recipe.ingredients, null, 2));

    return recipe;
  }

  /**
   * Get user's recipes with optional sorting
   */
  async getUserRecipes(userId: number, options?: RecipeListOptions): Promise<UserRecipe[]> {
    const { sortBy = 'created_at', order = 'desc' } = options || {};

    const orderFn = order === 'asc' ? asc : desc;

    let orderByColumn;
    switch (sortBy) {
      case 'times_made':
        orderByColumn = orderFn(userRecipes.times_made);
        break;
      case 'mcas_score':
        orderByColumn = orderFn(userRecipes.calculated_mcas_score);
        break;
      case 'created_at':
      default:
        orderByColumn = orderFn(userRecipes.created_at);
        break;
    }

    const recipes = await db
      .select()
      .from(userRecipes)
      .where(eq(userRecipes.user_id, userId))
      .orderBy(orderByColumn);

    // Transform all recipes' ingredients from camelCase back to snake_case
    return recipes.map(recipe => ({
      ...recipe,
      ingredients: recipe.ingredients.map((ing: any) => ({
        food_id: ing.foodId || ing.food_id,
        amount: ing.amount,
        unit: ing.unit,
        custom_name: ing.customName || ing.custom_name
      }))
    }));
  }

  /**
   * Get single recipe by ID
   */
  async getRecipeById(userId: number, recipeId: number): Promise<UserRecipe | null> {
    const [recipe] = await db
      .select()
      .from(userRecipes)
      .where(
        and(
          eq(userRecipes.id, recipeId),
          eq(userRecipes.user_id, userId)
        )
      )
      .limit(1);

    if (!recipe) return null;

    // Transform ingredients from camelCase (Drizzle JSONB) back to snake_case
    return {
      ...recipe,
      ingredients: recipe.ingredients.map((ing: any) => ({
        food_id: ing.foodId || ing.food_id,
        amount: ing.amount,
        unit: ing.unit,
        custom_name: ing.customName || ing.custom_name
      }))
    };
  }

  /**
   * Update recipe and recalculate MCAS score
   */
  async updateRecipe(
    userId: number,
    recipeId: number,
    updates: UpdateRecipeInput
  ): Promise<UserRecipe> {
    // Get existing recipe
    const existing = await this.getRecipeById(userId, recipeId);
    if (!existing) {
      throw new Error('Recipe not found');
    }

    // Prepare update values
    const updateValues: Partial<NewUserRecipe> = {
      ...updates,
      updated_at: new Date()
    };

    // Recalculate MCAS if ingredients changed
    if (updates.ingredients) {
      const mcasAnalysis = await this.calculateRecipeMcasScore(updates.ingredients);

      // Explicitly serialize ingredients to prevent field loss
      const serializedIngredients = updates.ingredients.map(ing => ({
        food_id: ing.food_id,
        amount: ing.amount,
        unit: ing.unit,
        custom_name: ing.custom_name || null
      }));

      updateValues.calculated_mcas_score = mcasAnalysis.score;
      updateValues.calculated_histamine_load = mcasAnalysis.histamineLoad;
      updateValues.trigger_warnings = mcasAnalysis.triggerWarnings as any;
      updateValues.safety_level = mcasAnalysis.safetyLevel;
      updateValues.ingredients = serializedIngredients as any;
    }

    // Update in database
    const [updatedRecipe] = await db
      .update(userRecipes)
      .set(updateValues)
      .where(
        and(
          eq(userRecipes.id, recipeId),
          eq(userRecipes.user_id, userId)
        )
      )
      .returning();

    if (!updatedRecipe) {
      throw new Error('Failed to update recipe');
    }

    return updatedRecipe;
  }

  /**
   * Delete recipe
   */
  async deleteRecipe(userId: number, recipeId: number): Promise<boolean> {
    const result = await db
      .delete(userRecipes)
      .where(
        and(
          eq(userRecipes.id, recipeId),
          eq(userRecipes.user_id, userId)
        )
      )
      .returning();

    return result.length > 0;
  }

  /**
   * Increment times_made counter
   */
  async incrementTimesMade(userId: number, recipeId: number): Promise<void> {
    const recipe = await this.getRecipeById(userId, recipeId);
    if (!recipe) {
      throw new Error('Recipe not found');
    }

    await db
      .update(userRecipes)
      .set({
        times_made: recipe.times_made + 1,
        last_made_at: new Date()
      })
      .where(
        and(
          eq(userRecipes.id, recipeId),
          eq(userRecipes.user_id, userId)
        )
      );
  }

  /**
   * Calculate per-portion ingredient amounts
   */
  calculatePortionIngredients(
    recipe: UserRecipe,
    portionsConsumed: number
  ): PortionIngredient[] {
    const portionRatio = portionsConsumed / recipe.servings;

    return recipe.ingredients.map(ingredient => ({
      food_id: ingredient.food_id,
      amount: ingredient.amount * portionRatio,
      unit: ingredient.unit,
      custom_name: ingredient.custom_name ?? undefined
    }));
  }

  /**
   * Calculate MCAS score for recipe ingredients
   * Reuses logic from recipeService.ts
   */
  private async calculateRecipeMcasScore(ingredients: RecipeIngredient[]): Promise<McasScoreResult> {
    let score = 100;
    const triggerWarnings: string[] = [];
    let totalHistamine = 0;

    // Analyze each ingredient
    for (const ingredient of ingredients) {
      const [food] = await db
        .select()
        .from(foods)
        .where(eq(foods.id, ingredient.food_id))
        .limit(1);

      if (!food) continue;

      // Deduct points based on SIGHI compatibility (stored as string '0'-'3')
      const compatibilityLevel = parseInt(food.compatibility, 10);
      if (compatibilityLevel >= 2) {
        score -= 20; // Risky ingredient

        // Extract triggers
        if (food.triggers && Array.isArray(food.triggers)) {
          for (const trigger of food.triggers) {
            const warning = this.getTriggerWarning(trigger, food.name_no);
            if (warning) {
              triggerWarnings.push(warning);
              score -= 15; // Deduct for each trigger
            }
          }
        }
      }

      // Estimate histamine load from biogenic amines
      if (food.biogenic_amines && typeof food.biogenic_amines === 'object') {
        const amines = food.biogenic_amines as any;
        const histamine = parseFloat(amines.histamine || 0);
        if (histamine > 0) {
          // Normalize to 100g and scale by ingredient amount
          const amountInGrams = this.convertToGrams(ingredient.amount, ingredient.unit);
          totalHistamine += (histamine / 100) * amountInGrams;
        }
      }
    }

    // Ensure score is between 0 and 100
    score = Math.max(0, Math.min(100, score));

    // Determine safety level
    let safetyLevel: 'safe' | 'caution' | 'risky' | 'unsafe';
    if (score >= 80) safetyLevel = 'safe';
    else if (score >= 60) safetyLevel = 'caution';
    else if (score >= 40) safetyLevel = 'risky';
    else safetyLevel = 'unsafe';

    return {
      score,
      safetyLevel,
      triggerWarnings,
      histamineLoad: totalHistamine
    };
  }

  /**
   * Get human-readable trigger warning (Norwegian)
   */
  private getTriggerWarning(trigger: string, foodName: string): string | null {
    const triggerDescriptions: Record<string, string> = {
      'H': `${foodName} inneholder høyt histamin`,
      'H!': `${foodName} er lett bedervelig (rask histamindannelse)`,
      'A': `${foodName} inneholder andre biogene aminer`,
      'L': `${foodName} er histaminliberator (utløser mastceller)`,
      'B': `${foodName} blokkerer DAO-enzym (histaminnedbrytning)`,
      'S': `${foodName} inneholder svovel`,
      'T': `${foodName} inneholder tyramin`,
      'P': `${foodName} inneholder fenylethylamin`,
      'N': `${foodName} inneholder nitritt/nitrat`,
      'D': `${foodName} inneholder salicylat`,
      'C': `${foodName} inneholder koffein`
    };

    return triggerDescriptions[trigger] || null;
  }

  /**
   * Convert ingredient amount to grams for histamine calculation
   */
  private convertToGrams(amount: number, unit: string): number {
    const conversionFactors: Record<string, number> = {
      'g': 1,
      'kg': 1000,
      'ml': 1, // Approximation: 1ml ≈ 1g for most liquids
      'dl': 100,
      'l': 1000,
      'stk': 100, // Approximation: 1 piece ≈ 100g
      'ss': 15, // Tablespoon ≈ 15g
      'ts': 5, // Teaspoon ≈ 5g
      'kopp': 240 // Cup ≈ 240g
    };

    return amount * (conversionFactors[unit] || 1);
  }
}

export const userRecipeService = new UserRecipeService();
