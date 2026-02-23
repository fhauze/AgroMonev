import { useState, useCallback } from "react";
import { base44 } from "@/api/Client";
import { initDB } from "@/utils/sqlClient";
import { 
  isOnline, 
  getOfflineData, 
  saveOfflineData, 
  addToPendingSync,
  cacheServerData,
  updateLastSync
} from "./offlineStorage";
import { toast } from "sonner";

// Hook untuk operasi entity dengan dukungan offline
export function useOfflineEntity(entityType) {
  const [loading, setLoading] = useState(false);
  const cacheKey = `cache_${entityType}`;

  // List data - dari server jika online, dari cache jika offline
  const list = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    
    try {
      if (isOnline()) {
        const entity = base44.entities[entityType];
        if (entity) {
          const data = await entity.list();
          cacheServerData(entityType, data);
          setLoading(false);
          return data;
        }
      }
      
      // Offline - return cached data
      // const cached = getOfflineData(cacheKey);
      // setLoading(false);
      // return cached?.data || [];
      const data = await getEntities(entityType);
      console.log(data);
      return data;
    } catch (error) {
      console.error('List error:', error);
      // Fallback to cache on error
      const cached = getOfflineData(cacheKey);
      setLoading(false);
      return cached?.data || [];
    }
  }, [entityType, cacheKey]);

  // Filter data
  const filter = useCallback(async (query) => {
    setLoading(true);
    
    try {
      if (isOnline()) {
        const entity = base44.entities[entityType];
        if (entity) {
          const data = await entity.filter(query);
          setLoading(false);
          return data;
        }
      }
      
      // Offline - filter from cache
      const cached = getOfflineData(cacheKey);
      const allData = cached?.data || [];
      const filtered = allData.filter(item => {
        return Object.entries(query).every(([key, value]) => item[key] === value);
      });

      // 
      setLoading(false);
      return filtered;
    } catch (error) {
      console.error('Filter error:', error);
      setLoading(false);
      return [];
    }
  }, [entityType, cacheKey]);

  // Create data - langsung ke server jika online, simpan lokal + queue jika offline
  const create = useCallback(async (data) => {
    const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newItem = {
      ...data,
      id: localId,
      created_date: new Date().toISOString(),
      sync_status: 'pending'
    };

    if (isOnline()) {
      try {
        const entity = base44.entities[entityType];
        if (entity) {
          const created = await entity.create(data);
          // Update cache
          const cached = getOfflineData(cacheKey);
          const currentData = cached?.data || [];
          cacheServerData(entityType, [...currentData, created]);
          return created;
        }
      } catch (error) {
        console.error('Create error, saving offline:', error);
        // Fall through to offline save
      }
    }

    // Save locally
    const cached = getOfflineData(cacheKey);
    const currentData = cached?.data || [];
    cacheServerData(entityType, [...currentData, newItem]);

    // Add to sync queue
    addToPendingSync({
      operation: 'create',
      entityType,
      data,
      localId
    });

    toast.info("Data disimpan offline, akan disinkronkan saat online");
    return newItem;
  }, [entityType, cacheKey]);

  // Update data
  const update = useCallback(async (id, data) => {
    if (isOnline() && !id.startsWith('local_')) {
      try {
        const entity = base44.entities[entityType];
        if (entity) {
          const updated = await entity.update(id, data);
          // Update cache
          const cached = getOfflineData(cacheKey);
          const currentData = cached?.data || [];
          const updatedData = currentData.map(item => 
            item.id === id ? { ...item, ...updated } : item
          );
          cacheServerData(entityType, updatedData);
          return updated;
        }
      } catch (error) {
        console.error('Update error, saving offline:', error);
      }
    }

    // Update locally
    const cached = getOfflineData(cacheKey);
    const currentData = cached?.data || [];
    const updatedData = currentData.map(item => 
      item.id === id ? { ...item, ...data, sync_status: 'pending' } : item
    );
    cacheServerData(entityType, updatedData);

    // Add to sync queue if not local ID
    if (!id.startsWith('local_')) {
      addToPendingSync({
        operation: 'update',
        entityType,
        entityId: id,
        data
      });
    }

    toast.info("Perubahan disimpan offline");
    return { id, ...data };
  }, [entityType, cacheKey]);

  // Delete data
  const remove = useCallback(async (id) => {
    if (isOnline() && !id.startsWith('local_')) {
      try {
        const entity = base44.entities[entityType];
        if (entity) {
          await entity.delete(id);
          // Update cache
          const cached = getOfflineData(cacheKey);
          const currentData = cached?.data || [];
          const filtered = currentData.filter(item => item.id !== id);
          cacheServerData(entityType, filtered);
          return true;
        }
      } catch (error) {
        console.error('Delete error, saving offline:', error);
      }
    }

    // Delete locally
    const cached = getOfflineData(cacheKey);
    const currentData = cached?.data || [];
    const filtered = currentData.filter(item => item.id !== id);
    cacheServerData(entityType, filtered);

    // Add to sync queue if not local ID
    if (!id.startsWith('local_')) {
      addToPendingSync({
        operation: 'delete',
        entityType,
        entityId: id
      });
    }

    toast.info("Data dihapus offline");
    return true;
  }, [entityType, cacheKey]);

  return {
    list,
    filter,
    create,
    update,
    remove,
    loading
  };
}