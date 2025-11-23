/**
 * Supplement Diary Service
 * Handles supplement/medication entries with database persistence
 */

import { db } from '../../db/connection.js';
import { supplementEntries } from '../../db/schema.js';
import { eq, and, desc, sql, gte, lte, between } from 'drizzle-orm';
import type { NewSupplementEntry, SupplementEntry } from '../../db/schema.js';

export interface SupplementEntryInput {
  name: string;
  type: 'antihistamine' | 'mast_cell_stabilizer' | 'dao_supplement' | 'probiotic' | 'vitamin' | 'mineral' | 'herbal' | 'prescription' | 'other';
  brand?: string;
  dosage_amount: number;
  dosage_unit: string; // mg, mcg, IU, etc.
  frequency: string; // "twice daily", "as needed", etc.
  taken_at: Date;
  next_dose_due?: Date;
  intended_for?: string[]; // Symptom types this targets
  effectiveness_rating?: number; // 1-10
  side_effects?: string[];
  missed_dose?: boolean;
  late_dose?: boolean;
  notes?: string;
}

export class SupplementDiaryService {
  /**
   * Create a new supplement entry
   */
  static async createSupplementEntry(userId: number, supplementData: SupplementEntryInput): Promise<SupplementEntry> {
    const newEntry: NewSupplementEntry = {
      user_id: userId,
      name: supplementData.name,
      type: supplementData.type,
      brand: supplementData.brand,
      dosage_amount: supplementData.dosage_amount,
      dosage_unit: supplementData.dosage_unit,
      frequency: supplementData.frequency,
      taken_at: supplementData.taken_at,
      next_dose_due: supplementData.next_dose_due,
      intended_for: supplementData.intended_for,
      effectiveness_rating: supplementData.effectiveness_rating,
      side_effects: supplementData.side_effects,
      missed_dose: supplementData.missed_dose || false,
      late_dose: supplementData.late_dose || false,
      notes: supplementData.notes,
    };

    const result = await db.insert(supplementEntries).values(newEntry).returning();
    return result[0];
  }

  /**
   * Get supplement entries for a user with optional filtering
   */
  static async getSupplementEntries(
    userId: number,
    options: {
      startDate?: Date;
      endDate?: Date;
      type?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<SupplementEntry[]> {
    const { startDate, endDate, type, limit = 50, offset = 0 } = options;

    const conditions = [eq(supplementEntries.user_id, userId)];

    if (startDate && endDate) {
      conditions.push(between(supplementEntries.taken_at, startDate, endDate));
    } else if (startDate) {
      conditions.push(gte(supplementEntries.taken_at, startDate));
    } else if (endDate) {
      conditions.push(lte(supplementEntries.taken_at, endDate));
    }

    if (type) {
      conditions.push(eq(supplementEntries.type, type as any));
    }

    const query = db
      .select()
      .from(supplementEntries)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(supplementEntries.taken_at))
      .limit(limit)
      .offset(offset);

    return await query;
  }

  /**
   * Get a single supplement entry by ID
   */
  static async getSupplementEntry(userId: number, entryId: number): Promise<SupplementEntry | null> {
    const result = await db
      .select()
      .from(supplementEntries)
      .where(
        and(
          eq(supplementEntries.id, entryId),
          eq(supplementEntries.user_id, userId)
        )
      )
      .limit(1);

    return result.length > 0 ? result[0] : null;
  }

  /**
   * Update a supplement entry
   */
  static async updateSupplementEntry(
    userId: number,
    entryId: number,
    updates: Partial<SupplementEntryInput>
  ): Promise<SupplementEntry | null> {
    // Verify ownership
    const existing = await this.getSupplementEntry(userId, entryId);
    if (!existing) {
      return null;
    }

    const updateData: any = { updated_at: new Date() };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.brand !== undefined) updateData.brand = updates.brand;
    if (updates.dosage_amount !== undefined) updateData.dosage_amount = updates.dosage_amount;
    if (updates.dosage_unit !== undefined) updateData.dosage_unit = updates.dosage_unit;
    if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
    if (updates.taken_at !== undefined) updateData.taken_at = updates.taken_at;
    if (updates.next_dose_due !== undefined) updateData.next_dose_due = updates.next_dose_due;
    if (updates.intended_for !== undefined) updateData.intended_for = updates.intended_for;
    if (updates.effectiveness_rating !== undefined) updateData.effectiveness_rating = updates.effectiveness_rating;
    if (updates.side_effects !== undefined) updateData.side_effects = updates.side_effects;
    if (updates.missed_dose !== undefined) updateData.missed_dose = updates.missed_dose;
    if (updates.late_dose !== undefined) updateData.late_dose = updates.late_dose;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const result = await db
      .update(supplementEntries)
      .set(updateData)
      .where(
        and(
          eq(supplementEntries.id, entryId),
          eq(supplementEntries.user_id, userId)
        )
      )
      .returning();

    return result.length > 0 ? result[0] : null;
  }

  /**
   * Delete a supplement entry
   */
  static async deleteSupplementEntry(userId: number, entryId: number): Promise<boolean> {
    const result = await db
      .delete(supplementEntries)
      .where(
        and(
          eq(supplementEntries.id, entryId),
          eq(supplementEntries.user_id, userId)
        )
      )
      .returning();

    return result.length > 0;
  }

  /**
   * Get supplement statistics for a user
   */
  static async getSupplementStats(userId: number, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const supplements = await db
      .select()
      .from(supplementEntries)
      .where(
        and(
          eq(supplementEntries.user_id, userId),
          gte(supplementEntries.taken_at, startDate)
        )
      );

    // Calculate statistics
    const typeStats = supplements.reduce((acc, supp) => {
      acc[supp.type] = (acc[supp.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const supplementFrequency = supplements.reduce((acc, supp) => {
      acc[supp.name] = (acc[supp.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topSupplements = Object.entries(supplementFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    const missedDoses = supplements.filter(s => s.missed_dose).length;
    const lateDoses = supplements.filter(s => s.late_dose).length;

    // Calculate average effectiveness for supplements with ratings
    const ratedSupplements = supplements.filter(s => s.effectiveness_rating !== null);
    const averageEffectiveness = ratedSupplements.length > 0
      ? ratedSupplements.reduce((sum, s) => sum + (s.effectiveness_rating || 0), 0) / ratedSupplements.length
      : 0;

    // Group side effects
    const allSideEffects = supplements
      .filter(s => s.side_effects && s.side_effects.length > 0)
      .flatMap(s => s.side_effects || []);

    const sideEffectFrequency = allSideEffects.reduce((acc, effect) => {
      acc[effect] = (acc[effect] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const commonSideEffects = Object.entries(sideEffectFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([effect, count]) => ({ effect, count }));

    return {
      totalSupplements: supplements.length,
      typeBreakdown: typeStats,
      topSupplements,
      missedDoses,
      lateDoses,
      complianceRate: supplements.length > 0
        ? Math.round(((supplements.length - missedDoses) / supplements.length) * 100)
        : 100,
      averageEffectiveness: Math.round(averageEffectiveness * 10) / 10,
      commonSideEffects,
      daysAnalyzed: days
    };
  }

  /**
   * Get supplements taken in a specific time window (for correlation analysis)
   */
  static async getSupplementsInTimeWindow(
    userId: number,
    startTime: Date,
    endTime: Date
  ): Promise<SupplementEntry[]> {
    return await db
      .select()
      .from(supplementEntries)
      .where(
        and(
          eq(supplementEntries.user_id, userId),
          between(supplementEntries.taken_at, startTime, endTime)
        )
      )
      .orderBy(supplementEntries.taken_at);
  }

  /**
   * Get supplements by type (e.g., all antihistamines)
   */
  static async getSupplementsByType(
    userId: number,
    type: string,
    limit: number = 50
  ): Promise<SupplementEntry[]> {
    return await db
      .select()
      .from(supplementEntries)
      .where(
        and(
          eq(supplementEntries.user_id, userId),
          eq(supplementEntries.type, type as any)
        )
      )
      .orderBy(desc(supplementEntries.taken_at))
      .limit(limit);
  }

  /**
   * Get effectiveness ratings for a specific supplement
   */
  static async getSupplementEffectiveness(
    userId: number,
    supplementName: string
  ): Promise<{
    averageRating: number;
    totalDoses: number;
    ratedDoses: number;
    trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  }> {
    const entries = await db
      .select()
      .from(supplementEntries)
      .where(
        and(
          eq(supplementEntries.user_id, userId),
          eq(supplementEntries.name, supplementName)
        )
      )
      .orderBy(supplementEntries.taken_at);

    const ratedEntries = entries.filter(e => e.effectiveness_rating !== null);

    if (ratedEntries.length === 0) {
      return {
        averageRating: 0,
        totalDoses: entries.length,
        ratedDoses: 0,
        trend: 'insufficient_data'
      };
    }

    const averageRating = ratedEntries.reduce((sum, e) => sum + (e.effectiveness_rating || 0), 0) / ratedEntries.length;

    // Calculate trend (compare first half vs second half of ratings)
    let trend: 'improving' | 'stable' | 'declining' | 'insufficient_data' = 'insufficient_data';

    if (ratedEntries.length >= 4) {
      const midpoint = Math.floor(ratedEntries.length / 2);
      const firstHalf = ratedEntries.slice(0, midpoint);
      const secondHalf = ratedEntries.slice(midpoint);

      const firstAvg = firstHalf.reduce((sum, e) => sum + (e.effectiveness_rating || 0), 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, e) => sum + (e.effectiveness_rating || 0), 0) / secondHalf.length;

      const difference = secondAvg - firstAvg;

      if (difference > 1) trend = 'improving';
      else if (difference < -1) trend = 'declining';
      else trend = 'stable';
    }

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalDoses: entries.length,
      ratedDoses: ratedEntries.length,
      trend
    };
  }
}

export type { SupplementEntry };
