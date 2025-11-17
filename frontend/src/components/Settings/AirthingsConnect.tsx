import React, { useState, useEffect } from 'react';
import { Wind, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
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

export function AirthingsConnect() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [isLoadingAirQuality, setIsLoadingAirQuality] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<{ success: boolean; data: { connected: boolean } }>(
        '/airthings/status'
      );
      setIsConnected(response.data.data.connected);

      // If connected, load current air quality
      if (response.data.data.connected) {
        loadAirQuality();
      }
    } catch (error) {
      console.error('Error checking Airthings status:', error);
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

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // Get OAuth authorization URL
      const response = await api.get<{ success: boolean; data: { authUrl: string }; error?: string }>(
        '/airthings/auth-url'
      );

      // Redirect to Airthings OAuth page
      window.location.href = response.data.data.authUrl;
    } catch (error: any) {
      console.error('Error initiating Airthings connection:', error);
      const errorMsg = error.response?.data?.error || 'Kunne ikke koble til Airthings';
      setError(errorMsg);
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Er du sikker på at du vil koble fra Airthings?')) {
      return;
    }

    try {
      await api.post('/airthings/disconnect');
      setIsConnected(false);
      setAirQuality(null);
    } catch (error) {
      console.error('Error disconnecting Airthings:', error);
      setError('Kunne ikke koble fra Airthings');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'moderate':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="md" message="Laster Airthings-status..." />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wind className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Airthings Inneklima</h3>
            <p className="text-sm text-gray-600">
              Knytt til ditt Airthings-system for å automatisk registrere inneklimadata
            </p>
          </div>
        </div>
        {isConnected ? (
          <CheckCircle className="w-6 h-6 text-green-600" />
        ) : (
          <XCircle className="w-6 h-6 text-gray-400" />
        )}
      </div>

      {/* Connection Status */}
      {!isConnected ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Airthings måler luftkvalitet som kan påvirke MCAS-symptomer: CO₂, VOC, PM2.5,
            fuktighet, temperatur og radon.
          </p>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <LoadingSpinner size="sm" />
                <span>Kobler til...</span>
              </>
            ) : (
              <span>Koble til Airthings</span>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Current Air Quality */}
          {isLoadingAirQuality ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" message="Henter luftkvalitetsdata..." />
            </div>
          ) : airQuality ? (
            <div
              className={`border rounded-lg p-4 ${getSeverityColor(
                airQuality.impact.severity
              )}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium text-sm mb-1">
                    {airQuality.air_quality.room_name || 'Luftkvalitet'}
                  </p>
                  <p className="text-xs opacity-75">
                    Målt:{' '}
                    {airQuality.air_quality.measured_at
                      ? new Date(airQuality.air_quality.measured_at).toLocaleString('no-NO')
                      : 'Ukjent'}
                  </p>
                </div>
                <button
                  onClick={loadAirQuality}
                  className="p-1 hover:bg-white/50 rounded transition-colors"
                  title="Oppdater data"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Sensor Values */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                {airQuality.air_quality.temperature !== undefined && (
                  <div className="text-sm">
                    <span className="font-medium">Temp:</span>{' '}
                    {airQuality.air_quality.temperature.toFixed(1)}°C
                  </div>
                )}
                {airQuality.air_quality.humidity !== undefined && (
                  <div className="text-sm">
                    <span className="font-medium">Fuktighet:</span>{' '}
                    {airQuality.air_quality.humidity.toFixed(0)}%
                  </div>
                )}
                {airQuality.air_quality.co2 !== undefined && (
                  <div className="text-sm">
                    <span className="font-medium">CO₂:</span> {airQuality.air_quality.co2} ppm
                  </div>
                )}
                {airQuality.air_quality.voc !== undefined && (
                  <div className="text-sm">
                    <span className="font-medium">VOC:</span> {airQuality.air_quality.voc} ppb
                  </div>
                )}
                {airQuality.air_quality.pm25 !== undefined && (
                  <div className="text-sm">
                    <span className="font-medium">PM2.5:</span>{' '}
                    {airQuality.air_quality.pm25.toFixed(1)} μg/m³
                  </div>
                )}
                {airQuality.air_quality.radon_short_term !== undefined && (
                  <div className="text-sm">
                    <span className="font-medium">Radon:</span>{' '}
                    {airQuality.air_quality.radon_short_term.toFixed(0)} Bq/m³
                  </div>
                )}
              </div>

              {/* Risk Factors */}
              {airQuality.impact.risk_factors.length > 0 && (
                <div className="border-t border-current/20 pt-3">
                  <div className="flex items-start gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p className="text-xs font-medium">MCAS påvirkningsfaktorer:</p>
                  </div>
                  <ul className="space-y-1 ml-6">
                    {airQuality.impact.risk_factors.map((factor, index) => (
                      <li key={index} className="text-xs">
                        • {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {airQuality.impact.recommendations.length > 0 && (
                <div className="border-t border-current/20 pt-3 mt-3">
                  <p className="text-xs font-medium mb-1">Anbefalinger:</p>
                  <ul className="space-y-1 ml-6">
                    {airQuality.impact.recommendations.map((rec, index) => (
                      <li key={index} className="text-xs">
                        • {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : error ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
              {error}
            </div>
          ) : null}

          <p className="text-xs text-gray-500">
            Luftkvalitetsdata lagres automatisk når du logger symptomer
          </p>

          {/* Disconnect Button */}
          <button
            onClick={handleDisconnect}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            Koble fra Airthings
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && !airQuality && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          {error}
        </div>
      )}
    </div>
  );
}
