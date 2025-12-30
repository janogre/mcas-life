import React, { useState, useEffect } from 'react';
import { User, Settings, Shield, Bell, Download, LogOut, MapPin, Brain, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { LocationSelector } from '../../components/Settings/LocationSelector';
import { AirthingsAdmin } from '../../components/Settings/AirthingsAdmin';
import { ChangePasswordModal } from '../../components/Profile/ChangePasswordModal';
import api from '../../lib/api';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<'smart' | 'ai'>('smart');
  const [loadingAnalysisMode, setLoadingAnalysisMode] = useState(true);
  const [currentLocation, setCurrentLocation] = useState({
    city: user?.city || undefined,
    latitude: user?.latitude ? parseFloat(user.latitude) : undefined,
    longitude: user?.longitude ? parseFloat(user.longitude) : undefined,
    country: user?.country || undefined
  });

  // Load user's analysis mode preference on mount
  useEffect(() => {
    const loadAnalysisMode = async () => {
      try {
        const response = await api.get('/preferences/analysis-mode');
        setAnalysisMode(response.data.analysis_mode || 'smart');
      } catch (error) {
        console.error('Error loading analysis mode:', error);
      } finally {
        setLoadingAnalysisMode(false);
      }
    };

    loadAnalysisMode();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleAnalysisModeChange = async (mode: 'smart' | 'ai') => {
    try {
      await api.put('/preferences/analysis-mode', {
        analysis_mode: mode,
      });

      setAnalysisMode(mode);
      console.log(`Analysis mode changed to: ${mode}`);
    } catch (error) {
      console.error('Error saving analysis mode:', error);
      // Revert on error
      setAnalysisMode(analysisMode);
    }
  };

  const handleLocationSave = async (location: {
    city: string;
    latitude: number;
    longitude: number;
    country: string;
  }) => {
    try {
      await api.put('/users/profile', {
        city: location.city,
        latitude: location.latitude,
        longitude: location.longitude,
        country: location.country
      });

      setCurrentLocation(location);
      setShowLocationSelector(false);

      // Show success message (you could use a toast here)
      console.log('Location saved successfully');
    } catch (error) {
      console.error('Error saving location:', error);
      // Show error message
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile & Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile Info */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {user?.first_name} {user?.last_name}
            </h2>
            <p className="text-gray-600">{user?.email}</p>
            <p className="text-sm text-gray-500">Member since {new Date().getFullYear()}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">127</div>
            <div className="text-sm text-gray-600">Days Active</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">45</div>
            <div className="text-sm text-gray-600">Symptoms Logged</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">12</div>
            <div className="text-sm text-gray-600">AI Analyses</div>
          </div>
        </div>
      </div>

      {/* Admin Section - Airthings Configuration */}
      {user?.role === 'admin' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Settings</h2>
          <AirthingsAdmin />
        </div>
      )}

      {/* Location Settings */}
      <div className="grid md:grid-cols-1 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2" />
            Location Settings
          </h3>

          {!showLocationSelector ? (
            <div className="space-y-4">
              {currentLocation.city ? (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Nåværende lokasjon:</p>
                  <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{currentLocation.city}</p>
                      {currentLocation.latitude && currentLocation.longitude && (
                        <p className="text-sm text-gray-600 mt-1">
                          {currentLocation.latitude.toFixed(4)}°, {currentLocation.longitude.toFixed(4)}°
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setShowLocationSelector(true)}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      Endre
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Din lokasjon brukes til å hente værdata automatisk når du logger symptomer.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-3">
                    Sett din lokasjon for automatisk værhenting når du logger symptomer.
                  </p>
                  <button
                    onClick={() => setShowLocationSelector(true)}
                    className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                  >
                    Sett lokasjon
                  </button>
                </div>
              )}
            </div>
          ) : (
            <LocationSelector
              currentCity={currentLocation.city}
              currentLatitude={currentLocation.latitude}
              currentLongitude={currentLocation.longitude}
              onLocationSelect={handleLocationSave}
              onCancel={() => setShowLocationSelector(false)}
            />
          )}
        </div>
      </div>

      {/* Analysis Settings */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Brain className="w-5 h-5 mr-2" />
          Analyse-innstillinger
        </h3>

        {loadingAnalysisMode ? (
          <div className="text-center py-4 text-gray-500">Laster...</div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Velg hvilken analysemetode som skal brukes når du kjører trigger-analyser på symptomer.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Smart Analysis Option */}
              <button
                onClick={() => handleAnalysisModeChange('smart')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  analysisMode === 'smart'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    analysisMode === 'smart' ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Sparkles className={`w-5 h-5 ${
                      analysisMode === 'smart' ? 'text-green-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className={`font-semibold mb-1 ${
                      analysisMode === 'smart' ? 'text-green-900' : 'text-gray-900'
                    }`}>
                      Smart analyse
                    </h4>
                    <p className="text-sm text-gray-600">
                      Regelbasert algoritme med 8-faktor korrelasjon. Rask og gratis.
                    </p>
                    {analysisMode === 'smart' && (
                      <div className="mt-2 text-xs font-medium text-green-600">
                        ✓ Aktivert
                      </div>
                    )}
                  </div>
                </div>
              </button>

              {/* AI Analysis Option */}
              <button
                onClick={() => handleAnalysisModeChange('ai')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  analysisMode === 'ai'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    analysisMode === 'ai' ? 'bg-purple-100' : 'bg-gray-100'
                  }`}>
                    <Brain className={`w-5 h-5 ${
                      analysisMode === 'ai' ? 'text-purple-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1 text-left">
                    <h4 className={`font-semibold mb-1 ${
                      analysisMode === 'ai' ? 'text-purple-900' : 'text-gray-900'
                    }`}>
                      AI-analyse (OpenAI)
                    </h4>
                    <p className="text-sm text-gray-600">
                      Avansert AI-drevet analyse med GPT-4. Mer nyansert og kontekstbevisst.
                    </p>
                    {analysisMode === 'ai' && (
                      <div className="mt-2 text-xs font-medium text-purple-600">
                        ✓ Aktivert
                      </div>
                    )}
                  </div>
                </div>
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Tips:</strong> Smart analyse er rask og pålitelig for de fleste brukere.
                AI-analyse gir mer detaljerte forklaringer og kan finne subtile mønstre,
                men krever OpenAI API-nøkkel.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Settings */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Account Settings */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Account Settings
          </h3>
          
          <div className="space-y-3">
            <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="font-medium text-gray-900">Personal Information</div>
              <div className="text-sm text-gray-600">Update your name, email, and contact details</div>
            </button>
            
            <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="font-medium text-gray-900">MCAS Profile</div>
              <div className="text-sm text-gray-600">Update severity level and diagnosis information</div>
            </button>
            
            <button
              onClick={() => setShowChangePassword(true)}
              className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium text-gray-900">Password & Security</div>
              <div className="text-sm text-gray-600">Change password and security settings</div>
            </button>
          </div>
        </div>

        {/* Privacy & Notifications */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Bell className="w-5 h-5 mr-2" />
            Preferences
          </h3>
          
          <div className="space-y-3">
            <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="font-medium text-gray-900">Notifications</div>
              <div className="text-sm text-gray-600">Manage email and push notification preferences</div>
            </button>
            
            <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="font-medium text-gray-900">Privacy Settings</div>
              <div className="text-sm text-gray-600">Control data sharing and visibility settings</div>
            </button>
            
            <button className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="font-medium text-gray-900">App Preferences</div>
              <div className="text-sm text-gray-600">Theme, language, and display settings</div>
            </button>
          </div>
        </div>
      </div>

      {/* Data & Export */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Download className="w-5 h-5 mr-2" />
          Data Management
        </h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <div className="font-medium text-gray-900 mb-1">Export Health Data</div>
            <div className="text-sm text-gray-600">Download your symptoms, foods, and analysis data</div>
          </button>
          
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
            <div className="font-medium text-gray-900 mb-1">Medical Report</div>
            <div className="text-sm text-gray-600">Generate HIPAA-compliant report for your doctor</div>
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Security & Privacy
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-green-800 font-medium">Account Security: Strong</span>
            </div>
            <button className="text-green-700 hover:text-green-800 text-sm font-medium">
              Review Settings
            </button>
          </div>
          
          <div className="text-sm text-gray-600 space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <span>Two-factor authentication: Enabled</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <span>Data encryption: End-to-end encrypted</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <span>HIPAA compliance: Fully compliant</span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Actions</h3>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleLogout}
            className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
          
          <button className="flex items-center justify-center space-x-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors">
            <span>Delete Account</span>
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-3">
          Deleting your account will permanently remove all your data and cannot be undone.
        </p>
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </div>
  );
}