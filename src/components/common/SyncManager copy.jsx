import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/Client";
import { 
  isOnline, 
  getOfflineData, 
  saveOfflineData,
  removeFromPendingSync,
  getPendingSyncCount,
  cacheServerData,
  updateLastSync,
  getLastSync,
  STORAGE_KEYS 
} from "./offlineStorage";
import { toast } from "sonner";

// Sync Manager Hook
export function useSyncManager() {
  const [online, setOnline] = useState(isOnline());
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(getPendingSyncCount());
  const [lastSync, setLastSync] = useState(getLastSync());

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      toast.success("Koneksi internet tersambung");
      syncPendingData();
    };
    
    const handleOffline = () => {
      setOnline(false);
      toast.warning("Mode offline - data disimpan lokal");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update pending count periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setPendingCount(getPendingSyncCount());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Sync pending data to server
  const syncPendingData = useCallback(async () => {
    if (!isOnline() || syncing) return;

    const queue = getOfflineData(STORAGE_KEYS.PENDING_SYNC);
    if (queue.length === 0) return;

    setSyncing(true);
    let successCount = 0;
    let failCount = 0;

    for (const action of queue) {
      try {
        const entity = base44.entities[action.entityType];
        if (!entity) {
          removeFromPendingSync(action.id);
          continue;
        }

        switch (action.operation) {
          case 'create':
            const created = await entity.create(action.data);
            // Update local cache with server ID
            if (action.localId) {
              updateLocalIdWithServerId(action.entityType, action.localId, created.id);
            }
            break;
          case 'update':
            await entity.update(action.entityId, action.data);
            break;
          case 'delete':
            await entity.delete(action.entityId);
            break;
        }

        removeFromPendingSync(action.id);
        successCount++;
      } catch (error) {
        console.error('Sync error:', error);
        failCount++;
        // Update retry count
        const queue = getOfflineData(STORAGE_KEYS.PENDING_SYNC);
        const updated = queue.map(item => 
          item.id === action.id 
            ? { ...item, retryCount: (item.retryCount || 0) + 1, lastError: error.message }
            : item
        );
        saveOfflineData(STORAGE_KEYS.PENDING_SYNC, updated);
      }
    }

    setSyncing(false);
    setPendingCount(getPendingSyncCount());
    updateLastSync();
    setLastSync(getLastSync());

    if (successCount > 0) {
      toast.success(`${successCount} data berhasil disinkronkan`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} data gagal disinkronkan`);
    }
  }, [syncing]);

  // Cache data from server
  const cacheFromServer = useCallback(async (entityType) => {
    if (!isOnline()) return getCachedData(entityType);
    
    try {
      const entity = base44.entities[entityType];
      if (!entity) return [];
      
      const data = await entity.list();
      cacheServerData(entityType, data);
      return data;
    } catch (error) {
      console.error('Cache error:', error);
      return getCachedData(entityType);
    }
  }, []);

  // Force sync
  const forceSync = useCallback(() => {
    if (isOnline()) {
      syncPendingData();
    } else {
      toast.error("Tidak ada koneksi internet");
    }
  }, [syncPendingData]);

  return {
    online,
    syncing,
    pendingCount,
    lastSync,
    syncPendingData,
    cacheFromServer,
    forceSync
  };
}

// Update local ID with server ID after sync
function updateLocalIdWithServerId(entityType, localId, serverId) {
  const cacheKey = `cache_${entityType}`;
  const cached = getOfflineData(cacheKey);
  if (cached?.data) {
    const updated = cached.data.map(item => 
      item.id === localId ? { ...item, id: serverId, _localId: localId } : item
    );
    saveOfflineData(cacheKey, { ...cached, data: updated });
  }
}

// Get cached data helper
function getCachedData(entityType) {
  const cacheKey = `cache_${entityType}`;
  const cached = getOfflineData(cacheKey);
  return cached?.data || [];
}