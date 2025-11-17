import React, { useState, useEffect } from 'react';
import { Plus, Calendar, AlertCircle, Clock, TrendingUp, Shield, Activity, Cloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { getWeatherAutomatically, formatWeatherData, getWeatherEmoji, type WeatherResponse } from '../../lib/weatherApi';
import { useAuth } from '../../contexts/AuthContext';

interface Symptom {
  id: number;
  category: string;
  type: string;
  severity: number;
  started_at: string;
  duration_minutes: number;
  suspected_triggers?: string[];
  current_stress_factors?: string[];
  treatment_taken?: string;
  treatment_effective?: boolean;
}

interface RiskAnalysis {
  riskLevel: number;
  factors: string[];
  recommendations: string[];
}

interface DailyContext {
  dao_supplement_taken: boolean;
  compression_worn: boolean;
  sensory_environment_controlled: boolean;
  stress_level?: number;
  sleep_quality?: number;
  had_reactions_yesterday: boolean;
}

export function SymptomLogPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null);
  const [todayContext, setTodayContext] = useState<DailyContext | null>(null);
  const [currentWeather, setCurrentWeather] = useState<WeatherResponse | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    loadWeatherData();
  }, []);

  const loadWeatherData = async () => {
    setIsLoadingWeather(true);
    try {
      // Try to get weather automatically (browser location or user's city)
      const weather = await getWeatherAutomatically(user?.city);
      if (weather) {
        setCurrentWeather(weather);
      }
    } catch (error) {
      console.error('Error loading weather:', error);
    } finally {
      setIsLoadingWeather(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('[SymptomLogPage] Loading symptom data...');

      // Load recent symptoms from API
      const symptomsResponse = await api.get('/symptoms?limit=10');
      console.log('[SymptomLogPage] Symptoms API response:', symptomsResponse.data);
      const symptoms = symptomsResponse.data.data || [];

      // Load risk factors analysis
      const riskResponse = await api.get('/symptoms/risk-factors');
      const riskData = riskResponse.data.data;
      
      // Transform API risk data to component format
      const riskAnalysis = riskData ? {
        riskLevel: riskData.reactionRiskLevel || 5,
        factors: [
          ...(riskData.cumulativeStressScore >= 7 ? [`Høyt stressnivå (${riskData.cumulativeStressScore}/10)`] : []),
          ...(riskData.hadReactionsYesterday ? ['Reaksjoner i går'] : []),
          ...(riskData.daoTaken ? [] : ['DAO ikke tatt før måltider']),
          ...(riskData.compressionWorn ? [] : ['Kompresjon ikke brukt']),
          ...(riskData.sensoryEnvironmentCalm ? [] : ['Urolig sensormiljø'])
        ],
        recommendations: riskData.recommendations || []
      } : null;

      // Transform API symptom data to component format
      const transformedSymptoms = symptoms.map((symptom: any) => ({
        id: symptom.id,
        category: symptom.category,
        type: symptom.type || symptom.symptom_type,
        severity: symptom.severity,
        started_at: symptom.started_at,
        duration_minutes: symptom.duration_minutes,
        suspected_triggers: symptom.suspected_triggers || [],
        current_stress_factors: symptom.current_stress_factors || [],
        treatment_taken: symptom.treatment_taken,
        treatment_effective: symptom.treatment_effective
      }));

      setSymptoms(transformedSymptoms);
      setRiskAnalysis(riskAnalysis);
      setTodayContext(riskData ? {
        dao_supplement_taken: riskData.daoTaken || false,
        compression_worn: riskData.compressionWorn || false,
        sensory_environment_controlled: riskData.sensoryEnvironmentCalm || false,
        stress_level: riskData.cumulativeStressScore,
        sleep_quality: riskData.sleepQuality,
        had_reactions_yesterday: riskData.hadReactionsYesterday || false
      } : null);

      console.log('[SymptomLogPage] Data loaded successfully. Symptoms count:', transformedSymptoms.length);
    } catch (error) {
      console.error('[SymptomLogPage] Error loading symptom data:', error);
    } finally {
      setLoading(false);
    }
  };


  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Mindre enn 1 time siden';
    if (diffInHours < 24) return `${diffInHours} timer siden`;
    return `${Math.floor(diffInHours / 24)} dager siden`;
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 8) return 'bg-red-100 text-red-700';
    if (severity >= 5) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  const getRiskLevelColor = (level: number) => {
    if (level >= 8) return 'text-red-600';
    if (level >= 5) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Laster...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Symptom Tracking</h1>
          <p className="text-gray-600 mt-1">Log and monitor your MCAS symptoms</p>
        </div>
        <button
          onClick={() => navigate('/symptoms/register')}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Registrer symptom</span>
        </button>
      </div>

      {/* Current Weather */}
      {currentWeather && (
        <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-xl p-6 border border-sky-100">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <span className="text-4xl">
                {getWeatherEmoji(currentWeather.weather.weather_code)}
              </span>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Cloud className="w-5 h-5 text-sky-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Nåværende vær</h2>
                </div>
                <p className="text-sm text-gray-700">
                  {formatWeatherData(currentWeather.weather)}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {currentWeather.weather.weather_description}
                </p>
              </div>
            </div>
            {currentWeather.impact && currentWeather.impact.severity !== 'low' && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                currentWeather.impact.severity === 'high'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {currentWeather.impact.severity === 'high' ? 'Høy risiko' : 'Moderat risiko'}
              </span>
            )}
          </div>

          {/* MCAS impact warnings */}
          {currentWeather.impact && currentWeather.impact.risk_factors.length > 0 && (
            <div className="mt-4 pt-4 border-t border-sky-200">
              <p className="text-xs font-medium text-gray-700 mb-2">
                ⚠️ MCAS påvirkningsfaktorer:
              </p>
              <div className="space-y-1">
                {currentWeather.impact.risk_factors.map((factor, index) => (
                  <p key={index} className="text-xs text-gray-600">
                    • {factor}
                  </p>
                ))}
              </div>
              {currentWeather.impact.recommendations.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-700 mb-1">Anbefalinger:</p>
                  <div className="space-y-1">
                    {currentWeather.impact.recommendations.map((rec, index) => (
                      <p key={index} className="text-xs text-gray-600">
                        • {rec}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-gray-500 mt-3">
            Værdata lagres automatisk når du logger symptomer
          </p>
        </div>
      )}

      {/* Risk Analysis */}
      {riskAnalysis && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Dagens risiko</h2>
            </div>
            <span className={`text-2xl font-bold ${getRiskLevelColor(riskAnalysis.riskLevel)}`}>
              {riskAnalysis.riskLevel}/10
            </span>
          </div>
          
          {riskAnalysis.factors.length > 0 && (
            <div className="mb-3">
              <h3 className="font-medium text-gray-700 mb-2">Risikofaktorer:</h3>
              <div className="flex flex-wrap gap-2">
                {riskAnalysis.factors.map((factor, index) => (
                  <span key={index} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                    {factor}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {riskAnalysis.recommendations.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Anbefalinger:</h3>
              <ul className="space-y-1">
                {riskAnalysis.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-center space-x-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Recent Symptoms */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Nylige symptomer</h2>
          <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            Se alle
          </button>
        </div>

        <div className="space-y-3">
          {symptoms.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Ingen symptomer registrert ennå</p>
              <p className="text-sm mt-1">Klikk "Registrer symptom" for å legge til ditt første symptom</p>
            </div>
          ) : (
            symptoms.map((symptom) => (
              <div key={symptom.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="font-medium text-gray-900">{symptom.type}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(symptom.severity)}`}>
                      Alvorlighet {symptom.severity}/10
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">{formatDate(symptom.started_at)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>Varighet: {Math.floor(symptom.duration_minutes / 60)}t {symptom.duration_minutes % 60}min</span>
                  </div>
                  {symptom.suspected_triggers && symptom.suspected_triggers.length > 0 && (
                    <div>
                      Mulige triggere: {symptom.suspected_triggers.join(', ')}
                    </div>
                  )}
                  {symptom.current_stress_factors && symptom.current_stress_factors.length > 0 && (
                    <div>
                      Stressfaktorer: {symptom.current_stress_factors.join(', ')}
                    </div>
                  )}
                  {symptom.treatment_taken && (
                    <div className="flex items-center space-x-1">
                      <Activity className="w-4 h-4" />
                      <span>Behandling: {symptom.treatment_taken}</span>
                      {symptom.treatment_effective !== undefined && (
                        <span className={`ml-1 ${symptom.treatment_effective ? 'text-green-600' : 'text-red-600'}`}>
                          ({symptom.treatment_effective ? 'Effektiv' : 'Ikke effektiv'})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Today's Context Quick View */}
      {todayContext && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
          <div className="flex items-center space-x-2 mb-3">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Dagens kontekst</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${todayContext.dao_supplement_taken ? 'bg-green-500' : 'bg-gray-300'}`}></span>
              <span>DAO tatt</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${todayContext.compression_worn ? 'bg-green-500' : 'bg-gray-300'}`}></span>
              <span>Kompresjon</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${todayContext.sensory_environment_controlled ? 'bg-green-500' : 'bg-gray-300'}`}></span>
              <span>Rolig miljø</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`w-2 h-2 rounded-full ${todayContext.had_reactions_yesterday ? 'bg-red-500' : 'bg-green-500'}`}></span>
              <span>Reaksjoner i går</span>
            </div>
          </div>
          {(todayContext.stress_level || todayContext.sleep_quality) && (
            <div className="mt-3 pt-3 border-t border-green-200 flex gap-6 text-sm">
              {todayContext.stress_level && (
                <span>Stress: {todayContext.stress_level}/10</span>
              )}
              {todayContext.sleep_quality && (
                <span>Søvnkvalitet: {todayContext.sleep_quality}/10</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Enhanced Features Info */}
      <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-xl p-6 border border-primary-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Forbedret MCAS-tracking</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Automatisk kontekstfangst fra daglig logging</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Smart risikoanalyse basert på flere faktorer</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span>Korrelasjon med vær, søvn og hormoner</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <span>Personaliserte anbefalinger</span>
          </div>
        </div>
      </div>
    </div>
  );
}