/**
 * Airthings Connect Component V2
 *
 * Simplified version - displays air quality data from admin's configured Airthings devices
 * No user authentication needed, just shows if system is configured
 */

import React, { useState, useEffect } from 'react';
import { Wind, CheckCircle, XCircle, AlertTriangle, RefreshCw, Thermometer, Droplets } from 'lucide-react';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import api from '../../lib/api';

interface AirQualityData {
  air_quality: {
    temperature?: number;
    humidity?: number;
    co2?: number;
    voc?: number;
    pm25?: number;
    radon_short_term?: number;
    pressure?: number;
    room_name?: string;
    measured_at?: string;
  };
  impact: {
    risk_factors: string[];
    severity: 'low' | 'moderate' | 'high';
    recommendations: string[];
  };
}

export function AirthingsConnectV2() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [isLoadingAirQuality, setIsLoadingAirQuality] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<{ success: boolean; data: { configured: boolean; deviceCount: number } }>(
        '/airthings/status'
      );

      const configured = response.data.data.configured;
      setIsConfigured(configured);

      // If configured, load air quality data
      if (configured) {
        loadAirQuality();
      }
    } catch (error) {
      console.error('Error checking Airthings configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAirQuality = async () => {
    try {
      setIsLoadingAirQuality(true);
      setError(null);
      const response = await api.get<{ success: boolean; data: AirQualityData }>(
        '/airthings/current'
      );
      setAirQuality(response.data.data);
    } catch (error: any) {
      console.error('Error loading air quality:', error);
      if (error.response?.status === 404) {
        setError('Ingen luftkvalitetsdata tilgjengelig');
      } else {
        setError('Kunne ikke laste luftkvalitetsdata');
      }
    } finally {
      setIsLoadingAirQuality(false);
    }
  };

  const handleRefresh = () => {
    loadAirQuality();
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Wind className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Airthings Inneklima</h3>
            <p className="text-sm text-gray-600">
              {isConfigured ? 'Sanntidsdata fra sensorer' : 'Ikke konfigurert'}
            </p>
          </div>
        </div>
        {isConfigured && !isLoadingAirQuality && (
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Oppdater data"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        )}
      </div>

      {!isConfigured && (
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            Airthings-integrasjon er ikke konfigurert. Kontakt administrator for å legge til API-credentials.
          </p>
        </div>
      )}

      {isConfigured && isLoadingAirQuality && (
        <div className="mt-4 flex items-center justify-center py-8">
          <LoadingSpinner />
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {isConfigured && airQuality && !isLoadingAirQuality && (
        <div className="mt-4 space-y-4">
          {/* Room name */}
          {airQuality.air_quality.room_name && (
            <div className="text-sm font-medium text-gray-700">
              📍 {airQuality.air_quality.room_name}
            </div>
          )}

          {/* Air quality metrics */}
          <div className="grid grid-cols-2 gap-3">
            {airQuality.air_quality.temperature !== undefined && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Thermometer className="w-4 h-4 text-gray-600" />
                  <span className="text-xs text-gray-600">Temperatur</span>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {airQuality.air_quality.temperature.toFixed(1)}°C
                </div>
              </div>
            )}

            {airQuality.air_quality.humidity !== undefined && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Droplets className="w-4 h-4 text-gray-600" />
                  <span className="text-xs text-gray-600">Fuktighet</span>
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {airQuality.air_quality.humidity.toFixed(0)}%
                </div>
              </div>
            )}

            {airQuality.air_quality.co2 !== undefined && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">CO₂</div>
                <div className="text-lg font-semibold text-gray-900">
                  {airQuality.air_quality.co2} ppm
                </div>
              </div>
            )}

            {airQuality.air_quality.voc !== undefined && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">VOC</div>
                <div className="text-lg font-semibold text-gray-900">
                  {airQuality.air_quality.voc} ppb
                </div>
              </div>
            )}

            {airQuality.air_quality.pm25 !== undefined && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">PM2.5</div>
                <div className="text-lg font-semibold text-gray-900">
                  {airQuality.air_quality.pm25.toFixed(1)} μg/m³
                </div>
              </div>
            )}

            {airQuality.air_quality.radon_short_term !== undefined && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-600 mb-1">Radon</div>
                <div className="text-lg font-semibold text-gray-900">
                  {airQuality.air_quality.radon_short_term} Bq/m³
                </div>
              </div>
            )}
          </div>

          {/* MCAS Impact Analysis */}
          {airQuality.impact && airQuality.impact.risk_factors.length > 0 && (
            <div
              className={`p-4 rounded-lg border ${
                airQuality.impact.severity === 'high'
                  ? 'bg-red-50 border-red-200'
                  : airQuality.impact.severity === 'moderate'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-green-50 border-green-200'
              }`}
            >
              <div className="flex items-start gap-2 mb-2">
                {airQuality.impact.severity === 'high' ? (
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                ) : airQuality.impact.severity === 'moderate' ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="font-medium text-sm mb-1">
                    {airQuality.impact.severity === 'high'
                      ? 'Høy risiko for MCAS-symptomer'
                      : airQuality.impact.severity === 'moderate'
                      ? 'Moderat risiko'
                      : 'Lav risiko'}
                  </div>
                  <ul className="text-xs space-y-1">
                    {airQuality.impact.risk_factors.map((factor, idx) => (
                      <li key={idx}>• {factor}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {airQuality.impact.recommendations.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="text-xs font-medium mb-1">Anbefalinger:</div>
                  <ul className="text-xs space-y-1">
                    {airQuality.impact.recommendations.map((rec, idx) => (
                      <li key={idx}>✓ {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Timestamp */}
          {airQuality.air_quality.measured_at && (
            <div className="text-xs text-gray-500">
              Målt: {new Date(airQuality.air_quality.measured_at).toLocaleString('no-NO')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
