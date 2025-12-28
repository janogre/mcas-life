import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, TrendingUp, Target, Clock, AlertCircle, Sparkles, Calendar, RefreshCw,
  TrendingDown, Minus, Utensils, Sun, Moon, Cloud, Coffee, Award, CheckCircle,
  Activity, BarChart3
} from 'lucide-react';
import { analyticsApi } from '../../lib/api';
import type { TriggerAnalysisResult, FoodTrigger } from '../../types/shared';

interface AggregatedTrigger {
  food_name_no: string;
  food_name_en: string;
  total_occurrences: number;
  avg_correlation: number;
  avg_time_to_symptom: number;
  highest_correlation: number;
  symptom_ids: number[];
}

interface Insights {
  summary: {
    total_symptoms: number;
    total_meals: number;
    total_analyses: number;
    avg_symptom_severity: number;
    symptom_free_days: number;
  };
  symptom_patterns: {
    most_common_type: string | null;
    avg_severity: number;
    time_of_day_pattern: Record<string, number>;
    day_of_week_pattern: Record<string, number>;
    type_distribution: Record<string, number>;
  };
  food_frequency: {
    most_eaten_foods: Array<{ count: number; food_name: string; food_id: number }>;
    total_unique_foods: number;
  };
  recommendations: {
    foods_to_avoid: string[];
    foods_to_retry: string[];
    suggestions: string[];
  };
  improvement_trend: {
    trend: 'improving' | 'stable' | 'worsening' | 'insufficient_data';
    change_percent: number;
    first_period_avg?: number;
    second_period_avg?: number;
  };
  generated_at: string;
}

export function AnalyticsPage() {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<TriggerAnalysisResult[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInsights, setShowInsights] = useState(false);

  useEffect(() => {
    loadAnalyses();
    loadInsights();
  }, [selectedPeriod]);

  const loadAnalyses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analyticsApi.getUserAnalyses({ limit: 50 });
      setAnalyses(data.analyses || []);
    } catch (err: any) {
      console.error('Failed to load analyses:', err);
      setError(err.response?.data?.message || 'Kunne ikke laste analyser');
    } finally {
      setLoading(false);
    }
  };

  const loadInsights = async () => {
    try {
      setInsightsLoading(true);
      const data = await analyticsApi.getInsights({ days: selectedPeriod });
      setInsights(data);
      setShowInsights(true);
    } catch (err: any) {
      console.error('Failed to load insights:', err);
    } finally {
      setInsightsLoading(false);
    }
  };

  // Aggregate all triggers across all analyses
  const aggregateTriggers = (): AggregatedTrigger[] => {
    const triggerMap = new Map<string, AggregatedTrigger>();

    analyses.forEach(analysis => {
      analysis.likely_food_triggers.forEach((trigger: FoodTrigger) => {
        const key = `${trigger.food_id}-${trigger.food_name_en}`;

        if (triggerMap.has(key)) {
          const existing = triggerMap.get(key)!;
          existing.total_occurrences++;
          existing.avg_correlation = (existing.avg_correlation + trigger.correlation_score) / 2;
          existing.avg_time_to_symptom = (existing.avg_time_to_symptom + trigger.time_to_symptom_hours) / 2;
          existing.highest_correlation = Math.max(existing.highest_correlation, trigger.correlation_score);
          existing.symptom_ids.push(analysis.symptom_entry_id);
        } else {
          triggerMap.set(key, {
            food_name_no: trigger.food_name_no,
            food_name_en: trigger.food_name_en,
            total_occurrences: 1,
            avg_correlation: trigger.correlation_score,
            avg_time_to_symptom: trigger.time_to_symptom_hours,
            highest_correlation: trigger.correlation_score,
            symptom_ids: [analysis.symptom_entry_id],
          });
        }
      });
    });

    return Array.from(triggerMap.values())
      .sort((a, b) => b.highest_correlation - a.highest_correlation)
      .slice(0, 10);
  };

  const topTriggers = aggregateTriggers();
  const totalAnalyses = analyses.length;
  const avgConfidence = analyses.length > 0
    ? analyses.reduce((sum, a) => sum + a.analysis_confidence, 0) / analyses.length
    : 0;
  const totalTriggers = analyses.reduce((sum, a) => sum + a.likely_food_triggers.length, 0);

  const getCorrelationColor = (score: number) => {
    if (score >= 0.7) return 'bg-red-100 text-red-900 border-red-300';
    if (score >= 0.4) return 'bg-orange-100 text-orange-900 border-orange-300';
    return 'bg-yellow-100 text-yellow-900 border-yellow-300';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 24) return `${diffHours} timer siden`;
    if (diffDays === 1) return 'I går';
    if (diffDays < 7) return `${diffDays} dager siden`;
    return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
  };

  const getTimeOfDayIcon = (period: string) => {
    switch (period) {
      case 'morning': return <Sun className="w-5 h-5 text-yellow-600" />;
      case 'afternoon': return <Cloud className="w-5 h-5 text-blue-600" />;
      case 'evening': return <Coffee className="w-5 h-5 text-orange-600" />;
      case 'night': return <Moon className="w-5 h-5 text-indigo-600" />;
      default: return null;
    }
  };

  const getTimeOfDayLabel = (period: string) => {
    switch (period) {
      case 'morning': return 'Morgen (06-12)';
      case 'afternoon': return 'Ettermiddag (12-18)';
      case 'evening': return 'Kveld (18-22)';
      case 'night': return 'Natt (22-06)';
      default: return period;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingDown className="w-6 h-6 text-green-600" />;
      case 'worsening': return <TrendingUp className="w-6 h-6 text-red-600" />;
      case 'stable': return <Minus className="w-6 h-6 text-gray-600" />;
      default: return <Activity className="w-6 h-6 text-gray-400" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'bg-green-50 border-green-200 text-green-900';
      case 'worsening': return 'bg-red-50 border-red-200 text-red-900';
      case 'stable': return 'bg-gray-50 border-gray-200 text-gray-900';
      default: return 'bg-gray-50 border-gray-200 text-gray-600';
    }
  };

  const getTrendText = (trend: string) => {
    switch (trend) {
      case 'improving': return 'Forbedring';
      case 'worsening': return 'Forverring';
      case 'stable': return 'Stabilt';
      default: return 'Utilstrekkelig data';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Laster analyser...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-red-900 mb-2">Kunne ikke laste analyser</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={loadAnalyses}
            className="w-full bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Prøv igjen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white p-6 mb-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Brain className="w-10 h-10" />
              <div>
                <h1 className="text-3xl font-bold">Innsikt & Analyser</h1>
                <p className="text-purple-100">Dine helsemønstre og triggere</p>
              </div>
            </div>

            {/* Period Selector */}
            <div className="flex gap-2 bg-white/10 backdrop-blur-sm rounded-lg p-1">
              {[7, 30, 90].map(days => (
                <button
                  key={days}
                  onClick={() => setSelectedPeriod(days)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    selectedPeriod === days
                      ? 'bg-white text-purple-600'
                      : 'text-white hover:bg-white/10'
                  }`}
                >
                  {days} dager
                </button>
              ))}
            </div>
          </div>

          {/* Stats Grid */}
          {insights && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-purple-100 text-sm mb-1">Symptom-frie dager</div>
                <div className="text-3xl font-bold">{insights.summary.symptom_free_days}</div>
                <div className="text-xs text-purple-200 mt-1">av {selectedPeriod} dager</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-purple-100 text-sm mb-1">Totalt symptomer</div>
                <div className="text-3xl font-bold">{insights.summary.total_symptoms}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-purple-100 text-sm mb-1">Gj.snitt alvorlighet</div>
                <div className="text-3xl font-bold">{insights.summary.avg_symptom_severity.toFixed(1)}</div>
                <div className="text-xs text-purple-200 mt-1">av 10</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-purple-100 text-sm mb-1">Måltider registrert</div>
                <div className="text-3xl font-bold">{insights.summary.total_meals}</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <div className="text-purple-100 text-sm mb-1">Unike matvarer</div>
                <div className="text-3xl font-bold">{insights.food_frequency.total_unique_foods}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* Improvement Trend */}
        {insights && insights.improvement_trend.trend !== 'insufficient_data' && (
          <div className={`rounded-lg shadow-md p-6 border-2 ${getTrendColor(insights.improvement_trend.trend)}`}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {getTrendIcon(insights.improvement_trend.trend)}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">
                  Trend de siste {selectedPeriod} dagene: {getTrendText(insights.improvement_trend.trend)}
                </h3>
                <p className="text-sm mb-3">
                  {insights.improvement_trend.trend === 'improving' &&
                    `Symptomene dine har blitt ${Math.abs(insights.improvement_trend.change_percent).toFixed(1)}% mindre alvorlige! Fortsett det gode arbeidet.`
                  }
                  {insights.improvement_trend.trend === 'worsening' &&
                    `Symptomene har økt med ${insights.improvement_trend.change_percent.toFixed(1)}%. Vurder å gjennomgå triggere og kosthold.`
                  }
                  {insights.improvement_trend.trend === 'stable' &&
                    'Symptomene holder seg stabile. Fortsett å spore for å identifisere forbedringer.'
                  }
                </p>
                {insights.improvement_trend.first_period_avg && insights.improvement_trend.second_period_avg && (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-white/50 rounded p-2">
                      <div className="opacity-75 text-xs">Første halvdel</div>
                      <div className="font-semibold">{insights.improvement_trend.first_period_avg.toFixed(1)} / 10</div>
                    </div>
                    <div className="bg-white/50 rounded p-2">
                      <div className="opacity-75 text-xs">Andre halvdel</div>
                      <div className="font-semibold">{insights.improvement_trend.second_period_avg.toFixed(1)} / 10</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Symptom Patterns */}
        {insights && insights.symptom_patterns.most_common_type && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
              <BarChart3 className="w-6 h-6 text-purple-600" />
              Symptommønstre
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Most Common Type */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h3 className="font-semibold text-purple-900 mb-2">Mest vanlige symptom</h3>
                <div className="text-2xl font-bold text-purple-700">{insights.symptom_patterns.most_common_type}</div>
                <div className="text-sm text-purple-600 mt-1">
                  Gj.snitt alvorlighet: {insights.symptom_patterns.avg_severity.toFixed(1)} / 10
                </div>
              </div>

              {/* Time of Day Pattern */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-3">Tidspunkt på dagen</h3>
                <div className="space-y-2">
                  {Object.entries(insights.symptom_patterns.time_of_day_pattern)
                    .sort(([,a], [,b]) => (b as number) - (a as number))
                    .slice(0, 3)
                    .map(([period, count]) => (
                      <div key={period} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {getTimeOfDayIcon(period)}
                          <span className="font-medium">{getTimeOfDayLabel(period)}</span>
                        </div>
                        <span className="font-bold text-blue-700">{count} symptomer</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Day of Week Pattern */}
            <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Ukedag-mønster</h3>
              <div className="grid grid-cols-7 gap-2">
                {Object.entries(insights.symptom_patterns.day_of_week_pattern)
                  .map(([day, count]) => {
                    const maxCount = Math.max(...Object.values(insights.symptom_patterns.day_of_week_pattern));
                    const intensity = maxCount > 0 ? (count as number) / maxCount : 0;
                    return (
                      <div key={day} className="text-center">
                        <div
                          className="rounded-lg p-2 mb-1 transition-all"
                          style={{
                            backgroundColor: `rgba(139, 92, 246, ${intensity * 0.7 + 0.1})`,
                          }}
                        >
                          <div className="text-lg font-bold text-purple-900">{count}</div>
                        </div>
                        <div className="text-xs text-gray-600">{day.slice(0, 3)}</div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Food Frequency */}
        {insights && insights.food_frequency.most_eaten_foods.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
              <Utensils className="w-6 h-6 text-green-600" />
              Mest spiste matvarer
            </h2>

            <div className="grid md:grid-cols-2 gap-3">
              {insights.food_frequency.most_eaten_foods.map((food, index) => (
                <div
                  key={food.food_id}
                  className="flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center font-bold text-sm text-green-700">
                      #{index + 1}
                    </div>
                    <span className="font-medium text-gray-900">{food.food_name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-700">{food.count}x</div>
                    <div className="text-xs text-gray-500">konsumert</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {insights && (insights.recommendations.foods_to_avoid.length > 0 || insights.recommendations.suggestions.length > 0) && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-6">
              <Award className="w-6 h-6 text-amber-600" />
              Anbefalinger
            </h2>

            <div className="space-y-4">
              {/* Foods to Avoid */}
              {insights.recommendations.foods_to_avoid.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Matvarer å unngå
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {insights.recommendations.foods_to_avoid.map((food, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium"
                      >
                        {food}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Foods to Retry */}
              {insights.recommendations.foods_to_retry.length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Matvarer å teste på nytt
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {insights.recommendations.foods_to_retry.map((food, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                      >
                        {food}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* General Suggestions */}
              {insights.recommendations.suggestions.length > 0 && (
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <h3 className="font-semibold text-amber-900 mb-3">Forbedringsforslag</h3>
                  <ul className="space-y-2">
                    {insights.recommendations.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-amber-800">
                        <span className="text-amber-600 mt-0.5">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top Triggers Section */}
        {topTriggers.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Target className="w-6 h-6 text-purple-600" />
                Topp 10 Triggere
              </h2>
              <span className="text-sm text-gray-600">På tvers av {totalAnalyses} analyser</span>
            </div>

            <div className="space-y-3">
              {topTriggers.map((trigger, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${getCorrelationColor(trigger.highest_correlation)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center font-bold text-sm">
                        #{index + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{trigger.food_name_no}</h3>
                        <p className="text-sm opacity-75">{trigger.food_name_en}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{(trigger.highest_correlation * 100).toFixed(0)}%</div>
                      <div className="text-xs opacity-75">Høyeste match</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                    <div>
                      <div className="opacity-75 text-xs mb-1">Forekomster</div>
                      <div className="font-semibold">{trigger.total_occurrences} ganger</div>
                    </div>
                    <div>
                      <div className="opacity-75 text-xs mb-1">Gj.snitt korrelasjon</div>
                      <div className="font-semibold">{(trigger.avg_correlation * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="opacity-75 text-xs mb-1">Gj.snitt timing</div>
                      <div className="font-semibold">{trigger.avg_time_to_symptom.toFixed(1)}t</div>
                    </div>
                  </div>

                  {/* Linked Symptoms */}
                  <div className="mt-3 pt-3 border-t border-current opacity-50">
                    <span className="text-xs">
                      Koblet til {trigger.symptom_ids.length} symptom{trigger.symptom_ids.length !== 1 ? 'er' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analysis History */}
        {analyses.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-purple-600" />
                Analyse-historikk
              </h2>
              <button
                onClick={loadAnalyses}
                className="text-sm text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1"
              >
                <RefreshCw className="w-4 h-4" />
                Oppdater
              </button>
            </div>

            <div className="space-y-3">
              {analyses.slice(0, 5).map((analysis) => (
                <div
                  key={analysis.analysis_id}
                  onClick={() => navigate(`/symptoms/${analysis.symptom_entry_id}`)}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                        <Sparkles className="w-6 h-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Trigger-analyse #{analysis.analysis_id}</p>
                        <p className="text-sm text-gray-600">{formatDate(analysis.created_at.toString())}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="font-bold text-gray-900">{(analysis.analysis_confidence * 100).toFixed(0)}%</div>
                        <div className="text-gray-500 text-xs">Pålitelighet</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-gray-900">{analysis.likely_food_triggers.length}</div>
                        <div className="text-gray-500 text-xs">Triggere</div>
                      </div>
                      <div className="text-purple-600 group-hover:translate-x-1 transition-transform">
                        →
                      </div>
                    </div>
                  </div>

                  {/* Top trigger preview */}
                  {analysis.likely_food_triggers.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-600">
                        Topp trigger: <span className="font-semibold text-gray-900">
                          {analysis.likely_food_triggers[0].food_name_no}
                        </span> ({(analysis.likely_food_triggers[0].correlation_score * 100).toFixed(0)}%)
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* View all analyses link */}
            {analyses.length > 5 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => {/* Scroll to analysis history or show modal */}}
                  className="text-sm text-purple-600 hover:text-purple-700 font-semibold"
                >
                  Vis alle {analyses.length} analyser
                </button>
              </div>
            )}
          </div>
        )}

        {/* No Data State */}
        {totalAnalyses === 0 && (!insights || insights.summary.total_symptoms === 0) && (
          <div className="bg-white rounded-lg p-12 text-center shadow-md border border-gray-200">
            <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Ingen data ennå</h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Start med å registrere symptomer og måltider for å få innsikt i dine helsemønstre og triggere.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/symptoms')}
                className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-red-700 hover:to-red-800 transition-all shadow-md inline-flex items-center gap-2"
              >
                <AlertCircle className="w-5 h-5" />
                Registrer symptom
              </button>
              <button
                onClick={() => navigate('/meals/add')}
                className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition-all shadow-md inline-flex items-center gap-2"
              >
                <Utensils className="w-5 h-5" />
                Registrer måltid
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
