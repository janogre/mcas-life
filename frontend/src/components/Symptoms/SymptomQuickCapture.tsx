import React, { useState } from 'react';
import { symptomsApi } from '../../lib/api';

interface SymptomTemplate {
  id: number;
  name_no: string;
  icon?: string;
  severity_label_low_no: string;
  severity_label_mid_no: string;
  severity_label_high_no: string;
}

interface SymptomQuickCaptureProps {
  template: SymptomTemplate;
  onComplete: (symptomId: number) => void;
  onCancel: () => void;
}

export const SymptomQuickCapture: React.FC<SymptomQuickCaptureProps> = ({
  template,
  onComplete,
  onCancel,
}) => {
  const [severity, setSeverity] = useState<number>(5);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuickCapture = async () => {
    try {
      setSaving(true);
      setError(null);

      const symptom = await symptomsApi.quickCapture(template.id, severity);

      // Auto-enrich in background (don't wait for it)
      symptomsApi.enrichSymptom(symptom.id).catch(console.error);

      onComplete(symptom.id);
    } catch (err) {
      console.error('Error capturing symptom:', err);
      setError('Kunne ikke registrere symptom. Prøv igjen.');
      setSaving(false);
    }
  };

  const getSeverityLabel = (value: number): string => {
    if (value <= 3) return template.severity_label_low_no;
    if (value <= 7) return template.severity_label_mid_no;
    return template.severity_label_high_no;
  };

  const getSeverityColor = (value: number): string => {
    if (value <= 3) return 'bg-green-500';
    if (value <= 7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {template.icon && <span className="text-3xl">{template.icon}</span>}
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{template.name_no}</h3>
            <p className="text-sm text-gray-500">Rask registrering</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          disabled={saving}
          className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Severity Slider */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">Alvorlighet</label>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-900">{severity}</span>
            <span className="text-sm text-gray-500">/ 10</span>
          </div>
        </div>

        {/* Severity Label */}
        <div className="mb-4 text-center">
          <span
            className={`inline-block px-4 py-2 rounded-full text-white font-medium ${getSeverityColor(
              severity
            )}`}
          >
            {getSeverityLabel(severity)}
          </span>
        </div>

        {/* Slider */}
        <input
          type="range"
          min="1"
          max="10"
          value={severity}
          onChange={(e) => setSeverity(parseInt(e.target.value))}
          disabled={saving}
          className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
          style={{
            background: `linear-gradient(to right, #10b981 0%, #eab308 50%, #ef4444 100%)`,
          }}
        />

        {/* Scale markers */}
        <div className="flex justify-between mt-2 px-1">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
            <button
              key={num}
              onClick={() => setSeverity(num)}
              disabled={saving}
              className={`text-xs font-medium transition-colors disabled:opacity-50 ${
                severity === num ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={saving}
          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Avbryt
        </button>
        <button
          onClick={handleQuickCapture}
          disabled={saving}
          className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Lagrer...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Registrer (5 sek)</span>
            </>
          )}
        </button>
      </div>

      {/* Helper Text */}
      <p className="mt-4 text-xs text-gray-500 text-center">
        Du kan legge til detaljer senere fra oversikten
      </p>
    </div>
  );
};
