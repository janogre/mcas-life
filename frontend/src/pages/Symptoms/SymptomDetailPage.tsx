import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Clock, MapPin, Pill, Sparkles, RefreshCw } from 'lucide-react';
import { symptomsApi, analyticsApi } from '../../lib/api';
import { TriggerAnalysisCard } from '../../components/Symptoms/TriggerAnalysisCard';
import type { SymptomEntry, TriggerAnalysisResult } from '../../types/shared';

const CATEGORY_CONFIG = {
  skin: { label: 'Hud', color: '#ef4444', icon: '🔴' },
  digestive: { label: 'Fordøyelse', color: '#f59e0b', icon: '🥄' },
  respiratory: { label: 'Luftveier', color: '#3b82f6', icon: '🫁' },
  cardiovascular: { label: 'Hjerte/kar', color: '#dc2626', icon: '❤️' },
  neurological: { label: 'Nervesystem', color: '#8b5cf6', icon: '🧠' },
  musculoskeletal: { label: 'Muskel/skjelett', color: '#06b6d4', icon: '💪' },
  genitourinary: { label: 'Urinveier', color: '#0ea5e9', icon: '🔵' },
  systemic: { label: 'Systemisk', color: '#f97316', icon: '⚡' },
};

const BODY_REGION_LABELS: Record<string, string> = {
  head: 'Hode',
  face: 'Ansikt',
  neck: 'Nakke',
  chest_left: 'Venstre bryst',
  chest_right: 'Høyre bryst',
  upper_abdomen: 'Øvre mage',
  lower_abdomen: 'Nedre mage',
  left_shoulder: 'Venstre skulder',
  right_shoulder: 'Høyre skulder',
  left_arm: 'Venstre arm',
  right_arm: 'Høyre arm',
  left_hand: 'Venstre hånd',
  right_hand: 'Høyre hånd',
  left_thigh: 'Venstre lår',
  right_thigh: 'Høyre lår',
  left_knee: 'Venstre kne',
  right_knee: 'Høyre kne',
  left_lower_leg: 'Venstre underben',
  right_lower_leg: 'Høyre underben',
  left_foot: 'Venstre fot',
  right_foot: 'Høyre fot',
  upper_back: 'Øvre rygg',
  lower_back: 'Nedre rygg',
  general: 'Generelt',
};

export function SymptomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [symptom, setSymptom] = useState<SymptomEntry | null>(null);
  const [analysis, setAnalysis] = useState<TriggerAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzingTriggers, setAnalyzingTriggers] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState<'smart' | 'ai'>('smart');

  useEffect(() => {
    loadSymptom();
  }, [id]);

  const loadSymptom = async () => {
    if (!id) return;

    try {
      setLoading(true);
      // TODO: Implement symptomsApi.getById when backend endpoint exists
      // For now, we'll fetch recent symptoms and find the one we need
      const symptoms = await symptomsApi.getRecent(100);
      const foundSymptom = symptoms.find((s: any) => s.id === parseInt(id));
      setSymptom(foundSymptom || null);
    } catch (error) {
      console.error('Failed to load symptom:', error);
    } finally {
      setLoading(false);
    }
  };

  const runTriggerAnalysis = async () => {
    if (!id) return;

    try {
      setAnalyzingTriggers(true);
      setAnalysisError(null);

      console.log(`🔍 Starting ${analysisMode.toUpperCase()} trigger analysis for symptom`, id);

      const result = await analyticsApi.analyzeTriggerCorrelation({
        symptom_entry_id: parseInt(id),
        analysis_window_hours: 72,
        analysis_mode: analysisMode,
      });

      setAnalysis(result);
      console.log('✅ Trigger analysis complete:', result);
    } catch (error: any) {
      console.error('Failed to analyze triggers:', error);
      setAnalysisError(
        error.response?.data?.message ||
        'Kunne ikke analysere triggers. Sjekk at du har registrert måltider de siste 72 timene.'
      );
    } finally {
      setAnalyzingTriggers(false);
    }
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 8) return '#dc2626';
    if (severity >= 5) return '#f59e0b';
    return '#10b981';
  };

  const getSeverityLabel = (severity: number) => {
    if (severity >= 8) return 'Alvorlig';
    if (severity >= 5) return 'Moderat';
    return 'Mild';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('nb-NO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!symptom) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 max-w-md text-center shadow-lg">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Symptom ikke funnet</h2>
          <p className="text-gray-600 mb-4">Dette symptomet eksisterer ikke eller har blitt slettet.</p>
          <button
            onClick={() => navigate('/symptoms')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Tilbake til symptomlogg
          </button>
        </div>
      </div>
    );
  }

  const categoryConfig = CATEGORY_CONFIG[symptom.category as keyof typeof CATEGORY_CONFIG];
  const severityColor = getSeverityColor(symptom.severity);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-6 mb-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/symptoms')}
            className="flex items-center gap-2 text-indigo-100 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Tilbake til symptomlogg</span>
          </button>

          <div className="flex items-start gap-4">
            <div className="text-4xl">{categoryConfig?.icon || '❓'}</div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{symptom.type}</h1>
              <p className="text-indigo-100">{categoryConfig?.label || symptom.category}</p>
            </div>
            <div
              className="px-4 py-2 rounded-lg text-xl font-bold text-white"
              style={{ backgroundColor: severityColor }}
            >
              {symptom.severity}/10
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Symptom Details Card */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Symptomdetaljer</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-600" />
              <div>
                <div className="text-sm text-gray-600">Startet</div>
                <div className="font-medium text-gray-900">{formatDate(symptom.started_at)}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-gray-600" />
              <div>
                <div className="text-sm text-gray-600">Alvorlighet</div>
                <div className="font-medium text-gray-900">
                  {getSeverityLabel(symptom.severity)} ({symptom.severity}/10)
                </div>
              </div>
            </div>

            {symptom.duration_minutes && symptom.duration_minutes > 0 && (
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="text-sm text-gray-600">Varighet</div>
                  <div className="font-medium text-gray-900">{symptom.duration_minutes} minutter</div>
                </div>
              </div>
            )}

            {symptom.intensity_change && (
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="text-sm text-gray-600">Endring</div>
                  <div className="font-medium text-gray-900 capitalize">
                    {symptom.intensity_change === 'improving' ? 'Bedrer seg' :
                     symptom.intensity_change === 'worsening' ? 'Forverres' : 'Stabilt'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Body Regions */}
          {symptom.body_regions && symptom.body_regions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-600 mb-2">Berørte områder</div>
                  <div className="flex flex-wrap gap-2">
                    {symptom.body_regions.map((region, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium"
                      >
                        {BODY_REGION_LABELS[region] || region}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Treatment */}
          {symptom.treatment_taken && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-start gap-3">
                <Pill className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-600 mb-1">Behandling</div>
                  <div className="font-medium text-gray-900">{symptom.treatment_taken}</div>
                  {symptom.treatment_effective !== undefined && (
                    <div className="mt-1">
                      <span className={`text-sm font-medium ${symptom.treatment_effective ? 'text-green-600' : 'text-red-600'}`}>
                        {symptom.treatment_effective ? '✓ Effektiv' : '✗ Ikke effektiv'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {symptom.notes && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Notater</div>
              <div className="text-gray-900">{symptom.notes}</div>
            </div>
          )}

          {/* Weather Data */}
          {symptom.weather_data && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600 mb-2">Værforhold</div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-900">
                <span>🌡️ {symptom.weather_data.temperature}°C</span>
                <span>💧 {symptom.weather_data.humidity}% luftfuktighet</span>
                <span>🔽 {symptom.weather_data.pressure.toFixed(0)} hPa</span>
              </div>
            </div>
          )}

          {/* Room Exposure Data (Airthings) */}
          {symptom.room_exposures && symptom.room_exposures.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600 mb-2">Oppholdsrom (Airthings)</div>
              <div className="flex flex-wrap gap-2">
                {symptom.room_exposures.map((room, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <span className="text-blue-900 font-medium">{room.room_name}</span>
                    {room.time_spent_minutes && (
                      <span className="text-sm text-blue-700">
                        ({room.time_spent_minutes} min)
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Luftkvalitetsdata fra disse rommene vil bli brukt i trigger-analyse
              </p>
            </div>
          )}
        </div>

        {/* Trigger Analysis Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Trigger-Analyse</h2>

            <div className="flex items-center gap-3">
              {/* Analysis Mode Toggle */}
              {!analysis && (
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setAnalysisMode('smart')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                      analysisMode === 'smart'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Smart
                  </button>
                  <button
                    onClick={() => setAnalysisMode('ai')}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-1 ${
                      analysisMode === 'ai'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    AI
                  </button>
                </div>
              )}

              {/* Run Analysis Button */}
              {!analysis && (
                <button
                  onClick={runTriggerAnalysis}
                  disabled={analyzingTriggers}
                  className={`flex items-center gap-2 text-white px-4 py-2 rounded-lg font-semibold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed ${
                    analysisMode === 'ai'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700'
                      : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                  }`}
                >
                  {analyzingTriggers ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>Analyserer...</span>
                    </>
                  ) : (
                    <>
                      {analysisMode === 'ai' ? <Sparkles className="w-5 h-5" /> : <RefreshCw className="w-5 h-5" />}
                      <span>Analyser</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Analysis Error */}
          {analysisError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-1">Kunne ikke analysere triggers</h3>
                  <p className="text-sm text-red-700">{analysisError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Analysis Result */}
          {analysis && <TriggerAnalysisCard analysis={analysis} />}

          {/* Initial State */}
          {!analysis && !analyzingTriggers && !analysisError && (
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-8 text-center border-2 border-dashed border-purple-200">
              <Sparkles className="w-12 h-12 text-purple-600 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Oppdag dine mattriggere med AI
              </h3>
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                Vår AI analyserer de siste 72 timene med matinntak og identifiserer mulige triggere for dette symptomet.
              </p>
              <div className="flex items-center justify-center gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>72-timers analyse</span>
                </div>
                <div className="flex items-center gap-1">
                  <Sparkles className="w-4 h-4" />
                  <span>AI-drevet</span>
                </div>
              </div>
              <button
                onClick={runTriggerAnalysis}
                disabled={analyzingTriggers}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md inline-flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Start analyse
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
