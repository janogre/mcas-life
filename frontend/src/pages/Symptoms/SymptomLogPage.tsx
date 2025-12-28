import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, AlertCircle, Calendar, TrendingUp, Clock, Activity } from 'lucide-react';
import { symptomsApi } from '../../lib/api';
import { ColorLegend } from '../../components/UI/ColorLegend';

interface Symptom {
  id: number;
  category: string;
  type: string;
  severity: number;
  started_at: string;
  duration_minutes: number;
  body_regions?: string[];
  treatment_taken?: string;
  treatment_effective?: boolean;
}

const CATEGORY_CONFIG = {
  skin: {
    label: 'Hud',
    color: '#ef4444',
    icon: '🔴',
    description: 'Hudsymptomer fra histaminfrigjøring (kløe, urtikaria, rødming)'
  },
  digestive: {
    label: 'Fordøyelse',
    color: '#f59e0b',
    icon: '🥄',
    description: 'Fordøyelsessymptomer fra mastceller i tarmen (kvalme, magesmerter, diaré)'
  },
  respiratory: {
    label: 'Luftveier',
    color: '#3b82f6',
    icon: '🫁',
    description: 'Luftveissymptomer (pustevansker, trange luftveier, hoste)'
  },
  cardiovascular: {
    label: 'Hjerte/kar',
    color: '#dc2626',
    icon: '❤️',
    description: 'Hjerte- og karsymptomer (hjertebank, svimmelhet, blodtrykksfall)'
  },
  neurological: {
    label: 'Nervesystem',
    color: '#8b5cf6',
    icon: '🧠',
    description: 'Nevrologiske symptomer (hodepine, hjerneteåke, konsentrasjonsproblemer)'
  },
  musculoskeletal: {
    label: 'Muskel/skjelett',
    color: '#06b6d4',
    icon: '💪',
    description: 'Muskel- og skjelettsymptomer (leddsmerter, muskelsmerter, stivhet)'
  },
  genitourinary: {
    label: 'Urinveier',
    color: '#0ea5e9',
    icon: '🔵',
    description: 'Urinveissymptomer fra mastcelleaktivering (blærebetennelse, hyppig vannlating)'
  },
  systemic: {
    label: 'Systemisk',
    color: '#f97316',
    icon: '⚡',
    description: 'Systemiske symptomer fra omfattende mastcelleaktivering (tretthet, feber)'
  },
};

export function SymptomLogPage() {
  const navigate = useNavigate();
  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSymptoms();
  }, []);

  const loadSymptoms = async () => {
    try {
      setLoading(true);
      const response = await symptomsApi.getRecent(30);
      setSymptoms(response);
    } catch (error) {
      console.error('Failed to load symptoms:', error);
    } finally {
      setLoading(false);
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
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min siden`;
    if (diffHours < 24) return `${diffHours} timer siden`;
    if (diffDays === 0) return 'I dag';
    if (diffDays === 1) return 'I går';
    if (diffDays < 7) return `${diffDays} dager siden`;

    return date.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
  };

  // Calculate statistics
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const symptomsThisWeek = symptoms.filter(s => new Date(s.started_at) >= weekAgo);
  const severeSymptoms = symptoms.filter(s => s.severity >= 7);
  const avgSeverity = symptoms.length > 0
    ? (symptoms.reduce((sum, s) => sum + s.severity, 0) / symptoms.length).toFixed(1)
    : '0';

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-6 mb-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Symptomsporing</h1>
              <p className="text-indigo-100">Følg med på dine MCAS-symptomer</p>
            </div>
            <button
              onClick={() => navigate('/symptoms/add')}
              className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>Nytt symptom</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              <span className="text-sm text-gray-600">Total</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{symptoms.length}</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-gray-600">Siste uke</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{symptomsThisWeek.length}</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm text-gray-600">Alvorlige</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{severeSymptoms.length}</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              <span className="text-sm text-gray-600">Snitt</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{avgSeverity}</div>
          </div>
        </div>

        {/* Color Legend for Severity */}
        <ColorLegend type="severity" compact={false} showTitle={true} />

        {/* Symptoms List */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Siste symptomer</h2>

          {symptoms.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ingen symptomer registrert</h3>
              <p className="text-gray-600 mb-4">Start med å registrere ditt første symptom</p>
              <button
                onClick={() => navigate('/symptoms/add')}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Registrer symptom
              </button>
            </div>
          ) : (
            symptoms.map((symptom) => {
              const categoryConfig = CATEGORY_CONFIG[symptom.category as keyof typeof CATEGORY_CONFIG];
              const severityColor = getSeverityColor(symptom.severity);

              return (
                <div
                  key={symptom.id}
                  className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => navigate(`/symptoms/${symptom.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl" title={categoryConfig?.description}>{categoryConfig?.icon || '❓'}</div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{symptom.type}</h3>
                        <p className="text-sm text-gray-600" title={categoryConfig?.description}>{categoryConfig?.label || symptom.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="px-3 py-1 rounded-full text-sm font-semibold text-white"
                        style={{ backgroundColor: severityColor }}
                        title={`Alvorlighetsgrad: ${getSeverityLabel(symptom.severity)} (${symptom.severity}/10)`}
                      >
                        {symptom.severity}/10
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatDate(symptom.started_at)}</span>
                    </div>
                    {symptom.duration_minutes > 0 && (
                      <div className="flex items-center gap-1">
                        <span>{symptom.duration_minutes} min</span>
                      </div>
                    )}
                    {symptom.body_regions && symptom.body_regions.length > 0 && (
                      <div className="flex items-center gap-1">
                        <span>{symptom.body_regions.length} områder</span>
                      </div>
                    )}
                  </div>

                  {symptom.treatment_taken && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-600">
                        Behandling: {symptom.treatment_taken}
                        {symptom.treatment_effective !== undefined && (
                          <span className={symptom.treatment_effective ? 'text-green-600' : 'text-red-600'}>
                            {' '}({symptom.treatment_effective ? 'Effektiv' : 'Ikke effektiv'})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Load more button */}
        {symptoms.length >= 30 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => {/* TODO: Load more */}}
              className="text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
            >
              Last inn flere symptomer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
