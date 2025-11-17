/**
 * Airthings OAuth Callback Page
 * Handles the redirect from Airthings after OAuth authorization
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import api from '../../lib/api';

export function AirthingsCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Check for OAuth errors
      if (error) {
        setStatus('error');
        setErrorMessage(errorDescription || error);
        setTimeout(() => navigate('/profile'), 3000);
        return;
      }

      // Check for authorization code
      if (!code) {
        setStatus('error');
        setErrorMessage('No authorization code received from Airthings');
        setTimeout(() => navigate('/profile'), 3000);
        return;
      }

      // Exchange code for access token
      try {
        await api.post('/airthings/connect', { code });
        setStatus('success');
        setTimeout(() => navigate('/profile'), 2000);
      } catch (err: any) {
        console.error('Error connecting to Airthings:', err);
        setStatus('error');
        setErrorMessage(err.response?.data?.error || 'Failed to connect to Airthings');
        setTimeout(() => navigate('/profile'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {status === 'loading' && (
          <div className="text-center">
            <Loader className="w-16 h-16 text-primary-600 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Kobler til Airthings...
            </h2>
            <p className="text-gray-600">
              Vennligst vent mens vi fullf\u00f8rer tilkoblingen
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Tilkoblet!
            </h2>
            <p className="text-gray-600">
              Airthings-kontoen din er n\u00e5 koblet til MCAS-life.
              <br />
              Sender deg tilbake til profil-siden...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Tilkobling feilet
            </h2>
            <p className="text-gray-600 mb-4">
              {errorMessage || 'Kunne ikke koble til Airthings. Pr\u00f8v igjen senere.'}
            </p>
            <p className="text-sm text-gray-500">
              Sender deg tilbake til profil-siden...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
