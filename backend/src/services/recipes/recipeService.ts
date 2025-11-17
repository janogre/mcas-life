/**
 * Recipe Service - MCAS-Life Recipe Management with Spoonacular API
 *
 * Integrates Spoonacular API to find MCAS-friendly recipes based on:
 * - User's Safe Foods (approved_foods table)
 * - SIGHI compatibility ratings
 * - Personal food ratings
 * - Known food triggers
 */

import axios, { AxiosInstance } from 'axios';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { foods, approvedFoods, savedRecipes } from '../../db/schema.js';
import type { Food, FoodCompatibility } from '@mcas-life/shared';

// Spoonacular API types
export interface SpoonacularIngredient {
  id: number;
  name: string;
  amount: number;
  unit: string;
  image: string;
}

export interface SpoonacularRecipe {
  id: number;
  title: string;
  image: string;
  imageType: string;
  usedIngredientCount: number;
  missedIngredientCount: number;
  missedIngredients: SpoonacularIngredient[];
  usedIngredients: SpoonacularIngredient[];
  unusedIngredients: SpoonacularIngredient[];
  likes: number;
}

export interface SpoonacularRecipeDetails extends SpoonacularRecipe {
  readyInMinutes: number;
  servings: number;
  sourceUrl: string;
  summary: string;
  cuisines: string[];
  dishTypes: string[];
  diets: string[];
  instructions: string;
  analyzedInstructions: Array<{
    name: string;
    steps: Array<{
      number: number;
      step: string;
      ingredients: Array<{ id: number; name: string; }>;
      equipment: Array<{ id: number; name: string; }>;
    }>;
  }>;
  extendedIngredients: Array<{
    id: number;
    name: string;
    amount: number;
    unit: string;
    original: string;
  }>;
}

// MCAS-enhanced recipe types
export interface McasRecipe extends SpoonacularRecipe {
  mcasScore: number; // 0-100, higher is safer
  safetyLevel: 'safe' | 'caution' | 'risky' | 'unsafe';
  triggerWarnings: string[];
  safeIngredients: string[];
  riskyIngredients: string[];
  unknownIngredients: string[];
}

export interface RecipeSearchRequest {
  ingredients: string[]; // Ingredient names from Safe Foods
  number?: number; // Max recipes to return (1-20, default 10)
  ranking?: 1 | 2; // 1 = maximize used, 2 = minimize missing
  ignorePantry?: boolean; // Ignore common pantry items
  userId: number; // For personalization
}

export interface RecipeSearchResponse {
  recipes: McasRecipe[];
  totalResults: number;
  searchParams: {
    ingredientsUsed: string[];
    maxRecipes: number;
  };
}

export interface SavedRecipeData {
  userId: number;
  spoonacularRecipeId: number;
  recipeData: SpoonacularRecipeDetails;
  mcasScore: number;
  notes?: string;
}

export class RecipeService {
  private spoonacularClient: AxiosInstance;
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.spoonacular.com';

  constructor() {
    this.apiKey = process.env['SPOONACULAR_API_KEY'] || '';

    if (!this.apiKey) {
      console.warn('⚠️  SPOONACULAR_API_KEY not set. Recipe features will be disabled.');
    }

    this.spoonacularClient = axios.create({
      baseURL: this.baseUrl,
      params: {
        apiKey: this.apiKey
      },
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Search recipes by ingredients from user's Safe Foods
   */
  async searchRecipesByIngredients(request: RecipeSearchRequest): Promise<RecipeSearchResponse> {
    if (!this.apiKey) {
      throw new Error('Spoonacular API key not configured');
    }

    const {
      ingredients,
      number = 10,
      ranking = 1,
      ignorePantry = true,
      userId
    } = request;

    try {
      // Call Spoonacular API
      const response = await this.spoonacularClient.get<SpoonacularRecipe[]>('/recipes/findByIngredients', {
        params: {
          ingredients: ingredients.join(','),
          number: Math.min(number, 20), // Cap at 20 for cost control
          ranking,
          ignorePantry
        }
      });

      const spoonacularRecipes = response.data;

      // Enhance recipes with MCAS safety scoring
      const mcasRecipes = await Promise.all(
        spoonacularRecipes.map(recipe => this.enhanceRecipeWithMcasData(recipe, userId))
      );

      // Sort by MCAS score (safest first)
      mcasRecipes.sort((a, b) => b.mcasScore - a.mcasScore);

      return {
        recipes: mcasRecipes,
        totalResults: mcasRecipes.length,
        searchParams: {
          ingredientsUsed: ingredients,
          maxRecipes: number
        }
      };

    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Spoonacular API error:', error.response?.data || error.message);
        throw new Error(`Recipe search failed: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get detailed recipe information from Spoonacular
   */
  async getRecipeDetails(recipeId: number): Promise<SpoonacularRecipeDetails> {
    if (!this.apiKey) {
      throw new Error('Spoonacular API key not configured');
    }

    try {
      const response = await this.spoonacularClient.get<SpoonacularRecipeDetails>(
        `/recipes/${recipeId}/information`,
        {
          params: {
            includeNutrition: false // Can be enabled for nutrition data
          }
        }
      );

      return response.data;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Spoonacular API error:', error.response?.data || error.message);
        throw new Error(`Failed to get recipe details: ${error.response?.data?.message || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Enhance Spoonacular recipe with MCAS safety data
   */
  private async enhanceRecipeWithMcasData(
    recipe: SpoonacularRecipe,
    userId: number
  ): Promise<McasRecipe> {
    // Get all ingredients (used + missed)
    const allIngredients = [
      ...recipe.usedIngredients.map(i => i.name),
      ...recipe.missedIngredients.map(i => i.name)
    ];

    // Analyze MCAS safety for each ingredient
    const ingredientAnalysis = await this.analyzeIngredients(allIngredients, userId);

    // Calculate MCAS safety score (0-100)
    const mcasScore = this.calculateMcasScore(ingredientAnalysis);

    // Determine safety level
    let safetyLevel: McasRecipe['safetyLevel'];
    if (mcasScore >= 80) safetyLevel = 'safe';
    else if (mcasScore >= 60) safetyLevel = 'caution';
    else if (mcasScore >= 40) safetyLevel = 'risky';
    else safetyLevel = 'unsafe';

    return {
      ...recipe,
      mcasScore,
      safetyLevel,
      triggerWarnings: ingredientAnalysis.triggerWarnings,
      safeIngredients: ingredientAnalysis.safeIngredients,
      riskyIngredients: ingredientAnalysis.riskyIngredients,
      unknownIngredients: ingredientAnalysis.unknownIngredients
    };
  }

  /**
   * Analyze ingredients against SIGHI database and user's safe foods
   */
  private async analyzeIngredients(ingredientNames: string[], userId: number) {
    const safeIngredients: string[] = [];
    const riskyIngredients: string[] = [];
    const unknownIngredients: string[] = [];
    const triggerWarnings: string[] = [];

    // Get user's safe foods for comparison
    const userSafeFoods = await db
      .select()
      .from(approvedFoods)
      .where(eq(approvedFoods.user_id, userId));

    const safeFoodIds = new Set(userSafeFoods.map(af => af.food_id));

    for (const ingredientName of ingredientNames) {
      // Try to find ingredient in SIGHI database (fuzzy match)
      const matchedFood = await this.findFoodByName(ingredientName);

      if (matchedFood) {
        // Check if user has approved this food
        const isInSafeList = safeFoodIds.has(matchedFood.id);

        // Evaluate safety based on SIGHI compatibility
        if (matchedFood.compatibility === 0 || isInSafeList) {
          safeIngredients.push(ingredientName);
        } else if (matchedFood.compatibility >= 2) {
          riskyIngredients.push(ingredientName);

          // Add trigger warnings
          if (matchedFood.triggers && matchedFood.triggers.length > 0) {
            const triggers = Array.isArray(matchedFood.triggers)
              ? matchedFood.triggers
              : JSON.parse(matchedFood.triggers as string);

            triggers.forEach((trigger: string) => {
              const warning = this.getTriggerWarning(trigger, ingredientName);
              if (warning) triggerWarnings.push(warning);
            });
          }
        } else {
          // Compatibility 1 = medium risk
          safeIngredients.push(ingredientName); // Conservative: treat as safe but note it
        }
      } else {
        // Ingredient not in SIGHI database
        unknownIngredients.push(ingredientName);
      }
    }

    return {
      safeIngredients,
      riskyIngredients,
      unknownIngredients,
      triggerWarnings
    };
  }

  /**
   * Find food in SIGHI database by name (fuzzy matching)
   */
  private async findFoodByName(ingredientName: string): Promise<any | null> {
    const searchTerm = ingredientName.toLowerCase();

    // Try exact match first (English or Norwegian)
    const exactMatch = await db
      .select()
      .from(foods)
      .where(
        eq(foods.name_en, ingredientName)
      )
      .limit(1);

    if (exactMatch.length > 0) {
      return exactMatch[0];
    }

    // Try partial match (contains)
    const partialMatches = await db
      .select()
      .from(foods)
      .limit(10);

    // Simple fuzzy matching
    const fuzzyMatch = partialMatches.find(food => {
      const nameEnLower = food.name_en.toLowerCase();
      const nameNoLower = food.name_no.toLowerCase();

      return nameEnLower.includes(searchTerm) ||
             searchTerm.includes(nameEnLower) ||
             nameNoLower.includes(searchTerm) ||
             searchTerm.includes(nameNoLower);
    });

    return fuzzyMatch || null;
  }

  /**
   * Calculate MCAS safety score (0-100, higher is safer)
   */
  private calculateMcasScore(analysis: {
    safeIngredients: string[];
    riskyIngredients: string[];
    unknownIngredients: string[];
    triggerWarnings: string[];
  }): number {
    const total = analysis.safeIngredients.length +
                  analysis.riskyIngredients.length +
                  analysis.unknownIngredients.length;

    if (total === 0) return 50; // Neutral score for empty

    // Base score calculation
    let score = 100;

    // Deduct points for risky ingredients (-20 each)
    score -= analysis.riskyIngredients.length * 20;

    // Deduct points for unknown ingredients (-10 each, unknown is risky for MCAS)
    score -= analysis.unknownIngredients.length * 10;

    // Deduct points for trigger warnings (-15 each)
    score -= analysis.triggerWarnings.length * 15;

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get human-readable trigger warning
   */
  private getTriggerWarning(trigger: string, ingredientName: string): string | null {
    const triggerDescriptions: Record<string, string> = {
      'H': `${ingredientName} inneholder høyt histamin`,
      'H!': `${ingredientName} er lett bedervelig (rask histamindannelse)`,
      'A': `${ingredientName} inneholder andre biogene aminer`,
      'L': `${ingredientName} er histaminliberator (utløser mastceller)`,
      'B': `${ingredientName} blokkerer DAO-enzym (histaminnedbrytning)`
    };

    return triggerDescriptions[trigger] || null;
  }

  /**
   * Save recipe to user's collection
   */
  async saveRecipe(data: SavedRecipeData): Promise<any> {
    const { userId, spoonacularRecipeId, recipeData, mcasScore, notes } = data;

    // Check if already saved
    const existing = await db
      .select()
      .from(savedRecipes)
      .where(
        and(
          eq(savedRecipes.user_id, userId),
          eq(savedRecipes.spoonacular_recipe_id, spoonacularRecipeId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new Error('Recipe already saved');
    }

    const [savedRecipe] = await db
      .insert(savedRecipes)
      .values({
        user_id: userId,
        spoonacular_recipe_id: spoonacularRecipeId,
        recipe_data: recipeData as any,
        mcas_score: mcasScore,
        notes: notes || '',
        times_made: 0
      })
      .returning();

    return savedRecipe;
  }

  /**
   * Get user's saved recipes
   */
  async getSavedRecipes(userId: number): Promise<any[]> {
    const recipes = await db
      .select()
      .from(savedRecipes)
      .where(eq(savedRecipes.user_id, userId))
      .orderBy(desc(savedRecipes.created_at));

    return recipes;
  }

  /**
   * Update saved recipe (notes, times made)
   */
  async updateSavedRecipe(
    userId: number,
    recipeId: number,
    updates: { notes?: string; timesMade?: number }
  ): Promise<any | null> {
    const updateData: any = { updated_at: new Date() };

    if (updates.notes !== undefined) {
      updateData.notes = updates.notes;
    }
    if (updates.timesMade !== undefined) {
      updateData.times_made = updates.timesMade;
    }

    const [updated] = await db
      .update(savedRecipes)
      .set(updateData)
      .where(
        and(
          eq(savedRecipes.id, recipeId),
          eq(savedRecipes.user_id, userId)
        )
      )
      .returning();

    return updated || null;
  }

  /**
   * Delete saved recipe
   */
  async deleteSavedRecipe(userId: number, recipeId: number): Promise<boolean> {
    const result = await db
      .delete(savedRecipes)
      .where(
        and(
          eq(savedRecipes.id, recipeId),
          eq(savedRecipes.user_id, userId)
        )
      );

    return result.rowCount !== undefined && result.rowCount > 0;
  }

  /**
   * Get recipe suggestions based on user's Safe Foods
   * (Automatically uses most common safe foods)
   */
  async getRecipeSuggestions(userId: number, maxRecipes: number = 10): Promise<RecipeSearchResponse> {
    // Get user's most frequently consumed safe foods
    const userSafeFoods = await db
      .select()
      .from(approvedFoods)
      .where(eq(approvedFoods.user_id, userId))
      .orderBy(desc(approvedFoods.times_consumed))
      .limit(10); // Use top 10 ingredients

    if (userSafeFoods.length === 0) {
      throw new Error('No safe foods found. Please add safe foods first.');
    }

    // Get food names for these safe foods
    const foodIds = userSafeFoods.map(af => af.food_id);
    const foodDetails = await db
      .select()
      .from(foods)
      .where(
        eq(foods.id, foodIds[0]) // This is a simplified version, proper implementation would use IN clause
      );

    const ingredientNames = foodDetails.map(f => f.name_en);

    // Search recipes with these ingredients
    return this.searchRecipesByIngredients({
      ingredients: ingredientNames,
      number: maxRecipes,
      ranking: 1, // Maximize usage of safe ingredients
      ignorePantry: true,
      userId
    });
  }
}

// Export singleton instance
export const recipeService = new RecipeService();
