import React, { useState } from 'react';
import { AlertTriangle, TrendingUp, Clock, Target, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import type { TriggerAnalysisResult, FoodTrigger } from '../../types/shared';

interface TriggerAnalysisCardProps {
  analysis: TriggerAnalysisResult;
  compact?: boolean;
}

export function TriggerAnalysisCard({ analysis, compact = false }: TriggerAnalysisCardProps) {
  const [expanded, setExpanded] = useState(!compact);

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.7) return { label: 'Høy pålitelighet', color: 'bg-green-100 text-green-800 border-green-300' };
    if (confidence >= 0.4) return { label: 'Moderat pålitelighet', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    return { label: 'Lav pålitelighet', color: 'bg-gray-100 text-gray-800 border-gray-300' };
  };

  const getTriggerLevelColor = (correlationScore: number) => {
    if (correlationScore >= 0.7) return 'bg-red-100 border-red-400 text-red-900';
    if (correlationScore >= 0.4) return 'bg-orange-100 border-orange-400 text-orange-900';
    return 'bg-yellow-100 border-yellow-400 text-yellow-900';
  };

  const getTriggerLevelLabel = (correlationScore: number) => {
    if (correlationScore >= 0.7) return 'Høy risiko';
    if (correlationScore >= 0.4) return 'Moderat risiko';
    return 'Lav risiko';
  };

  const confidenceBadge = getConfidenceBadge(analysis.analysis_confidence);
  const topTriggers = analysis.likely_food_triggers.slice(0, compact ? 3 : 10);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Trigger-Analyse</h3>
              <p className="text-sm text-gray-600">
                {analysis.total_meals_analyzed} måltider analysert over {Math.round((new Date(analysis.analysis_window_end).getTime() - new Date(analysis.analysis_window_start).getTime()) / (1000 * 60 * 60))} timer
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* Confidence Badge */}
        <div className="mt-3 flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${confidenceBadge.color}`}>
            {confidenceBadge.label}
          </span>
          <span className="text-sm text-gray-600">
            {(analysis.analysis_confidence * 100).toFixed(0)}% konfidensintervall
          </span>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* No Triggers Found */}
          {topTriggers.length === 0 && (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">Ingen klare trigger-mønstre funnet</p>
              <p className="text-sm text-gray-500 mt-1">
                Dette kan bety at symptomet ikke var matrelatert, eller at du trenger mer data
              </p>
            </div>
          )}

          {/* Top Triggers */}
          {topTriggers.length > 0 && (
            <>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  Sannsynlige triggere ({topTriggers.length})
                </h4>
                <div className="space-y-2">
                  {topTriggers.map((trigger: FoodTrigger, index: number) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border-2 ${getTriggerLevelColor(trigger.correlation_score)}`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{trigger.food_name_no}</div>
                          <div className="text-xs text-gray-600 mt-1">
                            {trigger.food_name_en}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-semibold">
                            {getTriggerLevelLabel(trigger.correlation_score)}
                          </div>
                          <div className="text-xs text-gray-600">
                            {(trigger.correlation_score * 100).toFixed(0)}% match
                          </div>
                        </div>
                      </div>

                      {/* Timing Info */}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{trigger.time_to_symptom_hours.toFixed(1)} timer før symptom</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>SIGHI: {trigger.compatibility}/3</span>
                        </div>
                      </div>

                      {/* Confidence Level */}
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                trigger.confidence_level === 'high'
                                  ? 'bg-red-600'
                                  : trigger.confidence_level === 'medium'
                                  ? 'bg-orange-500'
                                  : 'bg-yellow-500'
                              }`}
                              style={{ width: `${trigger.correlation_score * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium capitalize">
                            {trigger.confidence_level === 'high' ? 'Høy' : trigger.confidence_level === 'medium' ? 'Moderat' : 'Lav'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Air Quality Triggers */}
              {analysis.likely_air_quality_triggers && analysis.likely_air_quality_triggers.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Luftkvalitet fra Airthings ({analysis.likely_air_quality_triggers.length})
                  </h4>
                  <div className="space-y-2">
                    {analysis.likely_air_quality_triggers.map((trigger: any, index: number) => {
                      const getRiskColor = (level: string) => {
                        if (level === 'high') return 'bg-red-100 border-red-400 text-red-900';
                        if (level === 'moderate') return 'bg-orange-100 border-orange-400 text-orange-900';
                        return 'bg-green-100 border-green-400 text-green-900';
                      };

                      return (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border-2 ${getRiskColor(trigger.risk_assessment.risk_level)}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{trigger.room_name}</div>
                              <div className="text-xs text-gray-600 mt-1">
                                {trigger.time_spent_minutes} minutter opphold
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-semibold capitalize">
                                {trigger.risk_assessment.risk_level === 'high' ? 'Høy risiko' :
                                 trigger.risk_assessment.risk_level === 'moderate' ? 'Moderat risiko' : 'Lav risiko'}
                              </div>
                              <div className="text-xs text-gray-600">
                                {(trigger.correlation_score * 100).toFixed(0)}% korrelasjon
                              </div>
                            </div>
                          </div>

                          {/* Air Quality Metrics */}
                          <div className="grid grid-cols-3 gap-2 mt-2">
                            {trigger.air_quality_metrics.co2 && (
                              <div className="text-xs">
                                <span className="text-gray-600">CO₂:</span>
                                <span className="font-medium ml-1">{trigger.air_quality_metrics.co2} ppm</span>
                              </div>
                            )}
                            {trigger.air_quality_metrics.voc && (
                              <div className="text-xs">
                                <span className="text-gray-600">VOC:</span>
                                <span className="font-medium ml-1">{trigger.air_quality_metrics.voc} ppb</span>
                              </div>
                            )}
                            {trigger.air_quality_metrics.humidity && (
                              <div className="text-xs">
                                <span className="text-gray-600">Fukt:</span>
                                <span className="font-medium ml-1">{trigger.air_quality_metrics.humidity}%</span>
                              </div>
                            )}
                            {trigger.air_quality_metrics.temperature && (
                              <div className="text-xs">
                                <span className="text-gray-600">Temp:</span>
                                <span className="font-medium ml-1">{trigger.air_quality_metrics.temperature}°C</span>
                              </div>
                            )}
                            {trigger.air_quality_metrics.radon && (
                              <div className="text-xs">
                                <span className="text-gray-600">Radon:</span>
                                <span className="font-medium ml-1">{trigger.air_quality_metrics.radon} Bq/m³</span>
                              </div>
                            )}
                            {trigger.air_quality_metrics.pm25 && (
                              <div className="text-xs">
                                <span className="text-gray-600">PM2.5:</span>
                                <span className="font-medium ml-1">{trigger.air_quality_metrics.pm25} μg/m³</span>
                              </div>
                            )}
                          </div>

                          {/* Risk Concerns */}
                          {trigger.risk_assessment.concerns && trigger.risk_assessment.concerns.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-300">
                              <div className="text-xs text-gray-700">
                                {trigger.risk_assessment.concerns.map((concern: string, i: number) => (
                                  <div key={i} className="flex items-start gap-1 mt-1">
                                    <span>⚠️</span>
                                    <span>{concern}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Improvement Suggestions */}
              {analysis.improvement_suggestions && analysis.improvement_suggestions.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">
                    💡 AI-anbefalinger
                  </h4>
                  <ul className="space-y-1">
                    {analysis.improvement_suggestions.slice(0, 5).map((suggestion: string, index: number) => (
                      <li key={index} className="text-sm text-blue-800 flex items-start gap-2">
                        <span className="text-blue-600 mt-0.5">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Data Quality Info */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Datakvalitet: {(analysis.data_quality_score * 100).toFixed(0)}%</span>
                  <span>
                    Analysert: {new Date(analysis.created_at).toLocaleDateString('nb-NO', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
