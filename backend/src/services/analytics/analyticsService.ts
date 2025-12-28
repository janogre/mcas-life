/**
 * Analytics Service - AI-Driven Symptom Correlation
 *
 * Core innovation: 72-hour trigger correlation analysis for MCAS patients
 * Uses machine learning patterns to identify food triggers and predict symptoms
 * Now includes indoor air quality analysis via Airthings integration
 */

import { db } from '../../db/index.js';
import { foods, foodDiaryEntries, mealEntries, mealFoods, symptomEntries, triggerAnalyses } from '../../db/schema.js';
import { eq, gte, lte, desc, and } from 'drizzle-orm';
import type { FoodCompatibility } from '@mcas-life/shared';
import { airthingsIntegrationService } from '../symptoms/airthingsIntegrationService.js';

// Core interfaces for AI correlation analysis
export interface TriggerCorrelationRequest {
  user_id: number;
  symptom_entry_id: number;
  analysis_window_hours?: number; // Default: 72 hours
}

export interface FoodTrigger {
  food_id: number;
  food_name_no: string;
  food_name_en: string;
  compatibility: FoodCompatibility;
  correlation_score: number; // 0-1 probability this triggered the symptom
  time_consumed: Date;
  time_to_symptom_hours: number;
  confidence_level: 'low' | 'medium' | 'high';
}

export interface IndoorAirQualityTrigger {
  room_id: string;
  room_name: string;
  time_spent_minutes: number;
  correlation_score: number; // 0-1 probability poor air quality triggered the symptom
  confidence_level: 'low' | 'medium' | 'high';
  air_quality_metrics: {
    co2?: number;
    voc?: number;
    humidity?: number;
    temperature?: number;
    radon?: number;
    pm25?: number;
  };
  risk_assessment: {
    risk_level: 'low' | 'moderate' | 'high' | 'unknown';
    risk_score: number;
    concerns: string[];
  };
}

export interface SymptomPattern {
  symptom_type: string;
  frequency_last_30_days: number;
  avg_severity: number;
  common_triggers: string[];
  time_of_day_pattern: Record<string, number>;
  seasonal_pattern?: Record<string, number>;
}

export interface TriggerAnalysisResult {
  analysis_id: number;
  user_id: number;
  symptom_entry_id: number;
  analysis_confidence: number; // 0-1 overall confidence in analysis
  data_quality_score: number; // 0-1 based on available data points

  // Primary findings
  likely_food_triggers: FoodTrigger[];
  likely_air_quality_triggers?: IndoorAirQualityTrigger[]; // NEW: Air quality triggers
  trigger_timeline: TriggerTimelineEvent[];

  // Pattern recognition
  similar_past_episodes: number[];
  symptom_pattern: SymptomPattern;

  // Recommendations
  improvement_suggestions: string[];
  foods_to_avoid: string[];
  foods_to_retry: string[];

  // Analysis metadata
  analysis_window_start: Date;
  analysis_window_end: Date;
  total_meals_analyzed: number;
  created_at: Date;
}

export interface TriggerTimelineEvent {
  timestamp: Date;
  event_type: 'meal' | 'symptom' | 'supplement' | 'trigger_exposure' | 'air_quality';
  description: string;
  severity?: number;
  correlation_score?: number;
  air_quality_data?: {
    room_name: string;
    risk_level: string;
    concerns: string[];
  };
}

class AnalyticsService {
  
  /**
   * Main AI correlation analysis - finds likely food triggers for a symptom
   */
  async analyzeTriggerCorrelation(request: TriggerCorrelationRequest): Promise<TriggerAnalysisResult> {
    const { user_id, symptom_entry_id, analysis_window_hours = 72 } = request;
    
    console.log(`🔍 Starting trigger correlation analysis for user ${user_id}, symptom ${symptom_entry_id}`);
    
    // Get the symptom entry details
    const [symptomEntry] = await db
      .select()
      .from(symptomEntries)
      .where(eq(symptomEntries.id, symptom_entry_id))
      .limit(1);
    
    if (!symptomEntry) {
      throw new Error(`Symptom entry ${symptom_entry_id} not found`);
    }
    
    // Define analysis window (72 hours before symptom onset)
    const symptomTime = new Date(symptomEntry.started_at);
    const windowStart = new Date(symptomTime.getTime() - (analysis_window_hours * 60 * 60 * 1000));
    const windowEnd = symptomTime;
    
    console.log(`📅 Analysis window: ${windowStart.toISOString()} to ${windowEnd.toISOString()}`);

    // Get all meals with their foods from the new meal_entries system
    const mealsData = await db
      .select({
        meal_id: mealEntries.id,
        meal_time: mealEntries.meal_time,
        meal_type: mealEntries.meal_type,
        dao_taken_before: mealEntries.dao_taken_before,
        // Food details from meal_foods join
        food_id: mealFoods.food_id,
        amount: mealFoods.amount,
        unit: mealFoods.unit,
        // SIGHI food data
        food_name_no: foods.name_no,
        food_name_en: foods.name_en,
        food_category: foods.category,
        food_compatibility: foods.compatibility,
        food_triggers: foods.triggers,
        food_biogenic_amines: foods.biogenic_amines,
      })
      .from(mealEntries)
      .innerJoin(mealFoods, eq(mealFoods.meal_id, mealEntries.id))
      .innerJoin(foods, eq(mealFoods.food_id, foods.id))
      .where(
        and(
          eq(mealEntries.user_id, user_id),
          gte(mealEntries.meal_time, windowStart),
          lte(mealEntries.meal_time, windowEnd)
        )
      )
      .orderBy(desc(mealEntries.meal_time));

    console.log(`🍽️ Found ${mealsData.length} food items across meals in analysis window`);

    // NEW: Analyze indoor air quality if room exposure data exists
    const airQualityTriggers: IndoorAirQualityTrigger[] = [];
    if (symptomEntry.indoor_air_quality?.rooms) {
      console.log('🏠 Analyzing indoor air quality from room exposures...');
      console.log('📦 symptomEntry.indoor_air_quality:', JSON.stringify(symptomEntry.indoor_air_quality, null, 2));

      // Transform camelCase JSONB fields to snake_case
      const roomExposures = symptomEntry.indoor_air_quality.rooms.map((room: any) => ({
        room_id: room.roomId || room.room_id,
        room_name: room.roomName || room.room_name,
        time_spent_minutes: room.timeSpentMinutes || room.time_spent_minutes,
        air_quality_snapshot: room.airQualitySnapshot || room.air_quality_snapshot
      }));

      for (const exposure of roomExposures) {
        try {
          console.log('🔍 Processing exposure:', JSON.stringify(exposure, null, 2));

          // Check if we have stored air quality snapshot
          const airQualitySnapshot = exposure.airQualitySnapshot || exposure.air_quality_snapshot;

          let airQualityMetrics: any;

          if (airQualitySnapshot) {
            // Use stored snapshot from registration time
            console.log(`📸 Using stored air quality snapshot from ${airQualitySnapshot.capturedAt || airQualitySnapshot.captured_at}`);
            airQualityMetrics = {
              co2: airQualitySnapshot.co2,
              voc: airQualitySnapshot.voc,
              humidity: airQualitySnapshot.humidity,
              temperature: airQualitySnapshot.temperature,
              radon: airQualitySnapshot.radon,
              pm25: airQualitySnapshot.pm25,
            };
          } else {
            // Fallback: fetch current air quality if snapshot not available
            console.log(`⚠️ No stored snapshot, fetching current air quality for ${exposure.room_name}`);
            const sensorData = await airthingsIntegrationService.getRoomAirQualityHistory(
              exposure.room_id,
              symptomEntry.started_at,
              exposure.time_spent_minutes
            );

            if (!sensorData || sensorData.length === 0) {
              console.warn(`No air quality data available for room ${exposure.room_name}`);
              continue;
            }

            const latestData = sensorData[0];
            airQualityMetrics = {
              co2: latestData.metrics.co2,
              voc: latestData.metrics.voc,
              humidity: latestData.metrics.humidity,
              temperature: latestData.metrics.temperature,
              radon: latestData.metrics.radon,
              pm25: latestData.metrics.pm25,
            };
          }

          // Assess air quality risk - map field names to expected format
          const riskAssessment = airthingsIntegrationService.assessAirQualityRisk({
            avg_co2: airQualityMetrics.co2,
            avg_voc: airQualityMetrics.voc,
            avg_humidity: airQualityMetrics.humidity,
            avg_radon: airQualityMetrics.radon,
            avg_pm25: airQualityMetrics.pm25,
          });

          // Calculate correlation score based on risk and time spent
          const correlationScore = this.calculateAirQualityCorrelationScore({
            risk_score: riskAssessment.risk_score,
            time_spent_minutes: exposure.time_spent_minutes || 30,
            symptom_severity: symptomEntry.severity,
          });

          if (correlationScore > 0.1) {
            airQualityTriggers.push({
              room_id: exposure.room_id,
              room_name: exposure.room_name,
              time_spent_minutes: exposure.time_spent_minutes || 30,
              correlation_score: correlationScore,
              confidence_level: correlationScore > 0.6 ? 'high' : correlationScore > 0.3 ? 'medium' : 'low',
              air_quality_metrics: airQualityMetrics,
              risk_assessment: riskAssessment,
            });
          }

          console.log(`   Room "${exposure.room_name}": Risk ${riskAssessment.risk_level}, Correlation ${(correlationScore * 100).toFixed(1)}%`);
        } catch (error) {
          console.error(`Failed to get air quality for room ${exposure.room_name}:`, error);
          // Continue with other rooms
        }
      }

      // Sort by correlation score
      airQualityTriggers.sort((a, b) => b.correlation_score - a.correlation_score);
      console.log(`🌬️ Found ${airQualityTriggers.length} potential air quality triggers`);
    }

    // Transform to match expected format
    const mealsInWindow = mealsData.map(meal => ({
      id: meal.meal_id,
      food_id: meal.food_id,
      amount: meal.amount,
      consumed_at: meal.meal_time,
      preparation_method: null, // Not tracked in new system yet
      estimated_histamine_load: 0, // Calculate from biogenic_amines
      trigger_score: 0, // Calculate from compatibility
      food_name_no: meal.food_name_no,
      food_name_en: meal.food_name_en,
      food_category: meal.food_category,
      food_compatibility: meal.food_compatibility,
      // Parse JSONB fields - they come as strings from database
      food_triggers: typeof meal.food_triggers === 'string'
        ? meal.food_triggers
        : JSON.stringify(meal.food_triggers || []),
      food_biogenic_amines: typeof meal.food_biogenic_amines === 'string'
        ? meal.food_biogenic_amines
        : JSON.stringify(meal.food_biogenic_amines || {}),
    }));
    
    // Get user's historical symptom patterns
    const historicalSymptoms = await this.getUserSymptomPatterns(user_id, symptomEntry.type);
    
    // Calculate correlation scores for each food
    const foodTriggers: FoodTrigger[] = [];
    
    for (const meal of mealsInWindow) {
      const timeToSymptom = symptomTime.getTime() - new Date(meal.consumed_at).getTime();
      const hoursToSymptom = timeToSymptom / (1000 * 60 * 60);
      
      // AI correlation algorithm
      const correlationScore = this.calculateCorrelationScore({
        food_compatibility: parseInt(meal.food_compatibility),
        time_to_symptom_hours: hoursToSymptom,
        amount: meal.amount,
        preparation_method: meal.preparation_method,
        estimated_histamine_load: meal.estimated_histamine_load || 0,
        trigger_score: meal.trigger_score || 0,
        symptom_severity: symptomEntry.severity,
        historical_patterns: historicalSymptoms,
        food_triggers: meal.food_triggers ? JSON.parse(meal.food_triggers) : []
      });
      
      if (correlationScore > 0.1) { // Only include foods with meaningful correlation
        foodTriggers.push({
          food_id: meal.food_id,
          food_name_no: meal.food_name_no,
          food_name_en: meal.food_name_en,
          compatibility: parseInt(meal.food_compatibility) as FoodCompatibility,
          correlation_score: correlationScore,
          time_consumed: new Date(meal.consumed_at),
          time_to_symptom_hours: hoursToSymptom,
          confidence_level: correlationScore > 0.7 ? 'high' : correlationScore > 0.4 ? 'medium' : 'low'
        });
      }
    }
    
    // Sort by correlation score (highest first)
    foodTriggers.sort((a, b) => b.correlation_score - a.correlation_score);
    
    // Create trigger timeline (include air quality)
    const timeline = this.createTriggerTimeline(mealsInWindow, symptomEntry, airQualityTriggers);

    // Find similar past episodes
    const similarEpisodes = await this.findSimilarEpisodes(user_id, symptomEntry);

    // Generate improvement suggestions (include air quality)
    const suggestions = this.generateImprovementSuggestions(foodTriggers, historicalSymptoms, airQualityTriggers);
    
    // Calculate analysis confidence
    const dataQualityScore = this.calculateDataQuality(mealsInWindow.length, analysis_window_hours);
    const analysisConfidence = this.calculateAnalysisConfidence(foodTriggers, dataQualityScore);
    
    // Save analysis to database
    const [savedAnalysis] = await db
      .insert(triggerAnalyses)
      .values({
        user_id,
        symptom_entry_id,
        analysis_window_start: windowStart,
        analysis_window_end: windowEnd,
        likely_food_triggers: JSON.stringify(foodTriggers.slice(0, 10)), // Top 10 triggers
        similar_past_episodes: JSON.stringify(similarEpisodes),
        improvement_suggestions: JSON.stringify(suggestions),
        analysis_confidence: analysisConfidence,
        data_quality_score: dataQualityScore
      })
      .returning();
    
    console.log(`✅ Analysis complete. Found ${foodTriggers.length} potential food triggers and ${airQualityTriggers.length} air quality triggers with ${(analysisConfidence * 100).toFixed(1)}% confidence`);

    return {
      analysis_id: savedAnalysis.id,
      user_id,
      symptom_entry_id,
      analysis_confidence: analysisConfidence,
      data_quality_score: dataQualityScore,
      likely_food_triggers: foodTriggers,
      likely_air_quality_triggers: airQualityTriggers.length > 0 ? airQualityTriggers : undefined,
      trigger_timeline: timeline,
      similar_past_episodes: similarEpisodes,
      symptom_pattern: historicalSymptoms,
      improvement_suggestions: suggestions,
      foods_to_avoid: suggestions.filter(s => s.includes('avoid')),
      foods_to_retry: suggestions.filter(s => s.includes('retry')),
      analysis_window_start: windowStart,
      analysis_window_end: windowEnd,
      total_meals_analyzed: mealsInWindow.length,
      created_at: new Date()
    };
  }
  
  /**
   * Advanced AI correlation algorithm
   * Considers multiple factors to calculate trigger probability
   */
  private calculateCorrelationScore(params: {
    food_compatibility: number;
    time_to_symptom_hours: number;
    amount: number;
    preparation_method: string | null;
    estimated_histamine_load: number;
    trigger_score: number;
    symptom_severity: number;
    historical_patterns: SymptomPattern;
    food_triggers: string[];
  }): number {
    let score = 0;
    
    // 1. SIGHI Compatibility Weight (0-40% of score)
    const compatibilityWeight = {
      0: 0.05,  // Safe foods get low base score
      1: 0.25,  // Medium foods get moderate score
      2: 0.35,  // Incompatible foods get high score
      3: 0.40   // Severe foods get highest score
    }[params.food_compatibility] || 0.20;
    
    score += compatibilityWeight;
    
    // 2. Time-to-symptom curve (0-30% of score)
    // MCAS symptoms typically appear 0.5-4 hours after trigger exposure
    const timeWeight = this.calculateTimeWeight(params.time_to_symptom_hours);
    score += timeWeight * 0.30;
    
    // 3. Histamine load (0-20% of score)
    if (params.estimated_histamine_load > 0) {
      const histamineWeight = Math.min(params.estimated_histamine_load / 100, 1); // Normalize to 0-1
      score += histamineWeight * 0.20;
    }
    
    // 4. Symptom severity correlation (0-15% of score)
    const severityBonus = params.symptom_severity > 7 ? 0.15 : params.symptom_severity / 7 * 0.15;
    score += severityBonus;
    
    // 5. Food triggers present (0-20% of score)
    if (params.food_triggers.length > 0) {
      const triggerBonus = Math.min(params.food_triggers.length / 3, 1) * 0.20;
      score += triggerBonus;
    }
    
    // 6. Amount consumed (0-10% of score)
    const amountWeight = Math.min(params.amount / 200, 1) * 0.10; // 200g as reference
    score += amountWeight;
    
    // 7. Preparation method modifier (-5% to +5%)
    const prepModifier = this.getPreparationModifier(params.preparation_method);
    score += prepModifier;
    
    // 8. Historical pattern boost (0-10% of score)
    if (params.historical_patterns.frequency_last_30_days > 2) {
      score += 0.10; // User has frequent episodes - higher correlation likelihood
    }
    
    // Ensure score stays within 0-1 range
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * Calculate time-based correlation weight
   * MCAS symptoms follow a predictable time pattern
   */
  private calculateTimeWeight(hours: number): number {
    // Optimal trigger window: 0.5-4 hours
    if (hours >= 0.5 && hours <= 4) {
      return 1.0; // Peak correlation time
    } else if (hours >= 0 && hours < 0.5) {
      return 0.7; // Very immediate reactions
    } else if (hours > 4 && hours <= 8) {
      return 0.6; // Delayed reactions
    } else if (hours > 8 && hours <= 24) {
      return 0.3; // Late reactions (less likely but possible)
    } else if (hours > 24 && hours <= 48) {
      return 0.1; // Very delayed (accumulative effect)
    } else {
      return 0.05; // Minimal correlation beyond 48h
    }
  }
  
  /**
   * Calculate air quality correlation score
   * Considers risk level, time spent, and symptom severity
   */
  private calculateAirQualityCorrelationScore(params: {
    risk_score: number; // 0-100
    time_spent_minutes: number;
    symptom_severity: number;
  }): number {
    let score = 0;

    // 1. Base risk score (0-50% of correlation)
    const normalizedRisk = params.risk_score / 100; // Convert to 0-1
    score += normalizedRisk * 0.50;

    // 2. Time spent weight (0-30% of correlation)
    // More time in poor air quality = higher correlation
    const timeWeight = Math.min(params.time_spent_minutes / 120, 1); // 2 hours = max weight
    score += timeWeight * 0.30;

    // 3. Symptom severity boost (0-20% of correlation)
    // Higher severity symptoms more likely from environmental triggers
    const severityWeight = params.symptom_severity / 10;
    score += severityWeight * 0.20;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Get preparation method impact modifier
   */
  private getPreparationModifier(method: string | null): number {
    if (!method) return 0;
    
    const modifiers: Record<string, number> = {
      'fermented': 0.05,    // Increases histamine
      'aged': 0.05,         // Increases histamine
      'canned': 0.03,       // May increase histamine
      'leftover': 0.03,     // Time increases histamine
      'fresh': -0.02,       // Reduces risk
      'cooked': -0.01,      // May reduce some triggers
      'raw': 0.02,          // May increase trigger risk
      'frozen': -0.01       // May reduce histamine
    };
    
    return modifiers[method.toLowerCase()] || 0;
  }
  
  /**
   * Get user's symptom patterns for ML analysis
   */
  private async getUserSymptomPatterns(userId: number, symptomType: string): Promise<SymptomPattern> {
    const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
    
    const recentSymptoms = await db
      .select()
      .from(symptomEntries)
      .where(
        and(
          eq(symptomEntries.user_id, userId),
          eq(symptomEntries.type, symptomType),
          gte(symptomEntries.started_at, thirtyDaysAgo)
        )
      )
      .orderBy(desc(symptomEntries.started_at));
    
    const frequency = recentSymptoms.length;
    const avgSeverity = recentSymptoms.length > 0 
      ? recentSymptoms.reduce((sum, s) => sum + s.severity, 0) / recentSymptoms.length 
      : 0;
    
    // Analyze time-of-day patterns
    const timePattern: Record<string, number> = {};
    recentSymptoms.forEach(symptom => {
      const hour = new Date(symptom.started_at).getHours();
      const timeSlot = hour < 6 ? 'night' : 
                     hour < 12 ? 'morning' : 
                     hour < 18 ? 'afternoon' : 'evening';
      timePattern[timeSlot] = (timePattern[timeSlot] || 0) + 1;
    });
    
    // Extract common triggers from user-reported data
    const commonTriggers: string[] = [];
    recentSymptoms.forEach(symptom => {
      if (symptom.suspected_triggers) {
        const triggers = JSON.parse(symptom.suspected_triggers);
        triggers.forEach((trigger: string) => {
          if (!commonTriggers.includes(trigger)) {
            commonTriggers.push(trigger);
          }
        });
      }
    });
    
    return {
      symptom_type: symptomType,
      frequency_last_30_days: frequency,
      avg_severity: avgSeverity,
      common_triggers: commonTriggers.slice(0, 5), // Top 5
      time_of_day_pattern: timePattern
    };
  }
  
  /**
   * Create chronological timeline of events leading to symptom
   */
  private createTriggerTimeline(
    meals: any[],
    symptomEntry: any,
    airQualityTriggers: IndoorAirQualityTrigger[] = []
  ): TriggerTimelineEvent[] {
    const timeline: TriggerTimelineEvent[] = [];

    // Add meal events
    meals.forEach(meal => {
      timeline.push({
        timestamp: new Date(meal.consumed_at),
        event_type: 'meal',
        description: `Consumed ${meal.amount}g ${meal.food_name_no}`,
        correlation_score: 0.5 // Will be calculated based on correlation analysis
      });
    });

    // Add air quality events
    airQualityTriggers.forEach(aqTrigger => {
      timeline.push({
        timestamp: new Date(symptomEntry.started_at), // Same time as symptom for room exposure
        event_type: 'air_quality',
        description: `Spent ${aqTrigger.time_spent_minutes} min in ${aqTrigger.room_name}`,
        correlation_score: aqTrigger.correlation_score,
        air_quality_data: {
          room_name: aqTrigger.room_name,
          risk_level: aqTrigger.risk_assessment.risk_level,
          concerns: aqTrigger.risk_assessment.concerns,
        },
      });
    });

    // Add symptom event
    timeline.push({
      timestamp: new Date(symptomEntry.started_at),
      event_type: 'symptom',
      description: `${symptomEntry.type} symptom started`,
      severity: symptomEntry.severity
    });

    // Sort chronologically
    timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return timeline;
  }
  
  /**
   * Find similar past symptom episodes for pattern recognition
   */
  private async findSimilarEpisodes(userId: number, currentSymptom: any): Promise<number[]> {
    const sixMonthsAgo = new Date(Date.now() - (180 * 24 * 60 * 60 * 1000));
    
    const similarSymptoms = await db
      .select({ id: symptomEntries.id })
      .from(symptomEntries)
      .where(
        and(
          eq(symptomEntries.user_id, userId),
          eq(symptomEntries.type, currentSymptom.type),
          gte(symptomEntries.started_at, sixMonthsAgo),
          // Similar severity (±2 points)
          gte(symptomEntries.severity, currentSymptom.severity - 2),
          lte(symptomEntries.severity, currentSymptom.severity + 2)
        )
      )
      .limit(10);
    
    return similarSymptoms.map(s => s.id);
  }
  
  /**
   * Generate AI-driven improvement suggestions
   */
  private generateImprovementSuggestions(
    triggers: FoodTrigger[],
    patterns: SymptomPattern,
    airQualityTriggers: IndoorAirQualityTrigger[] = []
  ): string[] {
    const suggestions: string[] = [];

    // High-confidence triggers
    const highConfidenceTriggers = triggers.filter(t => t.confidence_level === 'high');
    if (highConfidenceTriggers.length > 0) {
      suggestions.push(`Strongly consider avoiding: ${highConfidenceTriggers.map(t => t.food_name_no).join(', ')}`);
    }

    // Medium-confidence triggers needing investigation
    const mediumTriggers = triggers.filter(t => t.confidence_level === 'medium');
    if (mediumTriggers.length > 0) {
      suggestions.push(`Monitor carefully and consider elimination trial: ${mediumTriggers.map(t => t.food_name_no).join(', ')}`);
    }

    // Air quality suggestions
    const highRiskRooms = airQualityTriggers.filter(aq => aq.confidence_level === 'high' || aq.risk_assessment.risk_level === 'high');
    if (highRiskRooms.length > 0) {
      const roomNames = highRiskRooms.map(aq => aq.room_name).join(', ');
      const concerns = [...new Set(highRiskRooms.flatMap(aq => aq.risk_assessment.concerns))];
      suggestions.push(`Poor indoor air quality detected in: ${roomNames}. Concerns: ${concerns.join(', ')}`);
      suggestions.push('Consider improving ventilation, using air purifiers, or reducing time in affected rooms');
    }

    const moderateRiskRooms = airQualityTriggers.filter(aq => aq.confidence_level === 'medium' || aq.risk_assessment.risk_level === 'moderate');
    if (moderateRiskRooms.length > 0) {
      suggestions.push(`Monitor air quality in: ${moderateRiskRooms.map(aq => aq.room_name).join(', ')}`);
    }

    // Timing suggestions
    if (patterns.frequency_last_30_days > 10) {
      suggestions.push('Consider a structured elimination diet to identify trigger patterns');
    }

    // Time pattern suggestions
    const timePatterns = Object.entries(patterns.time_of_day_pattern);
    if (timePatterns.length > 0) {
      const peakTime = timePatterns.reduce((max, current) => current[1] > max[1] ? current : max);
      suggestions.push(`Symptoms occur most frequently in the ${peakTime[0]} - consider food timing adjustments`);
    }

    // Severity-based suggestions
    if (patterns.avg_severity > 7) {
      suggestions.push('High average symptom severity - consider stricter dietary management and medical consultation');
    }

    return suggestions;
  }
  
  /**
   * Calculate data quality score based on available information
   */
  private calculateDataQuality(mealCount: number, windowHours: number): number {
    let score = 0;
    
    // Meal data availability (0-50% of score)
    const expectedMeals = windowHours / 8; // Rough estimate: 3 meals per day
    const mealScore = Math.min(mealCount / expectedMeals, 1) * 0.5;
    score += mealScore;
    
    // Time window adequacy (0-30% of score)
    const windowScore = windowHours >= 48 ? 0.3 : (windowHours / 48) * 0.3;
    score += windowScore;
    
    // Base score for having any data (20% of score)
    score += 0.2;
    
    return Math.min(1, score);
  }
  
  /**
   * Calculate overall analysis confidence
   */
  private calculateAnalysisConfidence(triggers: FoodTrigger[], dataQuality: number): number {
    if (triggers.length === 0) return 0.1;
    
    const avgCorrelation = triggers.reduce((sum, t) => sum + t.correlation_score, 0) / triggers.length;
    const topTriggerScore = triggers[0]?.correlation_score || 0;
    
    // Weighted average of data quality, average correlation, and top correlation
    return (dataQuality * 0.3) + (avgCorrelation * 0.4) + (topTriggerScore * 0.3);
  }
  
  /**
   * Get all trigger analyses for a user
   */
  async getUserTriggerAnalyses(userId: number, limit: number = 10): Promise<TriggerAnalysisResult[]> {
    const analyses = await db
      .select()
      .from(triggerAnalyses)
      .where(eq(triggerAnalyses.user_id, userId))
      .orderBy(desc(triggerAnalyses.created_at))
      .limit(limit);
    
    return analyses.map(analysis => {
      // Parse JSONB fields - they might be strings or already parsed objects
      const parseLikelyTriggers = (data: any) => {
        if (!data) return [];
        if (typeof data === 'string') return JSON.parse(data);
        if (Array.isArray(data)) return data;
        return [];
      };

      const parseSimilarEpisodes = (data: any) => {
        if (!data) return [];
        if (typeof data === 'string') return JSON.parse(data);
        if (Array.isArray(data)) return data;
        return [];
      };

      const parseSuggestions = (data: any) => {
        if (!data) return [];
        if (typeof data === 'string') return JSON.parse(data);
        if (Array.isArray(data)) return data;
        return [];
      };

      return {
        analysis_id: analysis.id,
        user_id: analysis.user_id,
        symptom_entry_id: analysis.symptom_entry_id,
        analysis_confidence: analysis.analysis_confidence,
        data_quality_score: analysis.data_quality_score,
        likely_food_triggers: parseLikelyTriggers(analysis.likely_food_triggers),
        trigger_timeline: [], // Would need separate query for full timeline
        similar_past_episodes: parseSimilarEpisodes(analysis.similar_past_episodes),
        symptom_pattern: {} as SymptomPattern, // Would need separate calculation
        improvement_suggestions: parseSuggestions(analysis.improvement_suggestions),
        foods_to_avoid: [],
        foods_to_retry: [],
        analysis_window_start: analysis.analysis_window_start,
        analysis_window_end: analysis.analysis_window_end,
        total_meals_analyzed: 0, // Would need separate calculation
        created_at: analysis.created_at
      };
    });
  }
}

export const analyticsService = new AnalyticsService();