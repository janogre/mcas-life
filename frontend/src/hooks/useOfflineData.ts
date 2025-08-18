import { useState, useEffect, useCallback } from 'react';
import { usePWA } from './usePWA';

interface OfflineAction {
  id: string;
  type: 'POST' | 'PUT' | 'DELETE';
  url: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

interface OfflineDataState {
  pendingActions: OfflineAction[];
  isSyncing: boolean;
  lastSyncTime: Date | null;
  hasUnsyncedData: boolean;
}

const OFFLINE_STORAGE_KEY = 'mcas-offline-data';
const OFFLINE_ACTIONS_KEY = 'mcas-offline-actions';

export function useOfflineData() {
  const { isOnline } = usePWA();
  const [state, setState] = useState<OfflineDataState>({
    pendingActions: [],
    isSyncing: false,
    lastSyncTime: null,
    hasUnsyncedData: false,
  });

  // Load offline data and actions from localStorage on mount
  useEffect(() => {
    const storedActions = localStorage.getItem(OFFLINE_ACTIONS_KEY);
    const lastSync = localStorage.getItem('mcas-last-sync');
    
    if (storedActions) {
      try {
        const actions = JSON.parse(storedActions);
        setState(prev => ({
          ...prev,
          pendingActions: actions,
          hasUnsyncedData: actions.length > 0,
          lastSyncTime: lastSync ? new Date(lastSync) : null,
        }));
      } catch (error) {
        console.error('Error loading offline actions:', error);
      }
    }
  }, []);

  // Save offline actions to localStorage
  const saveOfflineActions = useCallback((actions: OfflineAction[]) => {
    localStorage.setItem(OFFLINE_ACTIONS_KEY, JSON.stringify(actions));
  }, []);

  // Store data locally for offline access
  const storeOfflineData = useCallback((key: string, data: any) => {
    try {
      const existingData = localStorage.getItem(OFFLINE_STORAGE_KEY);
      const offlineData = existingData ? JSON.parse(existingData) : {};
      
      offlineData[key] = {
        data,
        timestamp: Date.now(),
        synced: isOnline,
      };
      
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(offlineData));
    } catch (error) {
      console.error('Error storing offline data:', error);
    }
  }, [isOnline]);

  // Retrieve offline data
  const getOfflineData = useCallback((key: string, maxAge?: number) => {
    try {
      const offlineData = localStorage.getItem(OFFLINE_STORAGE_KEY);
      if (!offlineData) return null;
      
      const data = JSON.parse(offlineData);
      const item = data[key];
      
      if (!item) return null;
      
      // Check if data is too old
      if (maxAge && (Date.now() - item.timestamp > maxAge)) {
        return null;
      }
      
      return item.data;
    } catch (error) {
      console.error('Error retrieving offline data:', error);
      return null;
    }
  }, []);

  // Queue action for when back online
  const queueOfflineAction = useCallback((
    type: 'POST' | 'PUT' | 'DELETE',
    url: string,
    data: any
  ) => {
    const action: OfflineAction = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      url,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    setState(prev => {
      const newActions = [...prev.pendingActions, action];
      saveOfflineActions(newActions);
      
      return {
        ...prev,
        pendingActions: newActions,
        hasUnsyncedData: true,
      };
    });

    return action.id;
  }, [saveOfflineActions]);

  // Sync pending actions when back online
  const syncPendingActions = useCallback(async () => {
    if (!isOnline || state.isSyncing || state.pendingActions.length === 0) {
      return;
    }

    setState(prev => ({ ...prev, isSyncing: true }));

    const failedActions: OfflineAction[] = [];
    const maxRetries = 3;

    for (const action of state.pendingActions) {
      try {
        const response = await fetch(action.url, {
          method: action.type,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: action.type === 'DELETE' ? undefined : JSON.stringify(action.data),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        console.log(`Successfully synced ${action.type} ${action.url}`);
      } catch (error) {
        console.error(`Failed to sync action ${action.id}:`, error);
        
        if (action.retryCount < maxRetries) {
          failedActions.push({
            ...action,
            retryCount: action.retryCount + 1,
          });
        } else {
          console.error(`Max retries reached for action ${action.id}, discarding`);
        }
      }
    }

    // Update state with remaining actions
    setState(prev => {
      saveOfflineActions(failedActions);
      localStorage.setItem('mcas-last-sync', new Date().toISOString());
      
      return {
        ...prev,
        pendingActions: failedActions,
        isSyncing: false,
        hasUnsyncedData: failedActions.length > 0,
        lastSyncTime: new Date(),
      };
    });
  }, [isOnline, state.isSyncing, state.pendingActions, saveOfflineActions]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && state.pendingActions.length > 0) {
      const timer = setTimeout(syncPendingActions, 1000); // Wait 1 second after coming online
      return () => clearTimeout(timer);
    }
  }, [isOnline, state.pendingActions.length, syncPendingActions]);

  // Clear all offline data
  const clearOfflineData = useCallback(() => {
    localStorage.removeItem(OFFLINE_STORAGE_KEY);
    localStorage.removeItem(OFFLINE_ACTIONS_KEY);
    localStorage.removeItem('mcas-last-sync');
    
    setState({
      pendingActions: [],
      isSyncing: false,
      lastSyncTime: null,
      hasUnsyncedData: false,
    });
  }, []);

  // Get cached SIGHI food data for offline use
  const getCachedFoodData = useCallback((query?: string) => {
    const cacheKey = query ? `foods-${query}` : 'foods-all';
    return getOfflineData(cacheKey, 7 * 24 * 60 * 60 * 1000); // 7 days max age
  }, [getOfflineData]);

  // Store symptom entry offline
  const storeSymptomOffline = useCallback((symptomData: any) => {
    if (!isOnline) {
      // Store locally and queue for sync
      const timestamp = Date.now();
      const localEntry = { ...symptomData, id: `offline-${timestamp}`, timestamp };
      
      storeOfflineData(`symptom-${timestamp}`, localEntry);
      queueOfflineAction('POST', '/api/symptoms', symptomData);
      
      return localEntry;
    }
    return null;
  }, [isOnline, storeOfflineData, queueOfflineAction]);

  return {
    ...state,
    isOnline,
    storeOfflineData,
    getOfflineData,
    queueOfflineAction,
    syncPendingActions,
    clearOfflineData,
    getCachedFoodData,
    storeSymptomOffline,
  };
}