/**
 * Food Service - MCAS-Life Food Management
 * 
 * Comprehensive food management service with SIGHI data integration:
 * - SIGHI food database import from MCAS-search
 * - Food search and filtering functionality
 * - MCAS compatibility checking
 * - Biogenic amines tracking
 * - User-specific food approvals
 * - Nutrition data integration
 */

import { eq, and, or, like, desc, asc, sql } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { foods, approvedFoods, foodDiaryEntries } from '../../db/schema.js';
import type { 
  Food, 
  FoodCompatibility, 
  BiogenicAmines,
  ApprovedFood,
  SighiTrigger,
  FoodSearchRequest,
  FoodSearchResponse,
  BulkFoodImportRequest
} from '@mcas-life/shared';

// SIGHI trigger mapping
const SIGHI_TRIGGER_NAMES: Record<SighiTrigger, string> = {
  H: 'Histamine',
  L: 'Lectins', 
  A: 'Aromatic compounds',
  B: 'Biogenic amines',
  S: 'Salicylates',
  T: 'Tyramine',
  P: 'Phenolic compounds',
  N: 'Natural compounds',
  D: 'Digestive irritants',
  C: 'Cross-reactive allergens'
};

export class FoodService {

  /**
   * Search foods with advanced filtering
   */
  async searchFoods(searchRequest: FoodSearchRequest): Promise<FoodSearchResponse> {
    const { 
      query, 
      compatibility_filter, 
      category_filter, 
      trigger_filter, 
      user_id,
      include_approved = false,
      page = 1, 
      limit = 20 
    } = searchRequest;

    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];

    // Text search in Norwegian and English names (case-insensitive)
    if (query) {
      const searchTerm = query.toLowerCase();
      conditions.push(
        or(
          sql`LOWER(${foods.name_no}) LIKE ${`%${searchTerm}%`}`,
          sql`LOWER(${foods.name_en}) LIKE ${`%${searchTerm}%`}`
        )
      );
    }

    // Compatibility filter
    if (compatibility_filter !== undefined) {
      conditions.push(eq(foods.compatibility, compatibility_filter));
    }

    // Category filter
    if (category_filter) {
      conditions.push(like(foods.category, `%${category_filter}%`));
    }

    // Trigger filter - check if specific trigger exists in JSON array
    if (trigger_filter) {
      conditions.push(
        sql`JSON_EXTRACT(${foods.triggers}, '$') LIKE '%"${trigger_filter}"%'`
      );
    }

    // Build the query
    const whereClause = conditions.length > 0 
      ? and(...conditions) 
      : undefined;

    // Get total count for pagination
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(foods)
      .where(whereClause);

    const total = countResult.count;

    // Get foods with pagination
    const foodResults = await db
      .select()
      .from(foods)
      .where(whereClause)
      .orderBy(asc(foods.name_no))
      .limit(limit)
      .offset(offset);

    // Convert database results to Food interface
    const foodItems: Food[] = foodResults.map(this.mapDatabaseToFood);

    // Include user-approved foods if requested
    let approvedItems: ApprovedFood[] = [];
    if (include_approved && user_id) {
      approvedItems = await this.getUserApprovedFoods(user_id);
    }

    return {
      foods: foodItems,
      approved_foods: approvedItems,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      },
      filters_applied: {
        query: query || null,
        compatibility: compatibility_filter !== undefined ? compatibility_filter : null,
        category: category_filter || null,
        trigger: trigger_filter || null
      }
    };
  }

  /**
   * Get food by ID with detailed information
   */
  async getFoodById(foodId: number): Promise<Food | null> {
    const [food] = await db
      .select()
      .from(foods)
      .where(eq(foods.id, foodId))
      .limit(1);

    if (!food) {
      return null;
    }

    return this.mapDatabaseToFood(food);
  }

  /**
   * Get foods by compatibility level
   */
  async getFoodsByCompatibility(compatibility: FoodCompatibility): Promise<Food[]> {
    const results = await db
      .select()
      .from(foods)
      .where(eq(foods.compatibility, compatibility.toString() as "0" | "1" | "2" | "3"))
      .orderBy(asc(foods.name_no));

    return results.map(this.mapDatabaseToFood);
  }

  /**
   * Get foods by SIGHI trigger
   */
  async getFoodsByTrigger(trigger: SighiTrigger): Promise<Food[]> {
    const results = await db
      .select()
      .from(foods)
      .where(
        sql`JSON_EXTRACT(${foods.triggers}, '$') LIKE '%"${trigger}"%'`
      )
      .orderBy(asc(foods.name_no));

    return results.map(this.mapDatabaseToFood);
  }

  /**
   * Get user's approved foods
   */
  async getUserApprovedFoods(userId: number): Promise<ApprovedFood[]> {
    const results = await db
      .select()
      .from(approvedFoods)
      .where(eq(approvedFoods.user_id, userId))
      .orderBy(desc(approvedFoods.last_consumed));

    return results.map(item => ({
      id: item.id,
      food_id: item.food_id,
      user_id: item.user_id,
      personal_tolerance: parseInt(item.personal_tolerance) as FoodCompatibility,
      notes: item.notes || '',
      dosage_notes: item.dosage_notes || undefined,
      preparation_notes: item.preparation_notes || undefined,
      times_consumed: item.times_consumed,
      avg_reaction_score: item.avg_reaction_score,
      last_consumed: item.last_consumed,
      upvotes: item.upvotes,
      downvotes: item.downvotes,
      report_count: item.report_count,
      contributor_name: item.contributor_name || undefined,
      is_public: item.is_public,
      created_at: item.created_at,
      updated_at: item.updated_at
    }));
  }

  /**
   * Add user-approved food
   */
  async addUserApprovedFood(userId: number, approvedFood: {
    food_id: number;
    personal_compatibility: FoodCompatibility;
    notes?: string;
  }): Promise<ApprovedFood> {
    const [result] = await db
      .insert(approvedFoods)
      .values({
        user_id: userId,
        food_id: approvedFood.food_id,
        personal_tolerance: approvedFood.personal_compatibility.toString() as "0" | "1" | "2" | "3",
        notes: approvedFood.notes || '',
        times_consumed: 1,
        avg_reaction_score: 0.0,
        last_consumed: new Date()
      })
      .returning();

    if (!result) {
      throw new Error('Failed to create approved food');
    }

    return {
      id: result.id,
      food_id: result.food_id,
      user_id: result.user_id,
      personal_tolerance: parseInt(result.personal_tolerance) as FoodCompatibility,
      notes: result.notes || '',
      dosage_notes: result.dosage_notes || undefined,
      preparation_notes: result.preparation_notes || undefined,
      times_consumed: result.times_consumed,
      avg_reaction_score: result.avg_reaction_score,
      last_consumed: result.last_consumed,
      upvotes: result.upvotes,
      downvotes: result.downvotes,
      report_count: result.report_count,
      contributor_name: result.contributor_name || undefined,
      is_public: result.is_public,
      created_at: result.created_at,
      updated_at: result.updated_at
    };
  }

  /**
   * Update user-approved food
   */
  async updateUserApprovedFood(
    userId: number, 
    approvedFoodId: number, 
    updates: Partial<{
      personal_compatibility: FoodCompatibility;
      notes: string;
      reaction_score: number;
    }>
  ): Promise<ApprovedFood | null> {
    
    // Build update object
    const updateData: any = { updated_at: new Date() };

    if (updates.personal_compatibility !== undefined) {
      updateData.personal_tolerance = updates.personal_compatibility.toString() as "0" | "1" | "2" | "3";
    }
    if (updates.notes !== undefined) {
      updateData.notes = updates.notes;
    }

    // If reaction score provided, update average
    if (updates.reaction_score !== undefined) {
      const [existing] = await db
        .select({ times_consumed: approvedFoods.times_consumed, avg_reaction_score: approvedFoods.avg_reaction_score })
        .from(approvedFoods)
        .where(and(
          eq(approvedFoods.id, approvedFoodId),
          eq(approvedFoods.user_id, userId)
        ))
        .limit(1);

      if (existing) {
        const newTimesConsumed = existing.times_consumed + 1;
        const newAvgScore = ((existing.avg_reaction_score * existing.times_consumed) + updates.reaction_score) / newTimesConsumed;
        
        updateData.times_consumed = newTimesConsumed;
        updateData.avg_reaction_score = Number(newAvgScore.toFixed(2));
        updateData.last_consumed = new Date();
      }
    }

    const [updated] = await db
      .update(approvedFoods)
      .set(updateData)
      .where(and(
        eq(approvedFoods.id, approvedFoodId),
        eq(approvedFoods.user_id, userId)
      ))
      .returning();

    if (!updated) {
      return null;
    }

    return {
      id: updated.id,
      food_id: updated.food_id,
      user_id: updated.user_id,
      personal_tolerance: parseInt(updated.personal_tolerance) as FoodCompatibility,
      notes: updated.notes || '',
      dosage_notes: updated.dosage_notes || undefined,
      preparation_notes: updated.preparation_notes || undefined,
      times_consumed: updated.times_consumed,
      avg_reaction_score: updated.avg_reaction_score,
      last_consumed: updated.last_consumed,
      upvotes: updated.upvotes,
      downvotes: updated.downvotes,
      report_count: updated.report_count,
      contributor_name: updated.contributor_name || undefined,
      is_public: updated.is_public,
      created_at: updated.created_at,
      updated_at: updated.updated_at
    };
  }

  /**
   * Import SIGHI foods in bulk (for initial setup)
   */
  async bulkImportFoods(importRequest: BulkFoodImportRequest): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    const { foods: foodsToImport, overwrite_existing = false } = importRequest;
    
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const foodData of foodsToImport) {
      try {
        // Check if food already exists
        const [existing] = await db
          .select({ id: foods.id })
          .from(foods)
          .where(
            and(
              eq(foods.name_no, foodData.name_no),
              eq(foods.name_en, foodData.name_en)
            )
          )
          .limit(1);

        if (existing && !overwrite_existing) {
          skipped++;
          continue;
        }

        // Parse triggers from MCAS-search format
        let triggers: SighiTrigger[] = [];
        if (foodData.triggers) {
          try {
            triggers = typeof foodData.triggers === 'string' 
              ? JSON.parse(foodData.triggers) 
              : foodData.triggers;
          } catch (e) {
            triggers = [];
          }
        }

        // Prepare biogenic amines (start with empty, to be filled later)
        const biogenicAmines: BiogenicAmines = {
          histamine: null,
          tyramine: null,
          phenylethylamine: null,
          dopamine: null,
          norepinephrine: null,
          tryptamine: null,
          putrescine: null,
          cadaverine: null,
          spermidine: null,
          spermine: null
        };

        const foodRecord = {
          name_no: foodData.name_no,
          name_en: foodData.name_en,
          category: foodData.category || 'Ukjent kategori',
          compatibility: foodData.compatibility.toString() as "0" | "1" | "2" | "3",
          triggers: JSON.stringify(triggers),
          biogenic_amines: JSON.stringify(biogenicAmines),
          remarks_no: foodData.remarks_no || null,
          remarks_en: foodData.remarks_en || null,
          image_url: null,
          nutrition_data: null
        };

        if (existing && overwrite_existing) {
          await db
            .update(foods)
            .set({ ...foodRecord, updated_at: new Date() })
            .where(eq(foods.id, existing.id));
        } else {
          await db.insert(foods).values(foodRecord);
        }

        imported++;

      } catch (error) {
        errors.push(`Failed to import ${foodData.name_no}: ${error}`);
      }
    }

    return { imported, skipped, errors };
  }

  /**
   * Get food statistics
   */
  async getFoodStatistics(): Promise<{
    total_foods: number;
    by_compatibility: Record<string, number>;
    by_category: Record<string, number>;
    top_triggers: Array<{ trigger: SighiTrigger; count: number; name: string }>;
  }> {
    
    // Total foods count
    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(foods);

    // Count by compatibility
    const compatibilityResults = await db
      .select({ 
        compatibility: foods.compatibility, 
        count: sql<number>`count(*)` 
      })
      .from(foods)
      .groupBy(foods.compatibility);

    const byCompatibility: Record<string, number> = {};
    compatibilityResults.forEach(result => {
      const level = result.compatibility === "0" ? 'Safe' : 
                   result.compatibility === "1" ? 'Medium' : 
                   result.compatibility === "2" ? 'Incompatible' : 'Severe';
      byCompatibility[level] = result.count;
    });

    // Count by category
    const categoryResults = await db
      .select({ 
        category: foods.category, 
        count: sql<number>`count(*)` 
      })
      .from(foods)
      .groupBy(foods.category)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    const byCategory: Record<string, number> = {};
    categoryResults.forEach(result => {
      byCategory[result.category] = result.count;
    });

    // Top triggers (requires custom logic since triggers are in JSON)
    const allFoods = await db.select({ triggers: foods.triggers }).from(foods);
    const triggerCounts: Record<SighiTrigger, number> = {} as Record<SighiTrigger, number>;

    allFoods.forEach(food => {
      if (food.triggers) {
        try {
          const triggers = JSON.parse(food.triggers) as SighiTrigger[];
          triggers.forEach(trigger => {
            triggerCounts[trigger] = (triggerCounts[trigger] || 0) + 1;
          });
        } catch (e) {
          // Skip invalid JSON
        }
      }
    });

    const topTriggers = Object.entries(triggerCounts)
      .map(([trigger, count]) => ({
        trigger: trigger as SighiTrigger,
        count,
        name: SIGHI_TRIGGER_NAMES[trigger as SighiTrigger]
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total_foods: totalResult?.count || 0,
      by_compatibility: byCompatibility,
      by_category: byCategory,
      top_triggers: topTriggers
    };
  }

  /**
   * Map database record to Food interface
   */
  private mapDatabaseToFood(dbFood: any): Food {
    let triggers: SighiTrigger[] = [];
    let biogenic_amines: BiogenicAmines | null = null;

    // Parse triggers
    if (dbFood.triggers) {
      try {
        triggers = JSON.parse(dbFood.triggers);
      } catch (e) {
        triggers = [];
      }
    }

    // Parse biogenic amines
    if (dbFood.biogenic_amines) {
      try {
        biogenic_amines = JSON.parse(dbFood.biogenic_amines);
      } catch (e) {
        biogenic_amines = null;
      }
    }

    return {
      id: dbFood.id,
      name_no: dbFood.name_no,
      name_en: dbFood.name_en,
      category: dbFood.category,
      compatibility: parseInt(dbFood.compatibility) as FoodCompatibility,
      triggers,
      biogenic_amines: biogenic_amines || undefined,
      remarks_no: dbFood.remarks_no,
      remarks_en: dbFood.remarks_en,
      image_url: dbFood.image_url,
      nutrition_data: dbFood.nutrition_data ? JSON.parse(dbFood.nutrition_data) : null,
      verified: dbFood.verified || false,
      source: dbFood.source as 'sighi' | 'community' | 'fooddata' | 'openfoodfacts',
      created_at: dbFood.created_at,
      updated_at: dbFood.updated_at
    };
  }
}

// Export singleton instance
export const foodService = new FoodService();