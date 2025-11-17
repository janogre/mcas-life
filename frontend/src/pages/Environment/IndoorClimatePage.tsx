/**
 * Indoor Climate Page
 *
 * Shows all Airthings sensors and MCAS-specific recommendations
 */

import React, { useState, useEffect } from 'react';
import { Wind, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import api from '../../lib/api';
import { ButtonSpinner } from '../../components/UI/LoadingSpinner';

interface AirQualityData {
  temperature?: number;
  humidity?: number;
  co2?: number;
  voc?: number;
  pm25?: number;
  radon_short_term?: number;
  pressure?: number;
  room_name?: string;
  measured_at?: string;
  device_id?: string;
  device_type?: string;
}

interface MCASImpact {
  severity: 'low' | 'moderate' | 'high';
  risk_factors: string[];
  recommendations: string[];
}

interface DeviceData {
  air_quality: AirQualityData;
  impact: MCASImpact;
}

export function IndoorClimatePage() {
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);
  const [expandedDeviceId, setExpandedDeviceId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if configured
      const statusResponse = await api.get<{ success: boolean; data: { configured: boolean } }>('/airthings/status');
      setConfigured(statusResponse.data.data.configured);

      if (!statusResponse.data.data.configured) {
        setLoading(false);
        return;
      }

      // Fetch all devices data
      const response = await api.get<{ success: boolean; data: { devices: DeviceData[] } }>('/airthings/all');
      setDevices(response.data.data.devices);
    } catch (err: any) {
      console.error('Error fetching indoor climate data:', err);
      setError(err.response?.data?.error || 'Kunne ikke hente inneklimaadata');
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'moderate':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level) {
      case 'low':
        return <CheckCircle className="w-5 h-5" />;
      case 'moderate':
        return <Minus className="w-5 h-5" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Minus className="w-5 h-5" />;
    }
  };

  const getRiskLevelText = (level: string) => {
    switch (level) {
      case 'low':
        return 'Lav risiko';
      case 'moderate':
        return 'Moderat risiko';
      case 'high':
        return 'Høy risiko';
      default:
        return 'Ukjent';
    }
  };

  const getParameterStatus = (value: number | undefined, thresholds: { good: number; moderate: number }, reverse?: boolean) => {
    if (value === undefined) return { icon: <Minus className="w-4 h-4 text-gray-400" />, color: 'text-gray-400' };

    let status: 'good' | 'moderate' | 'bad';
    if (reverse) {
      status = value <= thresholds.good ? 'good' : value <= thresholds.moderate ? 'moderate' : 'bad';
    } else {
      status = value <= thresholds.good ? 'good' : value <= thresholds.moderate ? 'moderate' : 'bad';
    }

    switch (status) {
      case 'good':
        return { icon: <CheckCircle className="w-4 h-4 text-green-500" />, color: 'text-green-600' };
      case 'moderate':
        return { icon: <Minus className="w-4 h-4 text-amber-500" />, color: 'text-amber-600' };
      case 'bad':
        return { icon: <AlertTriangle className="w-4 h-4 text-red-500" />, color: 'text-red-600' };
    }
  };

  const getRiskTriggers = (device: DeviceData): string[] => {
    const triggers: string[] = [];

    // CO2 levels
    if (device.air_quality.co2 !== undefined && device.air_quality.co2 > 1000) {
      triggers.push('CO₂');
    }

    // VOC levels
    if (device.air_quality.voc !== undefined && device.air_quality.voc > 500) {
      triggers.push('VOC');
    }

    // PM2.5 levels
    if (device.air_quality.pm25 !== undefined && device.air_quality.pm25 > 12) {
      triggers.push('PM2.5');
    }

    // Humidity
    if (device.air_quality.humidity !== undefined) {
      if (device.air_quality.humidity > 60 || device.air_quality.humidity < 30) {
        triggers.push('Fuktighet');
      }
    }

    // Radon
    if (device.air_quality.radon_short_term !== undefined && device.air_quality.radon_short_term > 100) {
      triggers.push('Radon');
    }

    return triggers;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inneklima</h1>
          <p className="text-gray-600 mt-1">Luftkvalitet og MCAS-anbefalinger</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <ButtonSpinner className="text-primary-600" />
          <span className="ml-2 text-gray-600">Henter inneklimaadata...</span>
        </div>
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inneklima</h1>
          <p className="text-gray-600 mt-1">Luftkvalitet og MCAS-anbefalinger</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-amber-900 mb-2">Airthings ikke konfigurert</h3>
              <p className="text-amber-800 mb-4">
                For å se inneklimaadata må en administrator først konfigurere Airthings API-credentials.
              </p>
              <p className="text-sm text-amber-700">
                Administrator: Gå til Profil → Admin Settings for å konfigurere Airthings.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inneklima</h1>
          <p className="text-gray-600 mt-1">Luftkvalitet og MCAS-anbefalinger</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-900 mb-2">Feil ved henting av data</h3>
              <p className="text-red-800">{error}</p>
              <button
                onClick={fetchData}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Prøv igjen
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inneklima</h1>
          <p className="text-gray-600 mt-1">{devices.length} {devices.length === 1 ? 'sensor' : 'sensorer'} aktiv</p>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
        >
          Oppdater
        </button>
      </div>

      {/* Overall Status Summary */}
      {devices.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Samlet MCAS-risiko</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {['low', 'moderate', 'high'].map((level) => {
              const count = devices.filter(d => d.impact.severity === level).length;
              return (
                <div key={level} className={`p-4 rounded-lg border ${getRiskLevelColor(level)}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {getRiskLevelIcon(level)}
                    <span className="font-semibold">{getRiskLevelText(level)}</span>
                  </div>
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm opacity-75">{count === 1 ? 'rom' : 'rom'}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Device List */}
      <div className="grid gap-3">
        {devices.map((device, index) => {
          const deviceId = device.air_quality.device_id || `device-${index}`;
          const isExpanded = expandedDeviceId === deviceId;

          return (
            <div key={deviceId} className="bg-white rounded-xl shadow-sm border border-gray-100">
              {/* Compact Room Header - Always Visible */}
              <button
                onClick={() => setExpandedDeviceId(isExpanded ? null : deviceId)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <Wind className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-semibold text-gray-900">
                      {device.air_quality.room_name || device.air_quality.device_type || 'Ukjent sensor'}
                    </h3>
                    {device.air_quality.measured_at && (
                      <p className="text-xs text-gray-500">
                        {new Date(device.air_quality.measured_at).toLocaleString('no-NO')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1 rounded-full border flex items-center gap-2 ${getRiskLevelColor(device.impact.severity)}`}>
                    {getRiskLevelIcon(device.impact.severity)}
                    <span className="text-sm font-semibold">{getRiskLevelText(device.impact.severity)}</span>
                  </div>
                  {getRiskTriggers(device).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {getRiskTriggers(device).map((trigger) => (
                        <span
                          key={trigger}
                          className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded-md border border-amber-200"
                        >
                          {trigger}
                        </span>
                      ))}
                    </div>
                  )}
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded Details - Only Shown When Clicked */}
              {isExpanded && (
                <div className="px-6 pb-6 border-t border-gray-100">
                  {/* Air Quality Metrics */}
                  <div className="grid md:grid-cols-3 gap-4 mt-4 mb-4">
              {device.air_quality.temperature !== undefined && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Temperatur</div>
                  <div className="text-2xl font-bold text-gray-900">{device.air_quality.temperature.toFixed(1)}°C</div>
                </div>
              )}
              {device.air_quality.humidity !== undefined && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                    <span>Fuktighet</span>
                    {getParameterStatus(device.air_quality.humidity, { good: 60, moderate: 70 }).icon}
                  </div>
                  <div className={`text-2xl font-bold ${getParameterStatus(device.air_quality.humidity, { good: 60, moderate: 70 }).color}`}>
                    {device.air_quality.humidity.toFixed(0)}%
                  </div>
                </div>
              )}
              {device.air_quality.co2 !== undefined && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                    <span>CO₂</span>
                    {getParameterStatus(device.air_quality.co2, { good: 800, moderate: 1000 }).icon}
                  </div>
                  <div className={`text-2xl font-bold ${getParameterStatus(device.air_quality.co2, { good: 800, moderate: 1000 }).color}`}>
                    {device.air_quality.co2} ppm
                  </div>
                </div>
              )}
              {device.air_quality.voc !== undefined && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                    <span>VOC</span>
                    {getParameterStatus(device.air_quality.voc, { good: 250, moderate: 500 }).icon}
                  </div>
                  <div className={`text-2xl font-bold ${getParameterStatus(device.air_quality.voc, { good: 250, moderate: 500 }).color}`}>
                    {device.air_quality.voc} ppb
                  </div>
                </div>
              )}
              {device.air_quality.pm25 !== undefined && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                    <span>PM2.5</span>
                    {getParameterStatus(device.air_quality.pm25, { good: 10, moderate: 25 }).icon}
                  </div>
                  <div className={`text-2xl font-bold ${getParameterStatus(device.air_quality.pm25, { good: 10, moderate: 25 }).color}`}>
                    {device.air_quality.pm25} μg/m³
                  </div>
                </div>
              )}
              {device.air_quality.radon_short_term !== undefined && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                    <span>Radon</span>
                    {getParameterStatus(device.air_quality.radon_short_term, { good: 100, moderate: 150 }).icon}
                  </div>
                  <div className={`text-2xl font-bold ${getParameterStatus(device.air_quality.radon_short_term, { good: 100, moderate: 150 }).color}`}>
                    {device.air_quality.radon_short_term} Bq/m³
                  </div>
                </div>
              )}
            </div>

            {/* MCAS Risk Factors */}
            {device.impact.risk_factors.length > 0 && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <h4 className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  MCAS-risikofaktorer
                </h4>
                <ul className="space-y-1">
                  {device.impact.risk_factors.map((factor, i) => (
                    <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                      <span className="text-amber-600">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

                  {/* Recommendations */}
                  {device.impact.recommendations.length > 0 && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Anbefalinger
                      </h4>
                      <ul className="space-y-1">
                        {device.impact.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm text-blue-800 flex items-start gap-2">
                            <span className="text-blue-600">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {devices.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <Wind className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ingen sensorer funnet</h3>
          <p className="text-gray-600">
            Kunne ikke finne noen Airthings-sensorer. Sjekk at sensorene er tilkoblet og konfigurert.
          </p>
        </div>
      )}
    </div>
  );
}
