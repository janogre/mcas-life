import React, { useState } from 'react';
import { symptomsApi } from '../../lib/api';
import type { WeatherData } from '../../lib/weatherApi';
import { AlertTriangle, Heart, Wind, Zap, Brain, Droplet, Activity, Thermometer } from 'lucide-react';

export interface CriticalSymptom {
  id: string;
  name: string;
  category: 'skin' | 'digestive' | 'respiratory' | 'cardiovascular' | 'neurological' | 'musculoskeletal' | 'genitourinary' | 'systemic';
  type: string;
  defaultSeverity: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  isEmergency?: boolean;
}

// Anafylaktiske og kritiske MCAS-symptomer
export const ANAPHYLACTIC_SYMPTOMS: CriticalSymptom[] = [
  {
    id: 'throat_swelling',
    name: 'Tunge i halsen',
    category: 'respiratory',
    type: 'throat_swelling',
    defaultSeverity: 9,
    icon: AlertTriangle,
    color: '#dc2626',
    bgColor: '#fef2f2',
    isEmergency: true,
  },
  {
    id: 'breathing_difficulty',
    name: 'Pustevansker',
    category: 'respiratory',
    type: 'shortness_of_breath',
    defaultSeverity: 8,
    icon: Wind,
    color: '#dc2626',
    bgColor: '#fef2f2',
    isEmergency: true,
  },
  {
    id: 'heart_palpitations',
    name: 'Hjertebank',
    category: 'cardiovascular',
    type: 'palpitations',
    defaultSeverity: 8,
    icon: Heart,
    color: '#dc2626',
    bgColor: '#fef2f2',
    isEmergency: true,
  },
  {
    id: 'blood_pressure_drop',
    name: 'Blodtrykksfall',
    category: 'cardiovascular',
    type: 'hypotension',
    defaultSeverity: 9,
    icon: Activity,
    color: '#dc2626',
    bgColor: '#fef2f2',
    isEmergency: true,
  },
];

// Vanlige MCAS-symptomer
export const COMMON_MCAS_SYMPTOMS: CriticalSymptom[] = [
  {
    id: 'headache',
    name: 'Hodepine',
    category: 'neurological',
    type: 'headache',
    defaultSeverity: 6,
    icon: Brain,
    color: '#d97706',
    bgColor: '#fffbeb',
  },
  {
    id: 'itching',
    name: 'Kløe',
    category: 'skin',
    type: 'itching',
    defaultSeverity: 5,
    icon: Zap,
    color: '#d97706',
    bgColor: '#fffbeb',
  },
  {
    id: 'hives',
    name: 'Urtikaria',
    category: 'skin',
    type: 'hives',
    defaultSeverity: 6,
    icon: Droplet,
    color: '#d97706',
    bgColor: '#fffbeb',
  },
  {
    id: 'nausea',
    name: 'Kvalme',
    category: 'digestive',
    type: 'nausea',
    defaultSeverity: 5,
    icon: AlertTriangle,
    color: '#d97706',
    bgColor: '#fffbeb',
  },
  {
    id: 'brain_fog',
    name: 'Hjerneteåke',
    category: 'neurological',
    type: 'brain_fog',
    defaultSeverity: 5,
    icon: Brain,
    color: '#d97706',
    bgColor: '#fffbeb',
  },
  {
    id: 'flushing',
    name: 'Rødming',
    category: 'skin',
    type: 'flushing',
    defaultSeverity: 4,
    icon: Thermometer,
    color: '#d97706',
    bgColor: '#fffbeb',
  },
];

interface CriticalSymptomShortcutsProps {
  onSymptomLogged: () => void;
  weatherData?: WeatherData | null;
}

export const CriticalSymptomShortcuts: React.FC<CriticalSymptomShortcutsProps> = ({
  onSymptomLogged,
  weatherData,
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleQuickLog = async (symptom: CriticalSymptom) => {
    setLoading(symptom.id);

    try {
      // Log symptom with minimal data - quick capture for emergencies
      await symptomsApi.create({
        category: symptom.category,
        type: symptom.type,
        severity: symptom.defaultSeverity,
        duration_minutes: 1, // Backend requires min 1 (0 = still ongoing is handled by not having ended_at)
        intensity_change: 'stable',
        body_regions: ['general'], // Backend requires at least one region
        started_at: new Date(),
        capture_method: 'quick',
        enrichment_status: 'minimal',
        // Automatically include weather data if available
        weather_data: weatherData ? {
          temperature: weatherData.temperature,
          humidity: weatherData.humidity,
          pressure: weatherData.pressure,
          weather_code: weatherData.weather_code,
        } : undefined,
      });

      setSuccess(symptom.id);

      // Auto-hide success after 2 seconds
      setTimeout(() => {
        setSuccess(null);
        onSymptomLogged();
      }, 2000);
    } catch (error) {
      console.error('Failed to log symptom:', error);
      alert('Kunne ikke registrere symptom. Prøv igjen.');
    } finally {
      setLoading(null);
    }
  };

  const renderSymptomButton = (symptom: CriticalSymptom) => {
    const Icon = symptom.icon;
    const isLoading = loading === symptom.id;
    const isSuccess = success === symptom.id;

    return (
      <button
        key={symptom.id}
        onClick={() => handleQuickLog(symptom)}
        disabled={isLoading || isSuccess}
        className={`
          relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
          ${isSuccess
            ? 'bg-green-50 border-green-500'
            : `hover:shadow-md active:scale-95 border-gray-200`
          }
          ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
          ${symptom.isEmergency ? 'ring-2 ring-red-200 ring-opacity-50' : ''}
        `}
        style={{
          backgroundColor: isSuccess ? '#f0fdf4' : symptom.bgColor,
        }}
      >
        {/* Emergency Badge */}
        {symptom.isEmergency && !isSuccess && (
          <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
            AKUTT
          </div>
        )}

        {/* Success Checkmark */}
        {isSuccess && (
          <div className="absolute -top-2 -right-2 bg-green-600 text-white rounded-full p-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}

        {/* Icon */}
        <div
          className="rounded-full p-3"
          style={{
            backgroundColor: isSuccess ? '#86efac' : symptom.color + '20',
          }}
        >
          <Icon
            className="w-6 h-6"
            style={{ color: isSuccess ? '#16a34a' : symptom.color }}
          />
        </div>

        {/* Label */}
        <span
          className="text-sm font-medium text-center"
          style={{ color: isSuccess ? '#16a34a' : '#374151' }}
        >
          {isSuccess ? 'Lagret!' : symptom.name}
        </span>

        {/* Severity Indicator */}
        {!isSuccess && (
          <div className="flex gap-1">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="w-1 h-2 rounded-full"
                style={{
                  backgroundColor: i < symptom.defaultSeverity ? symptom.color : '#e5e7eb'
                }}
              />
            ))}
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {/* Emergency Symptoms */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-semibold text-gray-900">Akutte symptomer</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ANAPHYLACTIC_SYMPTOMS.map(renderSymptomButton)}
        </div>
        <p className="mt-2 text-xs text-red-600 font-medium">
          ⚠️ Ved alvorlige symptomer - søk øyeblikkelig medisinsk hjelp!
        </p>
      </div>

      {/* Common MCAS Symptoms */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Vanlige MCAS-symptomer</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {COMMON_MCAS_SYMPTOMS.map(renderSymptomButton)}
        </div>
      </div>

      {/* Helper Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <strong>Tips:</strong> Klikk på et symptom for rask registrering. Du kan legge til detaljer
          som kroppsområde, triggers og notater senere fra symptomloggen.
        </p>
      </div>
    </div>
  );
};
