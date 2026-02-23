import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/Client";
// Impor yang diperbaiki: Ambil isOnline dan OfflineService
import { OfflineService, isOnline } from "./offlineStorage"; 
import { toast } from "sonner";

export function useSyncManager() {
  const [online, setOnline] = useState(isOnline());
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

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

  // Update jumlah antrean dari SQLite secara berkala
  useEffect(() => {
    const updateCount = async () => {
      const count = await OfflineService.getPendingCount(); // Kita buat fungsi ini di bawah
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
      await OfflineService.syncAll(base44);
      // Update UI setelah sync selesai
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
    forceSync: syncPendingData
  };
}