import React from 'react';
import { Download, RefreshCw, X, Wifi, WifiOff, Smartphone } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';
import { useToast } from '../UI/Toast';

export function PWAPrompt() {
  const {
    isOnline,
    canInstall,
    needRefresh,
    isOfflineReady,
    installApp,
    updateApp,
    dismissUpdate,
    dismissOfflineReady,
  } = usePWA();

  const { success, info } = useToast();

  const handleInstall = async () => {
    const installed = await installApp();
    if (installed) {
      success('App installed successfully!', 'You can now use MCAS-Life offline');
    }
  };

  const handleUpdate = async () => {
    info('Updating app...', 'Please wait while we update to the latest version');
    await updateApp();
  };

  // Network status indicator
  const NetworkStatus = () => (
    <div className={`fixed top-4 left-4 z-50 flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
      isOnline 
        ? 'bg-green-50 text-green-800 border border-green-200' 
        : 'bg-red-50 text-red-800 border border-red-200'
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
  );

  // Install app prompt
  const InstallPrompt = () => (
    <div className="fixed bottom-4 left-4 right-4 mx-auto max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 animate-slide-up">
      <div className="flex items-start space-x-3">
        <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
          <Smartphone className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            Install MCAS-Life
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            Install the app for offline access and better performance
          </p>
          <div className="flex space-x-2">
            <button
              onClick={handleInstall}
              className="flex items-center space-x-1 px-3 py-2 bg-primary-500 text-white text-sm font-medium rounded-md hover:bg-primary-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Install</span>
            </button>
            <button
              onClick={() => {}} // Could add dismiss logic
              className="px-3 py-2 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // App update available
  const UpdatePrompt = () => (
    <div className="fixed bottom-4 left-4 right-4 mx-auto max-w-sm bg-white border border-blue-200 rounded-lg shadow-lg p-4 z-50 animate-slide-up">
      <div className="flex items-start space-x-3">
        <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            Update Available
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            A new version of MCAS-Life is ready to install
          </p>
          <div className="flex space-x-2">
            <button
              onClick={handleUpdate}
              className="flex items-center space-x-1 px-3 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Update</span>
            </button>
            <button
              onClick={dismissUpdate}
              className="px-3 py-2 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Offline ready notification
  const OfflineReadyPrompt = () => (
    <div className="fixed bottom-4 left-4 right-4 mx-auto max-w-sm bg-white border border-green-200 rounded-lg shadow-lg p-4 z-50 animate-slide-up">
      <div className="flex items-start space-x-3">
        <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
          <WifiOff className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            Offline Ready
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            App is now available offline with cached data
          </p>
          <button
            onClick={dismissOfflineReady}
            className="px-3 py-2 bg-green-500 text-white text-sm font-medium rounded-md hover:bg-green-600 transition-colors"
          >
            Got it
          </button>
        </div>
        <button
          onClick={dismissOfflineReady}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <NetworkStatus />
      {canInstall && <InstallPrompt />}
      {needRefresh && <UpdatePrompt />}
      {isOfflineReady && <OfflineReadyPrompt />}
    </>
  );
}

// Add animation styles to CSS
export const pwaStyles = `
@keyframes slide-up {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
`;