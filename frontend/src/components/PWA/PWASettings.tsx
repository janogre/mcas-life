import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  RefreshCw, 
  Trash2, 
  Download, 
  Database,
  Wifi,
  WifiOff,
  HardDrive,
  Clock,
  AlertCircle
} from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';
import { useOfflineData } from '../../hooks/useOfflineData';
import { useToast } from '../UI/Toast';
import { LoadingSpinner } from '../UI/LoadingSpinner';

export function PWASettings() {
  const {
    isOnline,
    isInstalled,
    canInstall,
    needRefresh,
    installApp,
    updateApp,
    clearCache,
    getCacheSize,
  } = usePWA();

  const {
    pendingActions,
    isSyncing,
    lastSyncTime,
    hasUnsyncedData,
    syncPendingActions,
    clearOfflineData,
  } = useOfflineData();

  const { success, error, warning } = useToast();
  
  const [cacheInfo, setCacheInfo] = useState<{
    used: number;
    quota: number;
    usedMB: number;
    quotaMB: number;
  } | null>(null);
  const [isLoadingCache, setIsLoadingCache] = useState(true);

  // Load cache information
  useEffect(() => {
    async function loadCacheInfo() {
      const info = await getCacheSize();
      setCacheInfo(info);
      setIsLoadingCache(false);
    }
    loadCacheInfo();
  }, [getCacheSize]);

  const handleInstall = async () => {
    const installed = await installApp();
    if (installed) {
      success('App Installed', 'MCAS-Life is now installed on your device');
    } else {
      error('Installation Failed', 'Unable to install the app');
    }
  };

  const handleUpdate = async () => {
    warning('Updating App', 'Please wait while we update to the latest version');
    await updateApp();
  };

  const handleClearCache = async () => {
    try {
      await clearCache();
      success('Cache Cleared', 'All cached data has been removed');
      // Reload cache info
      const info = await getCacheSize();
      setCacheInfo(info);
    } catch (err) {
      error('Clear Failed', 'Unable to clear cache');
    }
  };

  const handleClearOfflineData = async () => {
    clearOfflineData();
    success('Offline Data Cleared', 'All offline data and pending actions removed');
  };

  const handleSync = async () => {
    try {
      await syncPendingActions();
      success('Sync Complete', 'All pending data has been synchronized');
    } catch (err) {
      error('Sync Failed', 'Unable to synchronize offline data');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${Math.round(mb * 100) / 100} MB`;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(date);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          PWA Settings
        </h2>
        <p className="text-sm text-gray-600">
          Manage offline functionality and app installation
        </p>
      </div>

      {/* Connection Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">Connection Status</h3>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
            isOnline 
              ? 'bg-green-50 text-green-800' 
              : 'bg-red-50 text-red-800'
          }`}>
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4" />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span>Offline</span>
              </>
            )}
          </div>
        </div>
        
        <p className="text-sm text-gray-600">
          {isOnline 
            ? 'Connected to the internet. All features available.'
            : 'Working offline. Some features may be limited.'
          }
        </p>
      </div>

      {/* Installation Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">App Installation</h3>
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
            isInstalled 
              ? 'bg-green-50 text-green-800' 
              : 'bg-gray-50 text-gray-800'
          }`}>
            <Smartphone className="w-4 h-4" />
            <span>{isInstalled ? 'Installed' : 'Web App'}</span>
          </div>
        </div>
        
        {canInstall && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-3">
              Install MCAS-Life for a better experience with offline support
            </p>
            <button
              onClick={handleInstall}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Install App</span>
            </button>
          </div>
        )}

        {needRefresh && (
          <div className="mb-4">
            <div className="flex items-center space-x-2 text-blue-600 mb-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Update Available</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              A new version is ready to install
            </p>
            <button
              onClick={handleUpdate}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Update Now</span>
            </button>
          </div>
        )}
      </div>

      {/* Storage Usage */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">Storage Usage</h3>
          <HardDrive className="w-5 h-5 text-gray-400" />
        </div>

        {isLoadingCache ? (
          <LoadingSpinner size="sm" message="Loading cache info..." />
        ) : cacheInfo ? (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Used Storage</span>
                <span className="font-medium">{formatBytes(cacheInfo.used)}</span>
              </div>
              <div className="flex justify-between text-sm mb-3">
                <span className="text-gray-600">Available Quota</span>
                <span className="font-medium">{formatBytes(cacheInfo.quota)}</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-500 h-2 rounded-full"
                  style={{ 
                    width: `${Math.min((cacheInfo.used / cacheInfo.quota) * 100, 100)}%` 
                  }}
                ></div>
              </div>
            </div>

            <button
              onClick={handleClearCache}
              className="flex items-center space-x-2 px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Cache</span>
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-600">Storage information not available</p>
        )}
      </div>

      {/* Offline Data Sync */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">Offline Data</h3>
          <Database className="w-5 h-5 text-gray-400" />
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Pending Actions</p>
              <p className="text-lg font-semibold text-gray-900">
                {pendingActions.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Last Sync</p>
              <p className="text-sm font-medium text-gray-900">
                {lastSyncTime ? formatDate(lastSyncTime) : 'Never'}
              </p>
            </div>
          </div>

          {hasUnsyncedData && (
            <div className="flex items-center space-x-2 text-yellow-600 mb-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Unsynced data available</span>
            </div>
          )}

          <div className="flex space-x-3">
            <button
              onClick={handleSync}
              disabled={!hasUnsyncedData || !isOnline || isSyncing}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSyncing ? (
                <LoadingSpinner size="sm" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>Sync Now</span>
            </button>

            <button
              onClick={handleClearOfflineData}
              className="flex items-center space-x-2 px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Offline Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-4">PWA Features</h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Service Worker</span>
            <span className="text-sm font-medium text-green-600">Active</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Offline Support</span>
            <span className="text-sm font-medium text-green-600">Enabled</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Background Sync</span>
            <span className="text-sm font-medium text-green-600">Available</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Push Notifications</span>
            <span className="text-sm font-medium text-gray-400">Not Implemented</span>
          </div>
        </div>
      </div>
    </div>
  );
}