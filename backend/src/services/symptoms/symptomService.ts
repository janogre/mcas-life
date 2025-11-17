/**
 * Enhanced Symptom Service
 * Handles comprehensive symptom logging with extended trigger context
 */

import { db } from '../../db/connection.js';
import { symptomEntries, symptomTemplates, healthMetrics, foods } from '../../db/schema.js';
import { eq, and, desc, sql, inArray, gte } from 'drizzle-orm';
import type { NewSymptomEntry, SymptomEntry } from '../../db/schema.js';

export interface ExtendedSymptomInput {
  // Core symptom data
  category: 'skin' | 'digestive' | 'respiratory' | 'cardiovascular' | 'neurological' | 'musculoskeletal' | 'genitourinary' | 'systemic';
  type: string;
  custom_description?: string;
  severity: number; // 1-10
  duration_minutes: number;
  intensity_change: 'improving' | 'worsening' | 'stable';
  body_regions: string[];
  started_at: Date;
  ended_at?: Date;
  
  // Traditional triggers
  suspected_triggers?: string[];
  environmental_factors?: string[];
  
  // Extended context - Based on patient experience
  dao_taken_before_meal?: boolean;
  sensory_environment_calm?: boolean;
  compression_worn_during_day?: boolean;
  physical_fatigue_level?: number; // 0-10
  psychological_fatigue_level?: number; // 0-10
  time_since_last_meal_minutes?: number;
  had_heavy_food_today?: boolean;
  current_stress_factors?: string[];
  weather_conditions?: {
    temperature?: number;
    humidity?: number;
    pressure?: number;
    weather_type?: string;
  };
  menstrual_cycle_phase?: 'pre' | 'during' | 'post' | null;
  sleep_quality_last_night?: number; // 1-10
  reactions_in_last_24h?: number;
  cumulative_day_stress?: number; // 1-10
  
  // Treatment
  treatment_taken?: string;
  treatment_effective?: boolean;
  notes?: string;
}

export class SymptomService {
  /**
   * Log a new symptom with comprehensive context
   */
  static async logSymptom(userId: number, symptomData: ExtendedSymptomInput): Promise<SymptomEntry> {
    // Get today's health context to enhance correlation
    const today = new Date().toISOString().split('T')[0];
    const todaysContext = await this.getTodaysHealthContext(userId, today);
    
    // Count recent reactions for context
    const recentReactionsCount = await this.getReactionCount24h(userId, symptomData.started_at);

    const newSymptom: typeof symptomEntries.$inferInsert = {
      user_id: userId,
      category: symptomData.category,
      type: symptomData.type,
      custom_description: symptomData.custom_description,
      severity: symptomData.severity,
      duration_minutes: symptomData.duration_minutes,
      intensity_change: symptomData.intensity_change,
      body_regions: symptomData.body_regions,
      started_at: symptomData.started_at,
      ended_at: symptomData.ended_at,
      
      // Traditional triggers
      suspected_triggers: symptomData.suspected_triggers,
      environmental_factors: symptomData.environmental_factors,
      
      // Extended context
      dao_taken_before_meal: symptomData.dao_taken_before_meal,
      sensory_environment_calm: symptomData.sensory_environment_calm,
      compression_worn_during_day: symptomData.compression_worn_during_day,
      physical_fatigue_level: symptomData.physical_fatigue_level,
      psychological_fatigue_level: symptomData.psychological_fatigue_level,
      time_since_last_meal_minutes: symptomData.time_since_last_meal_minutes,
      had_heavy_food_today: symptomData.had_heavy_food_today,
      current_stress_factors: symptomData.current_stress_factors,
      weather_conditions: symptomData.weather_conditions,
      menstrual_cycle_phase: symptomData.menstrual_cycle_phase,
      sleep_quality_last_night: symptomData.sleep_quality_last_night,
      reactions_in_last_24h: recentReactionsCount,
      cumulative_day_stress: symptomData.cumulative_day_stress,
      
      // Treatment
      treatment_taken: symptomData.treatment_taken,
      treatment_effective: symptomData.treatment_effective,
      notes: symptomData.notes,
    };

    const result = await db.insert(symptomEntries).values(newSymptom).returning();
    const savedSymptom = result[0];

    // Trigger correlation analysis in the background (don't await)
    this.calculateCorrelationScore(savedSymptom.id, userId, symptomData.started_at);

    return savedSymptom;
  }

  /**
   * Quick log symptom with minimal input (for quick buttons)
   */
  static async quickLogSymptom(
    userId: number,
    category: string,
    type: string,
    severity: number = 5,
    weather_conditions?: {
      temperature?: number;
      humidity?: number;
      pressure?: number;
      weather_type?: string;
    }
  ): Promise<SymptomEntry> {
    // Get current context automatically
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const todaysContext = await this.getTodaysHealthContext(userId, today);

    const quickSymptomData: ExtendedSymptomInput = {
      category: category as any,
      type,
      severity,
      duration_minutes: 60, // Default 1 hour
      intensity_change: 'stable',
      body_regions: [category], // Use category as default body region
      started_at: now,

      // Auto-fill from today's context if available
      dao_taken_before_meal: todaysContext?.dao_supplement_taken,
      compression_worn_during_day: todaysContext?.compression_worn,
      sensory_environment_calm: todaysContext?.sensory_environment_controlled,
      had_heavy_food_today: todaysContext?.ate_heavy_food,
      physical_fatigue_level: todaysContext?.energy_level ? 10 - todaysContext.energy_level : undefined,
      psychological_fatigue_level: todaysContext?.stress_level,
      sleep_quality_last_night: todaysContext?.sleep_quality,
      cumulative_day_stress: todaysContext?.cumulative_stress_score ? Math.floor(todaysContext.cumulative_stress_score / 10) : undefined,

      // Use provided weather data from frontend, or fallback to today's context
      weather_conditions: weather_conditions || {
        temperature: todaysContext?.weather_temperature,
        humidity: todaysContext?.weather_humidity,
        pressure: todaysContext?.weather_barometric_pressure,
      },

      menstrual_cycle_phase: todaysContext?.menstrual_cycle_day ? this.calculateMenstrualPhase(todaysContext.menstrual_cycle_day) : null,
    };

    return this.logSymptom(userId, quickSymptomData);
  }

  /**
   * Get user's symptom history with filtering
   */
  static async getSymptomHistory(
    userId: number, 
    options: {
      category?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
    } = {}
  ): Promise<SymptomEntry[]> {
    const { category, startDate, endDate, limit = 50 } = options;

    let query = db.select()
      .from(symptomEntries)
      .where(eq(symptomEntries.user_id, userId))
      .orderBy(desc(symptomEntries.started_at));

    if (category) {
      query = query.where(
        and(
          eq(symptomEntries.user_id, userId),
          eq(symptomEntries.category, category as any)
        )
      );
    }

    if (startDate && endDate) {
      query = query.where(
        and(
          eq(symptomEntries.user_id, userId),
          sql`${symptomEntries.started_at} BETWEEN ${startDate} AND ${endDate}`
        )
      );
    }

    return await query.limit(limit);
  }

  /**
   * Get symptom statistics for analysis
   */
  static async getSymptomStats(userId: number, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const symptoms = await db.select()
      .from(symptomEntries)
      .where(
        and(
          eq(symptomEntries.user_id, userId),
          gte(symptomEntries.started_at, startDate)
        )
      );

    // Calculate statistics
    const categoryStats = symptoms.reduce((acc, symptom) => {
      acc[symptom.category] = (acc[symptom.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageSeverity = symptoms.length > 0 
      ? symptoms.reduce((sum, s) => sum + s.severity, 0) / symptoms.length 
      : 0;

    const triggersAnalysis = this.analyzeTriggerPatterns(symptoms);

    return {
      totalSymptoms: symptoms.length,
      categoryBreakdown: categoryStats,
      averageSeverity: Math.round(averageSeverity * 10) / 10,
      mostCommonTriggers: triggersAnalysis,
      daysAnalyzed: days
    };
  }

  /**
   * Smart correlation analysis - find patterns across all factors
   */
  static async getSmartCorrelations(userId: number, days: number = 90) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get symptoms with health context
    const symptomsWithContext = await db.select()
      .from(symptomEntries)
      .leftJoin(
        healthMetrics,
        and(
          eq(healthMetrics.user_id, symptomEntries.user_id),
          sql`DATE(${symptomEntries.started_at}) = ${healthMetrics.date}`
        )
      )
      .where(
        and(
          eq(symptomEntries.user_id, userId),
          gte(symptomEntries.started_at, startDate)
        )
      );

    const correlationAnalysis = this.analyzeMultiFactorCorrelations(symptomsWithContext);
    const historicalAnalysis = await this.analyzeHistoricalPatterns(userId);
    
    return {
      ...correlationAnalysis,
      historical: historicalAnalysis
    };
  }

  /**
   * Analyze historical patterns and day-to-day connections
   */
  private static async analyzeHistoricalPatterns(userId: number): Promise<any> {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    // Get symptoms from last 3 months for better historical analysis
    const symptoms = await db.select()
      .from(symptomEntries)
      .where(
        and(
          eq(symptomEntries.user_id, userId),
          gte(symptomEntries.started_at, threeMonthsAgo)
        )
      )
      .orderBy(symptomEntries.started_at);
    
    const dailyMetrics = await db.select()
      .from(healthMetrics)
      .where(
        and(
          eq(healthMetrics.user_id, userId),
          gte(healthMetrics.date, threeMonthsAgo.toISOString().split('T')[0])
        )
      )
      .orderBy(healthMetrics.date);

    return {
      cumulativeStressPattern: this.analyzeCumulativeStressPattern(symptoms, dailyMetrics),
      reactionCascadePattern: this.analyzeReactionCascadePattern(symptoms),
      recoveryTimePattern: this.analyzeRecoveryTimePattern(symptoms, dailyMetrics),
      vulnerabilityWindows: this.identifyVulnerabilityWindows(symptoms, dailyMetrics),
      dayOfWeekPatterns: this.analyzeDayOfWeekPatterns(symptoms),
      monthlyTrends: this.analyzeMonthlyTrends(symptoms),
      protectiveSequences: this.identifyProtectiveSequences(symptoms, dailyMetrics),
      riskBuildupIndicators: this.identifyRiskBuildupIndicators(symptoms, dailyMetrics)
    };
  }

  /**
   * Analyze cumulative stress buildup over time
   */
  private static analyzeCumulativeStressPattern(symptoms: any[], dailyMetrics: any[]) {
    const stressBuildup = [];
    const cumulativeScores = [];
    let runningStressScore = 0;

    // Create a map of daily metrics by date for easy lookup
    const metricsByDate = new Map();
    dailyMetrics.forEach(metric => {
      metricsByDate.set(metric.date, metric);
    });

    // Analyze stress buildup over consecutive days
    for (let i = 0; i < symptoms.length; i++) {
      const symptom = symptoms[i];
      const symptomDate = new Date(symptom.started_at).toISOString().split('T')[0];
      const dayMetric = metricsByDate.get(symptomDate);
      
      // Calculate cumulative stress score
      const dailyStress = dayMetric?.stress_level || 5;
      const sleepPenalty = dayMetric?.sleep_quality ? Math.max(0, 5 - dayMetric.sleep_quality) : 2;
      const reactionPenalty = symptom.severity * 0.5;
      
      runningStressScore += dailyStress + sleepPenalty + reactionPenalty;
      runningStressScore *= 0.9; // Natural decay factor
      
      if (runningStressScore > 30) {
        stressBuildup.push({
          date: symptomDate,
          cumulativeScore: Math.round(runningStressScore * 10) / 10,
          symptomSeverity: symptom.severity,
          riskLevel: 'high'
        });
      }
      
      cumulativeScores.push(runningStressScore);
    }

    return {
      pattern: stressBuildup,
      averageCumulativeScore: cumulativeScores.length > 0 
        ? Math.round((cumulativeScores.reduce((a, b) => a + b, 0) / cumulativeScores.length) * 10) / 10
        : 0,
      peakStressPoints: stressBuildup.filter(s => s.cumulativeScore > 40).length,
      recommendation: stressBuildup.length > 5 
        ? 'Stress akkumuleres over tid - vurder stressreduserende tiltak'
        : 'Stressnivå ser håndterbart ut over tid'
    };
  }

  /**
   * Analyze reaction cascade patterns (one reaction leading to more)
   */
  private static analyzeReactionCascadePattern(symptoms: any[]) {
    const cascades = [];
    
    for (let i = 0; i < symptoms.length - 1; i++) {
      const currentSymptom = symptoms[i];
      const nextSymptom = symptoms[i + 1];
      
      const timeDiff = new Date(nextSymptom.started_at).getTime() - new Date(currentSymptom.started_at).getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      // Look for reactions within 48 hours that are progressively worse
      if (hoursDiff <= 48 && nextSymptom.severity >= currentSymptom.severity) {
        cascades.push({
          initialDate: new Date(currentSymptom.started_at).toISOString().split('T')[0],
          initialSeverity: currentSymptom.severity,
          followUpSeverity: nextSymptom.severity,
          hoursApart: Math.round(hoursDiff * 10) / 10,
          cascadeType: nextSymptom.severity > currentSymptom.severity ? 'escalating' : 'prolonged'
        });
      }
    }

    return {
      cascadeCount: cascades.length,
      cascades: cascades.slice(0, 10), // Last 10 cascades
      averageEscalationTime: cascades.length > 0 
        ? Math.round((cascades.reduce((sum, c) => sum + c.hoursApart, 0) / cascades.length) * 10) / 10
        : 0,
      recommendation: cascades.length > 3 
        ? 'Reaksjoner fører til flere reaksjoner - vurder forebyggende tiltak etter første tegn'
        : 'Reaksjoner ser ut til å være isolerte hendelser'
    };
  }

  /**
   * Analyze recovery time patterns
   */
  private static analyzeRecoveryTimePattern(symptoms: any[], dailyMetrics: any[]) {
    const recoveryTimes = [];
    const metricsByDate = new Map();
    
    dailyMetrics.forEach(metric => {
      metricsByDate.set(metric.date, metric);
    });

    // Look for periods of good health after symptoms
    for (let i = 0; i < symptoms.length; i++) {
      const symptom = symptoms[i];
      const symptomDate = new Date(symptom.started_at);
      
      // Look ahead for recovery (no symptoms + good health metrics)
      let recoveryDays = 0;
      let checkDate = new Date(symptomDate);
      checkDate.setDate(checkDate.getDate() + 1);
      
      for (let j = 0; j < 14; j++) { // Check up to 2 weeks ahead
        const checkDateStr = checkDate.toISOString().split('T')[0];
        const dayMetric = metricsByDate.get(checkDateStr);
        
        // Check if there are symptoms on this day
        const symptomsOnDay = symptoms.filter(s => 
          new Date(s.started_at).toISOString().split('T')[0] === checkDateStr
        );
        
        if (symptomsOnDay.length === 0 && 
            dayMetric && 
            dayMetric.overall_wellness >= 7) {
          recoveryDays++;
          checkDate.setDate(checkDate.getDate() + 1);
        } else {
          break;
        }
      }
      
      if (recoveryDays > 0) {
        recoveryTimes.push(recoveryDays);
      }
    }

    return {
      averageRecoveryDays: recoveryTimes.length > 0 
        ? Math.round((recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length) * 10) / 10
        : 0,
      fastRecoveries: recoveryTimes.filter(r => r <= 2).length,
      slowRecoveries: recoveryTimes.filter(r => r >= 7).length,
      recommendation: recoveryTimes.length === 0
        ? 'Ikke nok data for å analysere restitusjonstid'
        : recoveryTimes.reduce((a, b) => a + b, 0) / recoveryTimes.length > 5
          ? 'Lang restitusjonstid - vurder behandlingsoptimalisering'
          : 'God restitusjonsevne'
    };
  }

  /**
   * Identify vulnerability windows (times of day/week when reactions are more likely)
   */
  private static identifyVulnerabilityWindows(symptoms: any[], dailyMetrics: any[]) {
    const timeOfDayCount = new Array(24).fill(0);
    const dayOfWeekCount = new Array(7).fill(0);
    
    symptoms.forEach(symptom => {
      const date = new Date(symptom.started_at);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      
      timeOfDayCount[hour]++;
      dayOfWeekCount[dayOfWeek]++;
    });

    const mostVulnerableHour = timeOfDayCount.indexOf(Math.max(...timeOfDayCount));
    const mostVulnerableDay = dayOfWeekCount.indexOf(Math.max(...dayOfWeekCount));
    
    const dayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];

    return {
      mostVulnerableTimeOfDay: `${mostVulnerableHour}:00-${mostVulnerableHour + 1}:00`,
      mostVulnerableCount: timeOfDayCount[mostVulnerableHour],
      mostVulnerableDay: dayNames[mostVulnerableDay],
      mostVulnerableDayCount: dayOfWeekCount[mostVulnerableDay],
      hourlyDistribution: timeOfDayCount,
      weeklyDistribution: dayOfWeekCount.map((count, index) => ({
        day: dayNames[index],
        count
      }))
    };
  }

  /**
   * Analyze day of week patterns
   */
  private static analyzeDayOfWeekPatterns(symptoms: any[]) {
    const dayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
    const dayCounts = new Array(7).fill(0);
    const daySeverities = new Array(7).fill(0);
    
    symptoms.forEach(symptom => {
      const dayOfWeek = new Date(symptom.started_at).getDay();
      dayCounts[dayOfWeek]++;
      daySeverities[dayOfWeek] += symptom.severity;
    });

    const dayAverages = dayCounts.map((count, index) => ({
      day: dayNames[index],
      count,
      avgSeverity: count > 0 ? Math.round((daySeverities[index] / count) * 10) / 10 : 0
    }));

    return dayAverages.sort((a, b) => b.count - a.count);
  }

  /**
   * Analyze monthly trends
   */
  private static analyzeMonthlyTrends(symptoms: any[]) {
    const monthlyData = new Map();
    
    symptoms.forEach(symptom => {
      const date = new Date(symptom.started_at);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { count: 0, severitySum: 0 });
      }
      
      const data = monthlyData.get(monthKey);
      data.count++;
      data.severitySum += symptom.severity;
    });

    return Array.from(monthlyData.entries()).map(([month, data]) => ({
      month,
      count: data.count,
      avgSeverity: Math.round((data.severitySum / data.count) * 10) / 10
    }));
  }

  /**
   * Identify protective sequences (what combinations prevent reactions)
   */
  private static identifyProtectiveSequences(symptoms: any[], dailyMetrics: any[]) {
    const protectiveFactors = [];
    const metricsByDate = new Map();
    
    dailyMetrics.forEach(metric => {
      metricsByDate.set(metric.date, metric);
    });

    // Find days with good metrics but no symptoms
    const goodDays = [];
    metricsByDate.forEach((metric, date) => {
      const symptomsOnDay = symptoms.filter(s => 
        new Date(s.started_at).toISOString().split('T')[0] === date
      );
      
      if (symptomsOnDay.length === 0 && 
          metric.overall_wellness >= 7 &&
          metric.stress_level <= 4) {
        goodDays.push(metric);
      }
    });

    // Analyze common factors in good days
    const daoCount = goodDays.filter(d => d.dao_supplement_taken).length;
    const compressionCount = goodDays.filter(d => d.compression_worn).length;
    const goodSleepCount = goodDays.filter(d => d.sleep_quality >= 7).length;

    return {
      totalGoodDays: goodDays.length,
      daoEffectiveness: goodDays.length > 0 ? Math.round((daoCount / goodDays.length) * 100) : 0,
      compressionEffectiveness: goodDays.length > 0 ? Math.round((compressionCount / goodDays.length) * 100) : 0,
      goodSleepCorrelation: goodDays.length > 0 ? Math.round((goodSleepCount / goodDays.length) * 100) : 0,
      recommendation: goodDays.length > 10
        ? 'Identifisert beskyttende faktorer - fortsett disse rutinene'
        : 'Trenger mer data for å identifisere beskyttende mønstre'
    };
  }

  /**
   * Identify risk buildup indicators
   */
  private static identifyRiskBuildupIndicators(symptoms: any[], dailyMetrics: any[]) {
    const riskIndicators = [];
    const metricsByDate = new Map();
    
    dailyMetrics.forEach(metric => {
      metricsByDate.set(metric.date, metric);
    });

    // Look for patterns that predict reactions
    symptoms.forEach(symptom => {
      const symptomDate = new Date(symptom.started_at).toISOString().split('T')[0];
      
      // Look at the 3 days before this symptom
      for (let i = 1; i <= 3; i++) {
        const checkDate = new Date(symptom.started_at);
        checkDate.setDate(checkDate.getDate() - i);
        const checkDateStr = checkDate.toISOString().split('T')[0];
        const metric = metricsByDate.get(checkDateStr);
        
        if (metric) {
          // Check for warning signs
          if (metric.stress_level >= 8) {
            riskIndicators.push({
              indicator: 'Høy stress',
              daysBeforeReaction: i,
              severity: symptom.severity
            });
          }
          
          if (metric.sleep_quality <= 3) {
            riskIndicators.push({
              indicator: 'Dårlig søvn',
              daysBeforeReaction: i,
              severity: symptom.severity
            });
          }
          
          if (metric.had_reactions_yesterday) {
            riskIndicators.push({
              indicator: 'Reaksjoner dagen før',
              daysBeforeReaction: i,
              severity: symptom.severity
            });
          }
        }
      }
    });

    // Group by indicator type
    const indicatorGroups = new Map();
    riskIndicators.forEach(indicator => {
      if (!indicatorGroups.has(indicator.indicator)) {
        indicatorGroups.set(indicator.indicator, []);
      }
      indicatorGroups.get(indicator.indicator).push(indicator);
    });

    const summary = Array.from(indicatorGroups.entries()).map(([type, indicators]) => ({
      type,
      occurrences: indicators.length,
      avgDaysBeforeReaction: Math.round((indicators.reduce((sum, ind) => sum + ind.daysBeforeReaction, 0) / indicators.length) * 10) / 10,
      avgResultingSeverity: Math.round((indicators.reduce((sum, ind) => sum + ind.severity, 0) / indicators.length) * 10) / 10,
      predictiveValue: indicators.length / symptoms.length > 0.3 ? 'Høy' : 'Lav'
    }));

    return {
      indicators: summary,
      totalWarningSignsDetected: riskIndicators.length,
      recommendation: summary.length > 0 
        ? 'Identifisert varseltegn - overvåk disse faktorene nøye'
        : 'Ingen tydelige varseltegn identifisert ennå'
    };
  }

  /**
   * Get today's risk factors based on context
   */
  static async getTodaysRiskFactors(userId: number): Promise<{
    riskLevel: number;
    factors: string[];
    recommendations: string[];
  }> {
    const today = new Date().toISOString().split('T')[0];
    const context = await this.getTodaysHealthContext(userId, today);
    
    if (!context) {
      return {
        riskLevel: 5,
        factors: ['Ingen daglig kontekst registrert'],
        recommendations: ['Registrer dagens helse-kontekst for bedre analyse']
      };
    }

    const riskFactors = [];
    const recommendations = [];
    let riskLevel = context.reaction_risk_level || 5;

    // Analyze current risk factors
    if (context.stress_level && context.stress_level >= 7) {
      riskFactors.push(`Høyt stressnivå (${context.stress_level}/10)`);
      recommendations.push('Prøv avslapningsteknikker');
    }

    if (context.sleep_quality && context.sleep_quality <= 4) {
      riskFactors.push(`Dårlig søvn (${context.sleep_quality}/10)`);
      recommendations.push('Prioriter bedre søvn i natt');
    }

    if (context.had_reactions_yesterday) {
      riskFactors.push('Reaksjoner i går');
      recommendations.push('Vær ekstra forsiktig med mat i dag');
    }

    if (!context.dao_supplement_taken) {
      recommendations.push('Vurder å ta DAO før måltider');
    }

    if (!context.compression_worn) {
      recommendations.push('Bruk kompresjon på bena');
    }

    return { riskLevel, factors: riskFactors, recommendations };
  }

  // Helper methods
  private static async getTodaysHealthContext(userId: number, date: string) {
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

  private static async getReactionCount24h(userId: number, fromTime: Date): Promise<number> {
    const yesterday = new Date(fromTime);
    yesterday.setDate(yesterday.getDate() - 1);

    const count = await db.select({ count: sql`COUNT(*)` })
      .from(symptomEntries)
      .where(
        and(
          eq(symptomEntries.user_id, userId),
          gte(symptomEntries.started_at, yesterday)
        )
      );

    return count[0]?.count as number || 0;
  }

  private static calculateMenstrualPhase(cycleDay: number): 'pre' | 'during' | 'post' {
    if (cycleDay <= 5) return 'during';
    if (cycleDay >= 24) return 'pre';
    return 'post';
  }

  private static analyzeTriggerPatterns(symptoms: SymptomEntry[]) {
    const triggerCounts = new Map<string, number>();
    
    symptoms.forEach(symptom => {
      symptom.suspected_triggers?.forEach(trigger => {
        triggerCounts.set(trigger, (triggerCounts.get(trigger) || 0) + 1);
      });
      
      symptom.current_stress_factors?.forEach(factor => {
        triggerCounts.set(`Stress: ${factor}`, (triggerCounts.get(`Stress: ${factor}`) || 0) + 1);
      });
    });

    return Array.from(triggerCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([trigger, count]) => ({ trigger, count }));
  }

  private static analyzeMultiFactorCorrelations(symptomsWithContext: any[]) {
    const analysis = {
      weatherCorrelations: new Map<string, number>(),
      sleepCorrelations: new Map<string, number>(),
      stressCorrelations: new Map<string, number>(),
      menstrualCorrelations: new Map<string, number>(),
      daoCorrelations: new Map<string, number>(),
      compressionCorrelations: new Map<string, number>(),
      foodTriggerPatterns: new Map<string, {count: number, avgSeverity: number}>(),
      multiFactorPatterns: [],
      insights: []
    };

    if (symptomsWithContext.length === 0) {
      return {
        message: 'Ikke nok data for korrelasjonsanalyse',
        patterns: analysis,
        confidence: 0
      };
    }

    // Weather correlation analysis
    this.analyzeWeatherCorrelations(symptomsWithContext, analysis);
    
    // Sleep quality correlation
    this.analyzeSleepCorrelations(symptomsWithContext, analysis);
    
    // Stress correlation analysis
    this.analyzeStressCorrelations(symptomsWithContext, analysis);
    
    // Menstrual cycle correlation (if applicable)
    this.analyzeMenstrualCorrelations(symptomsWithContext, analysis);
    
    // DAO supplement correlation
    this.analyzeDaoCorrelations(symptomsWithContext, analysis);
    
    // Compression wear correlation
    this.analyzeCompressionCorrelations(symptomsWithContext, analysis);
    
    // Food trigger pattern analysis
    this.analyzeFoodTriggerPatterns(symptomsWithContext, analysis);
    
    // Multi-factor pattern detection
    this.detectMultiFactorPatterns(symptomsWithContext, analysis);
    
    // Generate insights
    this.generateActionableInsights(analysis);

    const confidence = this.calculateAnalysisConfidence(symptomsWithContext.length);

    return {
      message: `Korrelasjonsanalyse fullført med ${symptomsWithContext.length} symptomer`,
      patterns: analysis,
      confidence
    };
  }

  private static analyzeWeatherCorrelations(symptoms: any[], analysis: any) {
    const weatherSeverityMap = new Map<string, number[]>();
    
    symptoms.forEach(symptom => {
      if (symptom.weather_conditions) {
        const conditions = Array.isArray(symptom.weather_conditions) 
          ? symptom.weather_conditions 
          : [symptom.weather_conditions];
        
        conditions.forEach(condition => {
          if (!weatherSeverityMap.has(condition)) {
            weatherSeverityMap.set(condition, []);
          }
          weatherSeverityMap.get(condition)!.push(symptom.severity);
        });
      }
    });

    // Calculate correlation scores for weather conditions
    weatherSeverityMap.forEach((severities, condition) => {
      const avgSeverity = severities.reduce((a, b) => a + b, 0) / severities.length;
      const overallAvg = symptoms.reduce((sum, s) => sum + s.severity, 0) / symptoms.length;
      
      // Correlation score: positive if weather condition correlates with higher severity
      const correlation = (avgSeverity - overallAvg) / 10; // Normalize to -1 to 1 scale
      analysis.weatherCorrelations.set(condition, Math.round(correlation * 100) / 100);
    });
  }

  private static analyzeSleepCorrelations(symptoms: any[], analysis: any) {
    const sleepSeverityBuckets = { poor: [], average: [], good: [] };
    
    symptoms.forEach(symptom => {
      if (symptom.sleep_quality_last_night !== null && symptom.sleep_quality_last_night !== undefined) {
        const quality = symptom.sleep_quality_last_night;
        if (quality <= 3) sleepSeverityBuckets.poor.push(symptom.severity);
        else if (quality <= 6) sleepSeverityBuckets.average.push(symptom.severity);
        else sleepSeverityBuckets.good.push(symptom.severity);
      }
    });

    Object.entries(sleepSeverityBuckets).forEach(([quality, severities]) => {
      if (severities.length > 0) {
        const avgSeverity = severities.reduce((a, b) => a + b, 0) / severities.length;
        analysis.sleepCorrelations.set(quality, Math.round(avgSeverity * 100) / 100);
      }
    });
  }

  private static analyzeStressCorrelations(symptoms: any[], analysis: any) {
    const stressFactorCounts = new Map<string, {count: number, severitySum: number}>();
    
    symptoms.forEach(symptom => {
      if (symptom.current_stress_factors) {
        const factors = Array.isArray(symptom.current_stress_factors) 
          ? symptom.current_stress_factors 
          : [symptom.current_stress_factors];
        
        factors.forEach(factor => {
          if (!stressFactorCounts.has(factor)) {
            stressFactorCounts.set(factor, {count: 0, severitySum: 0});
          }
          const current = stressFactorCounts.get(factor)!;
          current.count++;
          current.severitySum += symptom.severity;
        });
      }
    });

    stressFactorCounts.forEach((data, factor) => {
      const avgSeverity = data.severitySum / data.count;
      analysis.stressCorrelations.set(factor, Math.round(avgSeverity * 100) / 100);
    });
  }

  private static analyzeMenstrualCorrelations(symptoms: any[], analysis: any) {
    const phaseSeverities = { pre: [], during: [], post: [] };
    
    symptoms.forEach(symptom => {
      if (symptom.menstrual_cycle_phase) {
        const phase = symptom.menstrual_cycle_phase;
        if (phaseSeverities[phase]) {
          phaseSeverities[phase].push(symptom.severity);
        }
      }
    });

    Object.entries(phaseSeverities).forEach(([phase, severities]) => {
      if (severities.length > 0) {
        const avgSeverity = severities.reduce((a, b) => a + b, 0) / severities.length;
        analysis.menstrualCorrelations.set(phase, Math.round(avgSeverity * 100) / 100);
      }
    });
  }

  private static analyzeDaoCorrelations(symptoms: any[], analysis: any) {
    const daoTaken = symptoms.filter(s => s.dao_taken_before_meal === true);
    const daoNotTaken = symptoms.filter(s => s.dao_taken_before_meal === false);
    
    if (daoTaken.length > 0) {
      const avgSeverityWithDao = daoTaken.reduce((sum, s) => sum + s.severity, 0) / daoTaken.length;
      analysis.daoCorrelations.set('with_dao', Math.round(avgSeverityWithDao * 100) / 100);
    }
    
    if (daoNotTaken.length > 0) {
      const avgSeverityWithoutDao = daoNotTaken.reduce((sum, s) => sum + s.severity, 0) / daoNotTaken.length;
      analysis.daoCorrelations.set('without_dao', Math.round(avgSeverityWithoutDao * 100) / 100);
    }
  }

  private static analyzeCompressionCorrelations(symptoms: any[], analysis: any) {
    const withCompression = symptoms.filter(s => s.compression_worn_during_day === true);
    const withoutCompression = symptoms.filter(s => s.compression_worn_during_day === false);
    
    if (withCompression.length > 0) {
      const avgSeverity = withCompression.reduce((sum, s) => sum + s.severity, 0) / withCompression.length;
      analysis.compressionCorrelations.set('with_compression', Math.round(avgSeverity * 100) / 100);
    }
    
    if (withoutCompression.length > 0) {
      const avgSeverity = withoutCompression.reduce((sum, s) => sum + s.severity, 0) / withoutCompression.length;
      analysis.compressionCorrelations.set('without_compression', Math.round(avgSeverity * 100) / 100);
    }
  }

  private static analyzeFoodTriggerPatterns(symptoms: any[], analysis: any) {
    symptoms.forEach(symptom => {
      if (symptom.suspected_triggers) {
        const triggers = Array.isArray(symptom.suspected_triggers) 
          ? symptom.suspected_triggers 
          : [symptom.suspected_triggers];
        
        triggers.forEach(trigger => {
          if (!analysis.foodTriggerPatterns.has(trigger)) {
            analysis.foodTriggerPatterns.set(trigger, {count: 0, avgSeverity: 0});
          }
          const current = analysis.foodTriggerPatterns.get(trigger)!;
          const newCount = current.count + 1;
          const newAvg = (current.avgSeverity * current.count + symptom.severity) / newCount;
          
          analysis.foodTriggerPatterns.set(trigger, {
            count: newCount,
            avgSeverity: Math.round(newAvg * 100) / 100
          });
        });
      }
    });
  }

  private static detectMultiFactorPatterns(symptoms: any[], analysis: any) {
    // Detect patterns where multiple factors combine to increase risk
    const patterns = [];
    
    // Pattern: Poor sleep + High stress
    const poorSleepHighStress = symptoms.filter(s => 
      s.sleep_quality_last_night <= 4 && 
      s.current_stress_factors && 
      s.current_stress_factors.length > 0
    );
    
    if (poorSleepHighStress.length >= 2) {
      const avgSeverity = poorSleepHighStress.reduce((sum, s) => sum + s.severity, 0) / poorSleepHighStress.length;
      patterns.push({
        name: 'Dårlig søvn + Høy stress',
        occurrences: poorSleepHighStress.length,
        avgSeverity: Math.round(avgSeverity * 100) / 100,
        description: 'Kombinasjon av dårlig søvn og stress øker symptom-alvorlighet'
      });
    }

    // Pattern: No DAO + Heavy food
    const noDaoHeavyFood = symptoms.filter(s => 
      s.dao_taken_before_meal === false && 
      s.had_heavy_food_today === true
    );
    
    if (noDaoHeavyFood.length >= 2) {
      const avgSeverity = noDaoHeavyFood.reduce((sum, s) => sum + s.severity, 0) / noDaoHeavyFood.length;
      patterns.push({
        name: 'Ingen DAO + Tung mat',
        occurrences: noDaoHeavyFood.length,
        avgSeverity: Math.round(avgSeverity * 100) / 100,
        description: 'Tung mat uten DAO-supplement øker reaksjonsrisiko'
      });
    }

    analysis.multiFactorPatterns = patterns;
  }

  private static generateActionableInsights(analysis: any) {
    const insights = [];

    // DAO effectiveness insight
    const daoWith = analysis.daoCorrelations.get('with_dao');
    const daoWithout = analysis.daoCorrelations.get('without_dao');
    if (daoWith !== undefined && daoWithout !== undefined) {
      const difference = daoWithout - daoWith;
      if (difference > 1) {
        insights.push({
          type: 'positive',
          message: `DAO-supplement reduserer symptom-alvorlighet med ${Math.round(difference * 10) / 10} poeng i gjennomsnitt`,
          action: 'Fortsett å ta DAO før måltider'
        });
      } else if (difference < -0.5) {
        insights.push({
          type: 'caution',
          message: 'DAO-supplement ser ikke ut til å hjelpe',
          action: 'Diskuter dosering eller timing med lege'
        });
      }
    }

    // Sleep quality insight
    const poorSleep = analysis.sleepCorrelations.get('poor');
    const goodSleep = analysis.sleepCorrelations.get('good');
    if (poorSleep !== undefined && goodSleep !== undefined && poorSleep > goodSleep + 1) {
      insights.push({
        type: 'important',
        message: `Dårlig søvn øker symptom-alvorlighet med ${Math.round((poorSleep - goodSleep) * 10) / 10} poeng`,
        action: 'Prioriter bedre søvnhygiene'
      });
    }

    // Weather pattern insight
    let worstWeather = null;
    let worstScore = -Infinity;
    analysis.weatherCorrelations.forEach((score, condition) => {
      if (score > worstScore) {
        worstScore = score;
        worstWeather = condition;
      }
    });
    
    if (worstWeather && worstScore > 0.3) {
      insights.push({
        type: 'warning',
        message: `${worstWeather} er sterkt korrelert med høyere symptom-alvorlighet`,
        action: `Vær ekstra forsiktig når det er ${worstWeather.toLowerCase()}`
      });
    }

    analysis.insights = insights;
  }

  private static calculateAnalysisConfidence(dataPoints: number): number {
    // Confidence increases with more data points, plateaus around 50 data points
    if (dataPoints < 5) return 0.2;
    if (dataPoints < 10) return 0.4;
    if (dataPoints < 20) return 0.6;
    if (dataPoints < 50) return 0.8;
    return 0.9;
  }

  private static async calculateCorrelationScore(symptomId: number, userId: number, symptomTime: Date) {
    // Background correlation analysis - would implement food correlation logic here
    // For now, just update with a placeholder score
    await db.update(symptomEntries)
      .set({
        correlation_score: 0.5,
        updated_at: sql`NOW()`
      })
      .where(eq(symptomEntries.id, symptomId));
  }

  /**
   * NEW METHODS FOR SYMPTOM REGISTRATION v2.0
   */

  /**
   * Enrich symptom with automatic context (weather, Airthings, etc.)
   * Called after quick capture to add environmental data
   */
  static async enrichSymptomWithContext(symptomId: number): Promise<{
    weather?: any;
    airQuality?: any;
    enrichmentStatus: 'minimal' | 'partial' | 'complete';
  }> {
    try {
      const symptom = await db.select().from(symptomEntries).where(eq(symptomEntries.id, symptomId)).limit(1);

      if (!symptom || symptom.length === 0) {
        throw new Error('Symptom not found');
      }

      const enrichmentData: any = {};
      let enrichmentStatus: 'minimal' | 'partial' | 'complete' = 'minimal';

      // Try to enrich with weather data if not already present
      if (!symptom[0].weather_conditions) {
        // Weather enrichment would happen here
        // For now, mark as partial
        enrichmentStatus = 'partial';
      }

      // Update enrichment status
      await db.update(symptomEntries)
        .set({
          enrichment_status: enrichmentStatus,
          updated_at: sql`NOW()`
        })
        .where(eq(symptomEntries.id, symptomId));

      return {
        weather: symptom[0].weather_conditions,
        airQuality: symptom[0].indoor_air_quality,
        enrichmentStatus,
      };
    } catch (error) {
      console.error('Error enriching symptom with context:', error);
      throw error;
    }
  }

  /**
   * Get follow-up form for a symptom
   * Returns the template-specific questions for detailed capture
   */
  static async getFollowUpForm(symptomId: number): Promise<{
    symptomType: string;
    questions: any[];
    currentAnswers?: any;
  }> {
    try {
      const symptom = await db.select().from(symptomEntries).where(eq(symptomEntries.id, symptomId)).limit(1);

      if (!symptom || symptom.length === 0) {
        throw new Error('Symptom not found');
      }

      // Return basic form structure
      // In a full implementation, this would fetch from symptom_templates table
      return {
        symptomType: symptom[0].type,
        questions: [],
        currentAnswers: symptom[0].follow_up_answers,
      };
    } catch (error) {
      console.error('Error getting follow-up form:', error);
      throw error;
    }
  }

  /**
   * Complete follow-up for a symptom
   * Saves the detailed answers from template-specific questions
   */
  static async completeFollowUp(
    symptomId: number,
    answers: any,
    roomLocations?: Array<{ room_id: string; room_name: string; time_spent_minutes?: number }>
  ): Promise<SymptomEntry> {
    try {
      const updateData: any = {
        follow_up_answers: answers,
        follow_up_completed_at: new Date(),
        enrichment_status: 'complete' as const,
        updated_at: sql`NOW()`,
      };

      if (roomLocations && roomLocations.length > 0) {
        updateData.room_locations = roomLocations;
      }

      const result = await db.update(symptomEntries)
        .set(updateData)
        .where(eq(symptomEntries.id, symptomId))
        .returning();

      if (!result || result.length === 0) {
        throw new Error('Symptom not found');
      }

      return result[0];
    } catch (error) {
      console.error('Error completing follow-up:', error);
      throw error;
    }
  }

  /**
   * Create quick symptom capture (Tier 1: 5-10 seconds)
   * Minimal data - just what's needed to capture the moment
   */
  static async quickCaptureSymptom(
    userId: number,
    templateId: number,
    severity: number
  ): Promise<SymptomEntry> {
    try {
      // Fetch template to get category and name
      const template = await db
        .select()
        .from(symptomTemplates)
        .where(eq(symptomTemplates.id, templateId))
        .limit(1);

      if (!template || template.length === 0) {
        throw new Error(`Symptom template with ID ${templateId} not found`);
      }

      const templateData = template[0];
      const now = new Date();

      const newSymptom: typeof symptomEntries.$inferInsert = {
        user_id: userId,
        severity,
        started_at: now,
        capture_method: 'quick',
        enrichment_status: 'minimal',

        // Use template data
        category: templateData.category,
        type: templateData.name_no, // Use Norwegian name from template
        duration_minutes: 60,
        intensity_change: 'stable',
        body_regions: templateData.common_body_regions || [],
      };

      const result = await db.insert(symptomEntries).values(newSymptom).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating quick capture:', error);
      throw error;
    }
  }

  /**
   * Get symptoms that need follow-up
   * Returns symptoms with enrichment_status !== 'complete'
   */
  static async getSymptomsNeedingFollowUp(userId: number, limit: number = 10): Promise<SymptomEntry[]> {
    try {
      const symptoms = await db
        .select()
        .from(symptomEntries)
        .where(
          and(
            eq(symptomEntries.user_id, userId),
            sql`${symptomEntries.enrichment_status} != 'complete'`
          )
        )
        .orderBy(desc(symptomEntries.started_at))
        .limit(limit);

      return symptoms;
    } catch (error) {
      console.error('Error getting symptoms needing follow-up:', error);
      throw error;
    }
  }
}

export type { SymptomEntry };