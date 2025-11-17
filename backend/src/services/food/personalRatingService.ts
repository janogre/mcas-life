/**
 * Personal Food Rating Service - MCAS-Life
 * 
 * Manages personal food ratings separately from the approved foods list.
 * This allows users to rate foods without automatically adding them to their safe list.
 */

import { eq, and } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { personalFoodRatings } from '../../db/schema.js';
import type { 
  PersonalFoodRating,
  FoodCompatibility
} from '@mcas-life/shared';

export class PersonalRatingService {

  /**
   * Get user's personal rating for a specific food
   */
  async getUserFoodRating(userId: number, foodId: number): Promise<PersonalFoodRating | null> {
    const [rating] = await db
      .select()
      .from(personalFoodRatings)
      .where(and(
        eq(personalFoodRatings.user_id, userId),
        eq(personalFoodRatings.food_id, foodId)
      ))
      .limit(1);

    if (!rating) {
      return null;
    }

    return this.mapDatabaseToRating(rating);
  }

  /**
   * Get all personal ratings for a user
   */
  async getUserFoodRatings(userId: number): Promise<PersonalFoodRating[]> {
    const results = await db
      .select()
      .from(personalFoodRatings)
      .where(eq(personalFoodRatings.user_id, userId));

    return results.map(this.mapDatabaseToRating);
  }

  /**
   * Set or update personal rating for a food
   */
  async setFoodRating(userId: number, foodId: number, rating: FoodCompatibility, notes?: string): Promise<PersonalFoodRating> {
    // Check if rating already exists
    const existing = await this.getUserFoodRating(userId, foodId);

    if (existing) {
      // Update existing rating
      const [updated] = await db
        .update(personalFoodRatings)
        .set({
          personal_rating: rating.toString() as "0" | "1" | "2" | "3",
          notes: notes || existing.notes,
          updated_at: new Date()
        })
        .where(and(
          eq(personalFoodRatings.user_id, userId),
          eq(personalFoodRatings.food_id, foodId)
        ))
        .returning();

      return this.mapDatabaseToRating(updated);
    } else {
      // Create new rating
      const [created] = await db
        .insert(personalFoodRatings)
        .values({
          user_id: userId,
          food_id: foodId,
          personal_rating: rating.toString() as "0" | "1" | "2" | "3",
          notes: notes || ''
        })
        .returning();

      return this.mapDatabaseToRating(created);
    }
  }

  /**
   * Remove personal rating for a food
   */
  async removeFoodRating(userId: number, foodId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(personalFoodRatings)
        .where(and(
          eq(personalFoodRatings.user_id, userId),
          eq(personalFoodRatings.food_id, foodId)
        ));

      return result.rowCount !== undefined && result.rowCount > 0;
    } catch (error) {
      console.error('Remove personal rating error:', error);
      return false;
    }
  }

  /**
   * Get personal ratings by compatibility level
   */
  async getUserRatingsByCompatibility(userId: number, compatibility: FoodCompatibility): Promise<PersonalFoodRating[]> {
    const results = await db
      .select()
      .from(personalFoodRatings)
      .where(and(
        eq(personalFoodRatings.user_id, userId),
        eq(personalFoodRatings.personal_rating, compatibility.toString() as "0" | "1" | "2" | "3")
      ));

    return results.map(this.mapDatabaseToRating);
  }

  /**
   * Map database record to PersonalFoodRating interface
   */
  private mapDatabaseToRating(dbRating: any): PersonalFoodRating {
    return {
      id: dbRating.id,
      food_id: dbRating.food_id,
      user_id: dbRating.user_id,
      personal_rating: parseInt(dbRating.personal_rating) as FoodCompatibility,
      notes: dbRating.notes || '',
      created_at: dbRating.created_at,
      updated_at: dbRating.updated_at
    };
  }
}

// Export singleton instance
export const personalRatingService = new PersonalRatingService();