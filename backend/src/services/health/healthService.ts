/**
 * Health Metrics Service
 * Handles daily context logging and health metrics tracking
 */

import { db } from '../../db/connection.js';
import { healthMetrics } from '../../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { NewHealthMetric, HealthMetric } from '../../db/schema.js';

export interface DailyContextInput {
  // Sleep and wellness
  sleep_hours?: number;
  sleep_quality?: number; // 1-10
  energy_level?: number; // 1-10
  stress_level?: number; // 1-10
  
  // MCAS-specific triggers
  dao_supplement_taken?: boolean;
  compression_worn?: boolean;
  sensory_environment_controlled?: boolean;
  physical_activity_level?: number; // 0-10
  
  // Weather context
  weather_temperature?: number;
  weather_humidity?: number;
  weather_barometric_pressure?: number;
  
  // Health status
  infection_symptoms?: boolean;
  incubating_illness?: boolean;
  menstrual_cycle_day?: number;
  perimenopause_symptoms?: boolean;
  
  // Previous day influence
  had_reactions_yesterday?: boolean;
  physical_activity_yesterday?: number;
  fatigue_level_yesterday?: number;
  stress_level_yesterday?: number;
  
  // Today's context
  ate_heavy_food?: boolean;
  current_concerns?: string;
  controlled_stimuli?: boolean;
  physically_tired_when_eating?: boolean;
  psychologically_tired_when_eating?: boolean;
  
  notes?: string;
}

export class HealthService {
  /**
   * Log daily context for a user
   */
  static async logDailyContext(userId: number, date: string, context: DailyContextInput) {
    // Calculate risk scores based on multiple factors
    const cumulativeStressScore = this.calculateCumulativeStress(context);
    const reactionRiskLevel = this.calculateReactionRisk(context);

    const newHealthMetric: typeof healthMetrics.$inferInsert = {
      user_id: userId,
      date,
      sleep_hours: context.sleep_hours,
      sleep_quality: context.sleep_quality,
      energy_level: context.energy_level,
      stress_level: context.stress_level,
      
      // MCAS-specific triggers
      dao_supplement_taken: context.dao_supplement_taken ?? false,
      compression_worn: context.compression_worn ?? false,
      sensory_environment_controlled: context.sensory_environment_controlled ?? false,
      physical_activity_level: context.physical_activity_level,
      
      // Weather
      weather_temperature: context.weather_temperature,
      weather_humidity: context.weather_humidity,
      weather_barometric_pressure: context.weather_barometric_pressure,
      
      // Health status
      infection_symptoms: context.infection_symptoms ?? false,
      incubating_illness: context.incubating_illness ?? false,
      menstrual_cycle_day: context.menstrual_cycle_day,
      perimenopause_symptoms: context.perimenopause_symptoms ?? false,
      
      // Previous day
      had_reactions_yesterday: context.had_reactions_yesterday ?? false,
      physical_activity_yesterday: context.physical_activity_yesterday,
      fatigue_level_yesterday: context.fatigue_level_yesterday,
      stress_level_yesterday: context.stress_level_yesterday,
      
      // Today's factors
      ate_heavy_food: context.ate_heavy_food ?? false,
      current_concerns: context.current_concerns,
      controlled_stimuli: context.controlled_stimuli ?? false,
      physically_tired_when_eating: context.physically_tired_when_eating ?? false,
      psychologically_tired_when_eating: context.psychologically_tired_when_eating ?? false,
      
      // Calculated scores
      cumulative_stress_score: cumulativeStressScore,
      reaction_risk_level: reactionRiskLevel,
      
      notes: context.notes,
    };

    // Upsert (insert or update if exists for this date)
    const result = await db.insert(healthMetrics)
      .values(newHealthMetric)
      .onConflictDoUpdate({
        target: [healthMetrics.user_id, healthMetrics.date],
        set: {
          ...newHealthMetric,
          updated_at: sql`NOW()`
        }
      })
      .returning();

    return result[0];
  }

  /**
   * Get health metrics for a user within date range
   */
  static async getHealthMetrics(userId: number, startDate?: string, endDate?: string, limit = 30) {
    let query = db.select()
      .from(healthMetrics)
      .where(eq(healthMetrics.user_id, userId))
      .orderBy(desc(healthMetrics.date));

    if (startDate && endDate) {
      query = query.where(
        and(
          eq(healthMetrics.user_id, userId),
          sql`${healthMetrics.date} BETWEEN ${startDate} AND ${endDate}`
        )
      );
    }

    return await query.limit(limit);
  }

  /**
   * Get today's context for a user
   */
  static async getTodaysContext(userId: number, date: string) {
    const result = await db.select()
      .from(healthMetrics)
      .where(
        and(
          eq(healthMetrics.user_id, userId),
          eq(healthMetrics.date, date)
        )
      )
      .limit(1);

    return result[0] || null;
  }

  /**
   * Calculate cumulative stress score based on multiple factors
   */
  private static calculateCumulativeStress(context: DailyContextInput): number {
    let score = 0;
    const maxScore = 100;

    // Sleep impact (0-25 points)
    if (context.sleep_quality) {
      score += Math.max(0, (10 - context.sleep_quality) * 2.5);
    }
    if (context.sleep_hours && context.sleep_hours < 7) {
      score += (7 - context.sleep_hours) * 3;
    }

    // Stress factors (0-30 points)
    if (context.stress_level) {
      score += context.stress_level * 3;
    }
    if (context.stress_level_yesterday && context.stress_level_yesterday > 6) {
      score += (context.stress_level_yesterday - 6) * 2;
    }

    // Health status (0-20 points)
    if (context.infection_symptoms) score += 15;
    if (context.incubating_illness) score += 10;
    if (context.perimenopause_symptoms) score += 8;

    // Previous day impact (0-15 points)
    if (context.had_reactions_yesterday) score += 12;
    if (context.fatigue_level_yesterday && context.fatigue_level_yesterday > 6) {
      score += (context.fatigue_level_yesterday - 6) * 2;
    }

    // Current day factors (0-10 points)
    if (context.ate_heavy_food) score += 5;
    if (context.physically_tired_when_eating) score += 3;
    if (context.psychologically_tired_when_eating) score += 3;

    return Math.min(score, maxScore);
  }

  /**
   * Calculate reaction risk level (1-10) based on cumulative factors
   */
  private static calculateReactionRisk(context: DailyContextInput): number {
    const stressScore = this.calculateCumulativeStress(context);
    
    // Base risk from stress score
    let riskLevel = Math.floor(stressScore / 10) + 1;

    // Protective factors reduce risk
    if (context.dao_supplement_taken) riskLevel = Math.max(1, riskLevel - 1);
    if (context.compression_worn) riskLevel = Math.max(1, riskLevel - 1);
    if (context.sensory_environment_controlled) riskLevel = Math.max(1, riskLevel - 1);
    if (context.controlled_stimuli) riskLevel = Math.max(1, riskLevel - 1);

    // Additional risk factors
    if (context.menstrual_cycle_day && (context.menstrual_cycle_day <= 3 || context.menstrual_cycle_day >= 26)) {
      riskLevel += 1; // Pre/during menstruation
    }

    return Math.min(Math.max(riskLevel, 1), 10);
  }

  /**
   * Get risk analysis for current context
   */
  static async getRiskAnalysis(userId: number, date: string) {
    const context = await this.getTodaysContext(userId, date);
    if (!context) return null;

    const riskFactors = [];
    const protectiveFactors = [];

    // Analyze risk factors
    if (context.stress_level && context.stress_level >= 7) riskFactors.push('Høyt stressnivå');
    if (context.sleep_quality && context.sleep_quality <= 4) riskFactors.push('Dårlig søvnkvalitet');
    if (context.had_reactions_yesterday) riskFactors.push('Reaksjoner i går');
    if (context.infection_symptoms) riskFactors.push('Infeksjonssymptomer');
    if (context.perimenopause_symptoms) riskFactors.push('Perimenopause-symptomer');
    if (context.ate_heavy_food) riskFactors.push('Tung mat i dag');

    // Analyze protective factors
    if (context.dao_supplement_taken) protectiveFactors.push('DAO-tilskudd tatt');
    if (context.compression_worn) protectiveFactors.push('Kompresjon brukt');
    if (context.sensory_environment_controlled) protectiveFactors.push('Rolig sensorisk miljø');
    if (context.controlled_stimuli) protectiveFactors.push('Kontrollerte stimuli');

    return {
      reaction_risk_level: context.reaction_risk_level,
      cumulative_stress_score: context.cumulative_stress_score,
      riskFactors,
      protectiveFactors,
      recommendation: this.generateRecommendation(context.reaction_risk_level, riskFactors, protectiveFactors)
    };
  }

  private static generateRecommendation(riskLevel: number, riskFactors: string[], protectiveFactors: string[]): string {
    if (riskLevel <= 3) {
      return 'Lav risiko i dag. Fortsett med dine vanlige rutiner.';
    } else if (riskLevel <= 6) {
      return 'Moderat risiko. Vurder å ta DAO før måltider og kontroller sensorisk miljø.';
    } else {
      return 'Høy risiko i dag. Vær ekstra forsiktig med mat, ta DAO, bruk kompresjon og unngå kjente triggere.';
    }
  }
}

export type { HealthMetric };