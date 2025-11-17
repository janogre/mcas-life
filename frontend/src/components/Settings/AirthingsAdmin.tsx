/**
 * Airthings Admin Configuration Component
 *
 * Allows administrators to configure Airthings API credentials
 */

import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import api from '../../lib/api';
import { ButtonSpinner } from '../UI/LoadingSpinner';

interface AirthingsConfig {
  configured: boolean;
  clientId: string | null;
  redirectUri: string | null;
}

interface AirthingsDevice {
  id: string;
  deviceType: string;
  segment?: {
    name?: string;
  };
}

interface AirthingsStatus {
  configured: boolean;
  deviceCount: number;
  devices?: AirthingsDevice[];
}

export function AirthingsAdmin() {
  const [config, setConfig] = useState<AirthingsConfig | null>(null);
  const [status, setStatus] = useState<AirthingsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch configuration
      const configResponse = await api.get<{ success: boolean; data: AirthingsConfig }>('/settings/airthings');
      setConfig(configResponse.data.data);

      // If configured, fetch device status
      if (configResponse.data.data.configured) {
        try {
          const statusResponse = await api.get<{ success: boolean; data: AirthingsStatus }>('/airthings/status');
          setStatus(statusResponse.data.data);
        } catch (statusErr) {
          console.error('Failed to fetch device status:', statusErr);
          // Don't set error - configuration might be valid but API temporarily unavailable
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load Airthings configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientId.trim() || !clientSecret.trim()) {
      setError('Client ID and Client Secret are required');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await api.put('/settings/airthings', {
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
        redirectUri: 'http://localhost:3000/callback',
      });

      setSuccess('Airthings credentials saved successfully');
      setClientId('');
      setClientSecret('');

      // Refresh config
      await fetchConfig();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save Airthings credentials');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove Airthings credentials? Users will not be able to connect to Airthings until new credentials are configured.')) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      setSuccess(null);

      await api.delete('/settings/airthings');

      setSuccess('Airthings credentials removed');
      setClientId('');
      setClientSecret('');

      // Refresh config
      await fetchConfig();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove Airthings credentials');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-center py-8">
          <ButtonSpinner className="text-primary-600" />
          <span className="ml-2 text-gray-600">Loading configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary-100 rounded-lg">
          <Settings className="w-6 h-6 text-primary-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Airthings API Configuration</h3>
          <p className="text-sm text-gray-600">Configure Airthings Consumer API credentials</p>
        </div>
      </div>

      {/* Current Status */}
      {config && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">API Status:</span>
            {status?.configured ? (
              <span className="inline-flex items-center gap-1 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                OK - {status.deviceCount} {status.deviceCount === 1 ? 'sensor' : 'sensorer'} funnet
              </span>
            ) : config.configured ? (
              <span className="inline-flex items-center gap-1 text-sm text-amber-600">
                <AlertCircle className="w-4 h-4" />
                Konfigurert (henter sensorer...)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                <AlertCircle className="w-4 h-4" />
                Ikke konfigurert
              </span>
            )}
          </div>
          {config.configured && config.clientId && (
            <div className="text-sm text-gray-600 mb-3">
              <div><span className="font-medium">Client ID:</span> {config.clientId}</div>
            </div>
          )}

          {/* Device List */}
          {status?.devices && status.devices.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Tilgjengelige sensorer:</p>
              <ul className="space-y-1">
                {status.devices.map((device) => (
                  <li key={device.id} className="text-sm text-gray-600 flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    <span className="font-medium">{device.deviceType}</span>
                    {device.segment?.name && (
                      <span className="text-gray-500">({device.segment.name})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900">Success</p>
            <p className="text-sm text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client ID
          </label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="Enter Airthings Client ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={saving}
          />
          <p className="mt-1 text-xs text-gray-500">
            Get this from <a href="https://dashboard.airthings.com/integrations/api-integration" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">Airthings Dashboard</a>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Client Secret
          </label>
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder="Enter Airthings Client Secret"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            disabled={saving}
          />
          <p className="mt-1 text-xs text-gray-500">
            This will be encrypted in the database
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <ButtonSpinner />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Credentials</span>
              </>
            )}
          </button>

          {config?.configured && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {deleting ? (
                <>
                  <ButtonSpinner />
                  <span>Removing...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Remove</span>
                </>
              )}
            </button>
          )}
        </div>
      </form>

      {/* Documentation */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Oppsettsinstruksjoner</h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Opprett en API-integrasjon på <a href="https://dashboard.airthings.com/integrations/api-integration" target="_blank" rel="noopener noreferrer" className="underline">Airthings Dashboard</a></li>
          <li>Kopier Client ID og Client Secret</li>
          <li>Lim inn credentials over og klikk "Save Credentials"</li>
          <li>Alle brukere vil nå se luftkvalitetsdata fra dine Airthings-sensorer</li>
        </ol>
      </div>

      {/* API Information */}
      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h4 className="text-sm font-semibold text-green-900 mb-2">ℹ️ Om Airthings-integrasjonen</h4>
        <ul className="text-sm text-green-800 space-y-1">
          <li>✓ Bruker Airthings Consumer API med Client Credentials flow</li>
          <li>✓ Alle brukere ser data fra administrator sine sensorer</li>
          <li>✓ Data inkluderer: temperatur, fuktighet, CO₂, VOC, PM2.5, radon</li>
          <li>✓ MCAS-risikoanalyse kjøres automatisk på luftkvalitetsdata</li>
        </ul>
      </div>
    </div>
  );
}
