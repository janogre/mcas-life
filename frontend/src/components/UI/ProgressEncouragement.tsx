import React, { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, Target, Award, CheckCircle } from 'lucide-react';
import { mealsApi, symptomsApi } from '../../lib/api';

interface ProgressStats {
  mealCount: number;
  symptomCount: number;
  daysTracking: number;
}

interface ProgressEncouragementProps {
  compact?: boolean;
}

/**
 * Progress Encouragement Component
 * Shows user progress with encouraging messages to motivate continued tracking
 */
export function ProgressEncouragement({ compact = false }: ProgressEncouragementProps) {
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [meals, symptoms] = await Promise.all([
        mealsApi.getMeals({ limit: 1000 }), // Get all meals to count
        symptomsApi.getRecent(30), // Last 30 days
      ]);

      setStats({
        mealCount: meals.length,
        symptomCount: symptoms.length,
        daysTracking: calculateDaysTracking(meals, symptoms),
      });
    } catch (error) {
      console.error('Failed to load progress stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysTracking = (meals: any[], symptoms: any[]): number => {
    if (meals.length === 0 && symptoms.length === 0) return 0;

    // Get oldest entry date
    const dates: Date[] = [];
    meals.forEach(m => dates.push(new Date(m.meal_time || m.created_at)));
    symptoms.forEach(s => dates.push(new Date(s.started_at || s.created_at)));

    if (dates.length === 0) return 0;

    const oldestDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - oldestDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  const getEncouragementMessage = (stats: ProgressStats): { message: string; icon: any; level: string } => {
    const { mealCount, symptomCount, daysTracking } = stats;
    const totalEntries = mealCount + symptomCount;

    // Milestone-based encouragement
    if (totalEntries === 0) {
      return {
        message: 'Velkommen! Start med å logge ditt første måltid eller symptom.',
        icon: Sparkles,
        level: 'start'
      };
    }

    if (totalEntries < 10) {
      return {
        message: `Du har logget ${totalEntries} oppføringer. Flott start! Fortsett å logge for bedre AI-analyse.`,
        icon: TrendingUp,
        level: 'beginner'
      };
    }

    if (totalEntries < 30) {
      return {
        message: `Fantastisk! ${totalEntries} oppføringer logget. Du bygger et godt datagrunnlag.`,
        icon: Target,
        level: 'progress'
      };
    }

    if (totalEntries < 50) {
      return {
        message: `Strålende innsats! ${totalEntries} oppføringer på ${daysTracking} dager. AI-analysen blir mer nøyaktig for hver dag.`,
        icon: Award,
        level: 'good'
      };
    }

    // For experienced users
    if (daysTracking >= 7) {
      return {
        message: `Utmerket! ${mealCount} måltider og ${symptomCount} symptomer over ${daysTracking} dager. Du har nok data for pålitelig trigger-analyse.`,
        icon: CheckCircle,
        level: 'excellent'
      };
    }

    return {
      message: `Imponerende! ${totalEntries} oppføringer logget. Du tar kontroll over din MCAS-helse.`,
      icon: Award,
      level: 'excellent'
    };
  };

  const getDataSufficiencyMessage = (stats: ProgressStats): { message: string; color: string } | null => {
    const { mealCount, daysTracking } = stats;

    if (daysTracking < 3) {
      return {
        message: 'Tips: Du trenger 3-7 dager med data for meningsfull trigger-analyse.',
        color: 'text-blue-700'
      };
    }

    if (mealCount < 20 && daysTracking >= 7) {
      return {
        message: 'Tips: Logg flere måltider for å forbedre AI-analysens nøyaktighet.',
        color: 'text-amber-700'
      };
    }

    if (daysTracking >= 7 && mealCount >= 20) {
      return {
        message: 'Ditt datagrunnlag er nå godt nok for pålitelig trigger-deteksjon!',
        color: 'text-green-700'
      };
    }

    return null;
  };

  if (loading) {
    return (
      <div className={`bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg ${compact ? 'p-3' : 'p-4'} animate-pulse`}>
        <div className="h-4 bg-blue-200 rounded w-3/4"></div>
      </div>
    );
  }

  if (!stats) return null;

  const encouragement = getEncouragementMessage(stats);
  const sufficiency = getDataSufficiencyMessage(stats);
  const IconComponent = encouragement.icon;

  const levelColors = {
    start: 'from-gray-50 to-gray-100 border-gray-200',
    beginner: 'from-blue-50 to-indigo-50 border-blue-200',
    progress: 'from-purple-50 to-pink-50 border-purple-200',
    good: 'from-green-50 to-emerald-50 border-green-200',
    excellent: 'from-amber-50 to-orange-50 border-amber-200',
  };

  return (
    <div className={`bg-gradient-to-r ${levelColors[encouragement.level as keyof typeof levelColors]} border rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <IconComponent className={`w-5 h-5 ${encouragement.level === 'excellent' ? 'text-amber-600' : encouragement.level === 'good' ? 'text-green-600' : 'text-blue-600'}`} />
        </div>
        <div className="flex-1">
          <p className={`${compact ? 'text-sm' : 'text-base'} font-medium text-gray-900`}>
            {encouragement.message}
          </p>
          {sufficiency && !compact && (
            <p className={`text-sm ${sufficiency.color} mt-2 italic`}>
              {sufficiency.message}
            </p>
          )}
          {!compact && stats.mealCount > 0 && (
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
              <span>📊 {stats.mealCount} måltider</span>
              <span>❤️ {stats.symptomCount} symptomer</span>
              <span>📅 {stats.daysTracking} dager</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
