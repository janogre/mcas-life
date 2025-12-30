import api from '../lib/api';

export interface DashboardStats {
  symptomsThisWeek: number;
  symptomsLastWeek: number;
  foodsTrackedThisWeek: number;
  foodsTrackedLastWeek: number;
  analysesCount: number;
  lastAnalysisDate: string | null;
  triggerScore: number | null;
  triggerScoreChange: number;
}

export interface RecentActivity {
  id: number;
  type: 'meal' | 'symptom' | 'supplement' | 'health_metric' | 'activity';
  title: string;
  timestamp: string;
  severity?: 'safe' | 'medium' | 'high' | 'severe';
  icon: string;
}

export interface DashboardData {
  stats: DashboardStats;
  recentActivities: RecentActivity[];
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Get symptom stats for this week
    const symptomStatsResponse = await api.get('/symptoms/stats', {
      params: { days: 7 }
    });

    // Get last week's symptom stats for comparison
    const lastWeekSymptomStatsResponse = await api.get('/symptoms/stats', {
      params: { days: 14 }
    });

    // Get diary entries for this week to count foods
    const endDate = new Date();
    const startDateThisWeek = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startDateLastWeek = new Date(endDate.getTime() - 14 * 24 * 60 * 60 * 1000);

    const diaryEntriesThisWeek = await api.get('/diary/entries', {
      params: {
        type: 'meal',
        startDate: startDateThisWeek.toISOString(),
        endDate: endDate.toISOString(),
        limit: 1000
      }
    });

    const diaryEntriesLastWeek = await api.get('/diary/entries', {
      params: {
        type: 'meal',
        startDate: startDateLastWeek.toISOString(),
        endDate: startDateThisWeek.toISOString(),
        limit: 1000
      }
    });

    console.log('📊 Diary entries this week response:', diaryEntriesThisWeek.data);

    // Count unique foods this week
    const foodsThisWeek = new Set<number>();
    const entriesThisWeek = Array.isArray(diaryEntriesThisWeek.data?.data)
      ? diaryEntriesThisWeek.data.data
      : (diaryEntriesThisWeek.data?.entries || []);

    entriesThisWeek.forEach((entry: any) => {
      const foods = entry.data?.foods || entry.foods || [];
      foods.forEach((food: any) => {
        if (food.sighi_id || food.food_id) {
          foodsThisWeek.add(food.sighi_id || food.food_id);
        }
      });
    });

    // Count unique foods last week
    const foodsLastWeek = new Set<number>();
    const entriesLastWeek = Array.isArray(diaryEntriesLastWeek.data?.data)
      ? diaryEntriesLastWeek.data.data
      : (diaryEntriesLastWeek.data?.entries || []);

    entriesLastWeek.forEach((entry: any) => {
      const foods = entry.data?.foods || entry.foods || [];
      foods.forEach((food: any) => {
        if (food.sighi_id || food.food_id) {
          foodsLastWeek.add(food.sighi_id || food.food_id);
        }
      });
    });

    // Get correlation/analysis data
    let analysesCount = 0;
    let lastAnalysisDate: string | null = null;
    let triggerScore: number | null = null;
    let triggerScoreChange = 0;

    try {
      const correlationsResponse = await api.get('/symptoms/correlations', {
        params: { days: 90 }
      });

      if (correlationsResponse.data?.data) {
        const correlations = correlationsResponse.data.data;

        // Count analyses (food correlations + environmental correlations)
        analysesCount = (correlations.foodCorrelations?.length || 0) +
                        (correlations.environmentalCorrelations?.length || 0);

        // Get last analysis date from most recent correlation
        if (correlations.foodCorrelations?.[0]?.lastOccurrence) {
          lastAnalysisDate = correlations.foodCorrelations[0].lastOccurrence;
        }

        // Calculate trigger score (average confidence of top triggers)
        if (correlations.foodCorrelations && correlations.foodCorrelations.length > 0) {
          const topTriggers = correlations.foodCorrelations.slice(0, 5);
          const avgConfidence = topTriggers.reduce((sum: number, t: any) => sum + (t.confidence || 0), 0) / topTriggers.length;
          triggerScore = Math.round(avgConfidence * 10) / 10;

          // Simplified trend calculation (would need historical data for real trend)
          triggerScoreChange = 0.5;
        }
      }
    } catch (error) {
      console.warn('Could not fetch correlations:', error);
    }

    const symptomsThisWeek = symptomStatsResponse.data?.data?.totalSymptoms || 0;
    const symptomsTotal = lastWeekSymptomStatsResponse.data?.data?.totalSymptoms || 0;
    const symptomsLastWeek = symptomsTotal - symptomsThisWeek;

    return {
      symptomsThisWeek,
      symptomsLastWeek,
      foodsTrackedThisWeek: foodsThisWeek.size,
      foodsTrackedLastWeek: foodsLastWeek.size,
      analysesCount,
      lastAnalysisDate,
      triggerScore,
      triggerScoreChange
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Get recent activities from diary
 */
export async function getRecentActivities(limit = 10): Promise<RecentActivity[]> {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

    const response = await api.get('/diary/entries', {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit
      }
    });

    console.log('📋 Recent activities response:', response.data);

    // Handle different response structures
    const entries = Array.isArray(response.data?.data)
      ? response.data.data
      : (response.data?.entries || []);

    if (!Array.isArray(entries) || entries.length === 0) {
      return [];
    }

    const activities: RecentActivity[] = entries.map((entry: any) => {
      const activity: RecentActivity = {
        id: entry.id,
        type: entry.type,
        title: getActivityTitle(entry),
        timestamp: entry.timestamp,
        icon: getActivityIcon(entry.type),
        severity: getActivitySeverity(entry)
      };
      return activity;
    });

    // Sort by timestamp descending
    return activities.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  } catch (error) {
    console.error('Error fetching recent activities:', error);
    throw error;
  }
}

/**
 * Get combined dashboard data
 */
export async function getDashboardData(): Promise<DashboardData> {
  const [stats, recentActivities] = await Promise.all([
    getDashboardStats(),
    getRecentActivities()
  ]);

  return {
    stats,
    recentActivities
  };
}

// Helper functions
function getActivityTitle(entry: any): string {
  switch (entry.type) {
    case 'meal':
      const foodCount = entry.data?.foods?.length || 0;
      const mealType = entry.data?.meal_type || 'meal';
      return `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} logged (${foodCount} foods)`;

    case 'symptom':
      const symptomType = entry.data?.symptom_type || 'symptom';
      return `${symptomType} logged`;

    case 'supplement':
      const suppName = entry.data?.supplement_name || 'Supplement';
      return `${suppName} taken`;

    case 'health_metric':
      return 'Health metrics logged';

    case 'activity':
      return entry.data?.activity_type || 'Activity logged';

    default:
      return 'Activity logged';
  }
}

function getActivityIcon(type: string): string {
  switch (type) {
    case 'meal':
      return 'Utensils';
    case 'symptom':
      return 'AlertCircle';
    case 'supplement':
      return 'Pill';
    case 'health_metric':
      return 'Heart';
    case 'activity':
      return 'Activity';
    default:
      return 'Circle';
  }
}

function getActivitySeverity(entry: any): 'safe' | 'medium' | 'high' | 'severe' | undefined {
  if (entry.type === 'symptom') {
    const severity = entry.data?.severity || 5;
    if (severity <= 3) return 'safe';
    if (severity <= 5) return 'medium';
    if (severity <= 7) return 'high';
    return 'severe';
  }

  if (entry.type === 'meal') {
    // Check if meal has any high-compatibility foods
    const foods = entry.data?.foods || [];
    const hasIncompatible = foods.some((f: any) => f.compatibility >= 2);
    if (hasIncompatible) return 'severe';

    const hasMedium = foods.some((f: any) => f.compatibility === 1);
    if (hasMedium) return 'medium';

    return 'safe';
  }

  return undefined;
}
