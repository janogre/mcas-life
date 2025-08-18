import { useState, useEffect, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

interface PWAState {
  isOnline: boolean;
  isInstalled: boolean;
  canInstall: boolean;
  needRefresh: boolean;
  isUpdateAvailable: boolean;
  isOfflineReady: boolean;
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWA() {
  const [pwaState, setPWAState] = useState<PWAState>({
    isOnline: navigator.onLine,
    isInstalled: false,
    canInstall: false,
    needRefresh: false,
    isUpdateAvailable: false,
    isOfflineReady: false,
  });

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Register service worker with vite-plugin-pwa
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('SW Registered: ', registration);
      // Check for updates every 60 seconds
      setInterval(() => {
        registration?.update();
      }, 60000);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
    onNeedRefresh() {
      setPWAState(prev => ({ ...prev, needRefresh: true, isUpdateAvailable: true }));
    },
    onOfflineReady() {
      setPWAState(prev => ({ ...prev, isOfflineReady: true }));
    },
  });

  // Handle network status changes
  useEffect(() => {
    const handleOnline = () => setPWAState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setPWAState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handle install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPWAState(prev => ({ ...prev, canInstall: true }));
    };

    const handleAppInstalled = () => {
      setPWAState(prev => ({ ...prev, isInstalled: true, canInstall: false }));
      setDeferredPrompt(null);
    };

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setPWAState(prev => ({ ...prev, isInstalled: true }));
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Update state when vite-plugin-pwa states change
  useEffect(() => {
    setPWAState(prev => ({
      ...prev,
      needRefresh,
      isUpdateAvailable: needRefresh,
      isOfflineReady: offlineReady,
    }));
  }, [needRefresh, offlineReady]);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setPWAState(prev => ({ ...prev, isInstalled: true, canInstall: false }));
      }
      
      setDeferredPrompt(null);
      return outcome === 'accepted';
    } catch (error) {
      console.error('Error installing PWA:', error);
      return false;
    }
  }, [deferredPrompt]);

  const updateApp = useCallback(async () => {
    try {
      await updateServiceWorker(true);
      setPWAState(prev => ({ ...prev, needRefresh: false, isUpdateAvailable: false }));
      // Reload to apply updates
      window.location.reload();
    } catch (error) {
      console.error('Error updating app:', error);
    }
  }, [updateServiceWorker]);

  const dismissUpdate = useCallback(() => {
    setNeedRefresh(false);
    setPWAState(prev => ({ ...prev, needRefresh: false, isUpdateAvailable: false }));
  }, [setNeedRefresh]);

  const dismissOfflineReady = useCallback(() => {
    setOfflineReady(false);
    setPWAState(prev => ({ ...prev, isOfflineReady: false }));
  }, [setOfflineReady]);

  // Cache management utilities
  const clearCache = useCallback(async () => {
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
        console.log('All caches cleared');
      } catch (error) {
        console.error('Error clearing caches:', error);
      }
    }
  }, []);

  const getCacheSize = useCallback(async () => {
    if ('caches' in window && 'storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          quota: estimate.quota || 0,
          usedMB: Math.round((estimate.usage || 0) / 1024 / 1024 * 100) / 100,
          quotaMB: Math.round((estimate.quota || 0) / 1024 / 1024 * 100) / 100,
        };
      } catch (error) {
        console.error('Error getting cache size:', error);
        return null;
      }
    }
    return null;
  }, []);

  return {
    ...pwaState,
    installApp,
    updateApp,
    dismissUpdate,
    dismissOfflineReady,
    clearCache,
    getCacheSize,
  };
}