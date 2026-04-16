import { useState, useEffect, useCallback } from "react";
import { OfflineService, isOnline } from "./offlineStorage"; 
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

export function useSyncManager() {
  const [online, setOnline] = useState(isOnline());
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { user } = useAuth();

  const executeSync = useCallback(async () => {
    if (!isOnline() || syncing) return;

    setSyncing(true);
    try {
      const hasPending = await OfflineService.hasPendingData();

      if (hasPending) {
        await OfflineService.syncAllPending();
        toast.success("Sinkronisasi data berhasil");
      } else {
        // await OfflineService.downloadFromServer();
        await OfflineService.syncDataFromServer();
      }
    } catch (error) {
      console.error('Sync process failed:', error);
    } finally {
      setSyncing(false);
    }
  }, []);

  // Monitor status online
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      toast.success("Koneksi internet tersambung");
      syncPendingData();
    };
    const handleOffline = () => {
      setOnline(false);
      toast.warning("Mode offline - data disimpan di SQLite");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      executeSync();
    };

    window.addEventListener('online', handleOnline);
    if (navigator.onLine) executeSync();
    return () => window.removeEventListener('online', handleOnline);
  }, [executeSync]);

  useEffect(() => {
    const updateCount = async () => {
      const count = await OfflineService.getPendingCount();
      setPendingCount(count);
    };
    
    updateCount();
    const interval = setInterval(updateCount, 3000);
    return () => clearInterval(interval);
  }, []);

  // Fungsi Sinkronisasi Utama (Menggunakan OfflineService.syncAll)
  const syncPendingData = useCallback(async () => {
    if (!isOnline() || syncing) return;
    
    setSyncing(true);
    try {
      // await OfflineService.syncAll(base44);
    
      const count = await OfflineService.getPendingCount();
      setPendingCount(count);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  return {
    online,
    syncing,
    pendingCount,
    syncPendingData,
    // forceSync: syncPendingData
    forceSync: executeSync
  };
}