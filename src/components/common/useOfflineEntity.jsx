import { useState, useCallback } from "react";
import { base44 } from "@/api/Client";
import { OfflineService, isOnline } from "./offlineStorage"; // Perhatikan impor ini
import { toast } from "sonner";

export function useOfflineEntity(entityType) {
  const [loading, setLoading] = useState(false);

  const list = useCallback(async () => {
    setLoading(true);
    try {
      if (isOnline()) {
        const data = await base44.entities[entityType].list();
        // Opsional: Update SQLite dengan data terbaru dari server di sini
        return data;
      }
      // Jika Offline, ambil dari SQLite
      return await OfflineService.getEntities(entityType);
    } catch (error) {
      return await OfflineService.getEntities(entityType);
    } finally {
      setLoading(false);
    }
  }, [entityType]);

  const create = useCallback(async (data) => {
    if (isOnline()) {
      try {
        return await base44.entities[entityType].create(data);
      } catch (e) {
        console.warn("Switching to offline mode...");
      }
    }

    // Eksekusi Simpan SQLite
    if (entityType === 'Farmer') {
      const id = await OfflineService.saveFarmerLocally(data);
      toast.info("Tersimpan di database lokal (Offline)");
      return { ...data, id, sync_status: 'pending' };
    }
    
    // Untuk entity lain (Land, dll)
    await OfflineService.addToQueue(entityType, 'CREATE', data);
    toast.info("Data masuk antrean sinkronisasi");
    return { ...data, sync_status: 'pending' };
  }, [entityType]);

  return { list, create, loading };
}