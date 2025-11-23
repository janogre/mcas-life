import React, { useState, useEffect } from 'react';
import { Cloud, CheckCircle, XCircle, Loader, AlertCircle } from 'lucide-react';
import { airthingsApi } from '../../lib/api';

export function AirthingsIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<any[]>([]);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const response = await airthingsApi.getStatus();

      if (response.success && response.data?.connected) {
        setIsConnected(true);
        // Fetch devices if connected
        try {
          const devicesResponse = await airthingsApi.getDevices();
          if (devicesResponse.success) {
            setDevices(devicesResponse.data || []);
          }
        } catch (err) {
          console.error('Error fetching devices:', err);
        }
      } else {
        setIsConnected(false);
      }
      setError(null);
    } catch (err) {
      console.error('Error checking Airthings status:', err);
      setError('Kunne ikke sjekke Airthings-status');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);

      // Get authorization URL
      const response = await airthingsApi.getAuthUrl();

      if (response.success && response.data?.authUrl) {
        // Redirect to Airthings OAuth
        window.location.href = response.data.authUrl;
      } else {
        setError('Kunne ikke generere autorisasjons-URL');
      }
    } catch (err: any) {
      console.error('Error initiating Airthings connection:', err);
      setError(err.response?.data?.error || 'Kunne ikke starte tilkobling til Airthings');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Er du sikker på at du vil koble fra Airthings?')) return;

    try {
      setLoading(true);
      await airthingsApi.disconnect();
      setIsConnected(false);
      setDevices([]);
      setError(null);
    } catch (err) {
      console.error('Error disconnecting Airthings:', err);
      setError('Kunne ikke koble fra Airthings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-center p-8">
          <Loader className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Cloud className="w-5 h-5 mr-2" />
          Airthings Integrasjon
        </h3>
        {isConnected ? (
          <div className="flex items-center text-green-600 text-sm font-medium">
            <CheckCircle className="w-4 h-4 mr-1" />
            Tilkoblet
          </div>
        ) : (
          <div className="flex items-center text-gray-400 text-sm font-medium">
            <XCircle className="w-4 h-4 mr-1" />
            Ikke tilkoblet
          </div>
        )}
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Koble til Airthings for å automatisk hente inneklimadata når du logger symptomer.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {!isConnected ? (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-900 mb-2">
              <strong>Hvorfor koble til Airthings?</strong>
            </p>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Automatisk registrering av luftkvalitet</li>
              <li>Koble symptomer med inneklima</li>
              <li>Identifiser triggere i spesifikke rom</li>
            </ul>
          </div>

          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center"
          >
            {connecting ? (
              <>
                <Loader className="w-5 h-5 mr-2 animate-spin" />
                Kobler til...
              </>
            ) : (
              <>
                <Cloud className="w-5 h-5 mr-2" />
                Koble til Airthings
              </>
            )}
          </button>
        </div>
      ) : (
        <div>
          {/* Device List */}
          {devices.length > 0 ? (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Tilkoblede enheter ({devices.length}):
              </p>
              <div className="space-y-2">
                {devices.map((device, index) => (
                  <div
                    key={device.id || index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900">
                        {device.segment?.name || device.deviceType || 'Unknown Device'}
                      </div>
                      {device.deviceType && (
                        <div className="text-xs text-gray-500">{device.deviceType}</div>
                      )}
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Ingen enheter funnet. Sjekk at du har Airthings-enheter registrert på kontoen din.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={checkStatus}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Oppdater
            </button>
            <button
              onClick={handleDisconnect}
              className="flex-1 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium hover:bg-red-100 transition-colors"
            >
              Koble fra
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
