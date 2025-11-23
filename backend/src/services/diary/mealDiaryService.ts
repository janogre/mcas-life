/**
 * Meal Diary Service
 * Handles food diary entries with database persistence
 */

import { db } from '../../db/connection.js';
import { foodDiaryEntries, foods } from '../../db/schema.js';
import { eq, and, desc, sql, gte, lte, between } from 'drizzle-orm';
import type { NewFoodDiaryEntry, FoodDiaryEntry } from '../../db/schema.js';

export interface MealEntryInput {
  food_id: number;
  amount: number; // grams
  preparation_method?: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  consumed_at: Date;
  notes?: string;
}

export class MealDiaryService {
  /**
   * Create a new meal diary entry
   */
  static async createMealEntry(userId: number, mealData: MealEntryInput): Promise<FoodDiaryEntry> {
    const newEntry: NewFoodDiaryEntry = {
      user_id: userId,
      food_id: mealData.food_id,
      amount: mealData.amount,
      preparation_method: mealData.preparation_method,
      meal_type: mealData.meal_type,
      consumed_at: mealData.consumed_at,
      notes: mealData.notes,
    };

    const result = await db.insert(foodDiaryEntries).values(newEntry).returning();
    const savedEntry = result[0];

    // Trigger background calculation of histamine load and trigger score
    this.calculateHistamineLoad(savedEntry.id, mealData.food_id, mealData.amount);

    return savedEntry;
  }

  /**
   * Get meal entries for a user with optional filtering
   */
  static async getMealEntries(
    userId: number,
    options: {
      startDate?: Date;
      endDate?: Date;
      mealType?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<FoodDiaryEntry[]> {
    const { startDate, endDate, mealType, limit = 50, offset = 0 } = options;

    let query = db
      .select({
        meal: foodDiaryEntries,
        food: foods
      })
      .from(foodDiaryEntries)
      .leftJoin(foods, eq(foodDiaryEntries.food_id, foods.id))
      .where(eq(foodDiaryEntries.user_id, userId))
      .orderBy(desc(foodDiaryEntries.consumed_at))
      .limit(limit)
      .offset(offset);

    // Apply filters
    const conditions = [eq(foodDiaryEntries.user_id, userId)];

    if (startDate && endDate) {
      conditions.push(
        between(foodDiaryEntries.consumed_at, startDate, endDate)
      );
    } else if (startDate) {
      conditions.push(gte(foodDiaryEntries.consumed_at, startDate));
    } else if (endDate) {
      conditions.push(lte(foodDiaryEntries.consumed_at, endDate));
    }

    if (mealType) {
      conditions.push(eq(foodDiaryEntries.meal_type, mealType));
    }

    if (conditions.length > 1) {
      query = db
        .select({
          meal: foodDiaryEntries,
          food: foods
        })
        .from(foodDiaryEntries)
        .leftJoin(foods, eq(foodDiaryEntries.food_id, foods.id))
        .where(and(...conditions))
        .orderBy(desc(foodDiaryEntries.consumed_at))
        .limit(limit)
        .offset(offset);
    }

    const results = await query;

    // Flatten the results to include food data with meal entry
    return results.map(r => ({
      ...r.meal,
      food: r.food
    })) as any;
  }

  /**
   * Get a single meal entry by ID
   */
  static async getMealEntry(userId: number, entryId: number): Promise<FoodDiaryEntry | null> {
    const result = await db
      .select({
        meal: foodDiaryEntries,
        food: foods
      })
      .from(foodDiaryEntries)
      .leftJoin(foods, eq(foodDiaryEntries.food_id, foods.id))
      .where(
        and(
          eq(foodDiaryEntries.id, entryId),
          eq(foodDiaryEntries.user_id, userId)
        )
      )
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return {
      ...result[0].meal,
      food: result[0].food
    } as any;
  }

  /**
   * Update a meal entry
   */
  static async updateMealEntry(
    userId: number,
    entryId: number,
    updates: Partial<MealEntryInput>
  ): Promise<FoodDiaryEntry | null> {
    // Verify ownership
    const existing = await this.getMealEntry(userId, entryId);
    if (!existing) {
      return null;
    }

    const updateData: any = {};

    if (updates.food_id !== undefined) updateData.food_id = updates.food_id;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.preparation_method !== undefined) updateData.preparation_method = updates.preparation_method;
    if (updates.meal_type !== undefined) updateData.meal_type = updates.meal_type;
    if (updates.consumed_at !== undefined) updateData.consumed_at = updates.consumed_at;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const result = await db
      .update(foodDiaryEntries)
      .set(updateData)
      .where(
        and(
          eq(foodDiaryEntries.id, entryId),
          eq(foodDiaryEntries.user_id, userId)
        )
      )
      .returning();

    if (result.length === 0) {
      return null;
    }

    // Recalculate histamine load if food or amount changed
    if (updates.food_id || updates.amount) {
      const food_id = updates.food_id || existing.food_id;
      const amount = updates.amount || existing.amount;
      this.calculateHistamineLoad(entryId, food_id, amount);
    }

    return result[0];
  }

  /**
   * Delete a meal entry
   */
  static async deleteMealEntry(userId: number, entryId: number): Promise<boolean> {
    const result = await db
      .delete(foodDiaryEntries)
      .where(
        and(
          eq(foodDiaryEntries.id, entryId),
          eq(foodDiaryEntries.user_id, userId)
        )
      )
      .returning();

    return result.length > 0;
  }

  /**
   * Get meal statistics for a user
   */
  static async getMealStats(userId: number, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const meals = await db
      .select({
        meal: foodDiaryEntries,
        food: foods
      })
      .from(foodDiaryEntries)
      .leftJoin(foods, eq(foodDiaryEntries.food_id, foods.id))
      .where(
        and(
          eq(foodDiaryEntries.user_id, userId),
          gte(foodDiaryEntries.consumed_at, startDate)
        )
      );

    // Calculate statistics
    const mealTypeStats = meals.reduce((acc, { meal }) => {
      acc[meal.meal_type] = (acc[meal.meal_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageHistamineLoad = meals.length > 0
      ? meals.reduce((sum, { meal }) => sum + (meal.estimated_histamine_load || 0), 0) / meals.length
      : 0;

    const foodFrequency = meals.reduce((acc, { meal, food }) => {
      if (food) {
        const foodName = food.name_en || food.name_no;
        acc[foodName] = (acc[foodName] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const topFoods = Object.entries(foodFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([food, count]) => ({ food, count }));

    return {
      totalMeals: meals.length,
      mealTypeBreakdown: mealTypeStats,
      averageHistamineLoad: Math.round(averageHistamineLoad * 100) / 100,
      topFoods,
      daysAnalyzed: days
    };
  }

  /**
   * Get meals in a specific time window (for correlation analysis)
   */
  static async getMealsInTimeWindow(
    userId: number,
    startTime: Date,
    endTime: Date
  ): Promise<FoodDiaryEntry[]> {
    const result = await db
      .select({
        meal: foodDiaryEntries,
        food: foods
      })
      .from(foodDiaryEntries)
      .leftJoin(foods, eq(foodDiaryEntries.food_id, foods.id))
      .where(
        and(
          eq(foodDiaryEntries.user_id, userId),
          between(foodDiaryEntries.consumed_at, startTime, endTime)
        )
      )
      .orderBy(foodDiaryEntries.consumed_at);

    return result.map(r => ({
      ...r.meal,
      food: r.food
    })) as any;
  }

  /**
   * Background calculation of histamine load based on food data
   */
  private static async calculateHistamineLoad(
    entryId: number,
    foodId: number,
    amount: number
  ): Promise<void> {
    try {
      // Get food details
      const food = await db
        .select()
        .from(foods)
        .where(eq(foods.id, foodId))
        .limit(1);

      if (food.length === 0) return;

      const foodData = food[0];

      // Calculate estimated histamine load based on:
      // 1. SIGHI compatibility (0-3 scale)
      // 2. Amount consumed
      // 3. Biogenic amines if available

      let histamineLoad = 0;
      let triggerScore = 0;

      // Base load from compatibility
      const compatibilityLoad = {
        0: 0.1,  // Safe
        1: 0.3,  // Medium
        2: 0.6,  // Incompatible
        3: 1.0   // Severe
      }[foodData.compatibility] || 0.5;

      histamineLoad = compatibilityLoad * (amount / 100); // Normalize by 100g

      // Add biogenic amines contribution if available
      if (foodData.biogenic_amines) {
        const amines = foodData.biogenic_amines as any;
        if (amines.histamine) {
          histamineLoad += (amines.histamine / 10) * (amount / 100);
        }
        if (amines.tyramine) {
          histamineLoad += (amines.tyramine / 20) * (amount / 100);
        }
      }

      // Calculate trigger score based on triggers
      if (foodData.triggers && Array.isArray(foodData.triggers)) {
        triggerScore = foodData.triggers.length * 0.2;
      }

      // Update the entry with calculated values
      await db
        .update(foodDiaryEntries)
        .set({
          estimated_histamine_load: Math.round(histamineLoad * 100) / 100,
          trigger_score: Math.round(triggerScore * 100) / 100
        })
        .where(eq(foodDiaryEntries.id, entryId));

    } catch (error) {
      console.error('Error calculating histamine load:', error);
    }
  }
}

export type { FoodDiaryEntry };
