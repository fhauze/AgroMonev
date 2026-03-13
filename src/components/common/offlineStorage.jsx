import { initDB, persistDB } from '../../utils/sqlClient';
import { db } from '../../utils/db';
import { toArray } from 'lodash';
import axios from 'axios';
import { useAuth } from '@/lib/AuthContext';

export const isOnline = () => navigator.onLine;

const agroApi = axios.create({
  baseURL: 'https://agro.pkc-dev.org/api',
  headers: { 'Content-Type': 'application/json' }
});

export const OfflineService = {
  
  hasPendingData: async () => {
    const tables = ['farmers', 'lands', 'plants', 'harvest', 'plant_inspections', 'offtakers', 'validators'];
    for (const table of tables) {
      const count = await db[table].where('sync_status').equals('pending').count();
      if (count > 0) return true;
    }
    return false;
  },

  saveEntityLocally: async (entityType,data) => {
    const table = entityType.toLowerCase().endsWith('s') ? entityType.toLowerCase() : `${entityType.toLowerCase()}s`;
    const id = data.id || `off_${Date.now()}`;
    
    const record = {
      ...data,
      id,
      sync_status: 'pending',
      created_at: new Date().toISOString()
    };

    try {
      // update first
      await db[table].put(record);

      // gonna insert
      await db.pending_sync.add({
        id: `q_${Date.now()}`,
        entity_type: entityType,
        operation: 'CREATE',
        payload: record,
        created_at: new Date().toISOString()
      });

      console.log(`✅ Dexie: Data ${entityType} tersimpan aman!`);
      return id;
    } catch (err) {
      console.error("❌ Dexie Error:", err);
      throw err;
    }
  },

  getEntities: async (entityType, filter = {}) => {
    const user = localStorage.getItem('user_data')
    console.log("Data user :", user)
    try {
      if (!entityType) return [];
      const table = entityType.toLowerCase().endsWith('s') 
        ? entityType.toLowerCase() 
        : `${entityType.toLowerCase()}s`;

      const dbTable = db[table];
      if (!dbTable) {
        console.error(`Tabel ${table} tidak ditemukan di Dexie`);
        return [];
      }

      const invalidData = async () => { 
        if(table != 'farmers') return;
        return await dbTable.filter(
          item => !item.nik || item.nik === ''
        ).toArray();
      }

      if(invalidData.length > 0){
        const idsToDelete = invalidData.map(d => d.id);
        await dbTable.bulkDelete(idsToDelete);
        console.log(`🧹 Cleanup: Menghapus ${invalidData.length} data tanpa NIK dari ${table}`);
      }
      
      if (filter && typeof filter === 'object' && Object.keys(filter).length > 0) {
        console.log(`🔍 Fetching ${table} with filter:`, filter);
        return await dbTable.where(filter).toArray();
      }
      
      console.log(`🔍 Fetching all from ${table}`);
      return await dbTable.reverse().toArray();

    } catch (e) {
      console.error("❌ Gagal ambil data dari Dexie:", e);
      return [];
    }
  },
  getPendingCount: async () => {
    try {
      const counts = await Promise.all([
        db.farmers.where('sync_status').equals('pending').count(),
        db.lands.where('sync_status').equals('pending').count(),
        db.plants.where('sync_status').equals('pending').count(),
        db.harvest.where('sync_status').equals('pending').count(),
        db.plant_inspections.where('sync_status').equals('pending').count(),
        db.offtakers.where('sync_status').equals('pending').count(),
        // db.validators.where('sync_status').equals('pending').count(),
      ]);
      
      return counts.reduce((a, b) => a + b, 0);
    } catch (e) {
      console.error("Gagal hitung antrean:", e);
      return 0;
    }
  },
  deleteEntityLocally: async (entityType, id) => {
    const table = entityType.toLowerCase().endsWith('s') 
      ? entityType.toLowerCase() 
      : `${entityType.toLowerCase()}s`;

    try {
      await db[table].delete(id);
      await db.pending_sync.add({
        id: `q_${Date.now()}`,
        entity_type: entityType,
        operation: 'DELETE',
        payload: { id },
        created_at: new Date().toISOString()
      });

      console.log(`🗑️ Dexie: Data ${entityType} dengan ID ${id} berhasil dihapus lokal!`);
      return true;
    } catch (err) {
      console.error("❌ Dexie Delete Error:", err);
      throw err;
    }
  },
  syncAll: async () => {
    const queue = await db.pending_sync.toArray();
    for (const item of queue) {
      try {
        const endpoint = `/${item.entity_type.toLowerCase()}s`;
        // Kirim langsung via Axios, bypass SDK Base44
        const response = await agroApi.post(endpoint, item.payload);
        
        if (response.status === 200 || response.status === 201) {
          await db.pending_sync.delete(item.id);
          // update local status...
        }
      } catch (err) {
        console.error("Detail Error:", err.response?.data || err.message);
      }
    }
  },
  downloadFromServer: async () => {
    const token = localStorage.getItem('access_token');
    const baseURL = import.meta.env.VITE_BASE44_API_URL.replace(/\/+$/, "");
    const syncConfigs = [
      { endpoint: 'auth/profile', table: db.farmers },
      { endpoint: 'map/lahan', table: db.lands },
      { endpoint: 'map/tanaman', table: db.plants },
      { endpoint: 'map/panen', table: db.harvest},
      { endpoint: 'map/inspeksi', table: db.plant_inspections},
      { endpoint: 'map/offtaker', table: db.offtakers},
      { endpoint: 'distribusi/panen', table: db.distributions},
      // { endpoint: 'map/validator', table: db.validators}

    ];

    try {
      console.log("📥 Mendownload data terbaru dari server...");
      for(const config of syncConfigs){
        const respond = await axios.get(`${baseURL}/api/${config.endpoint}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const respondData = Array.isArray(respond.data) ? respond.data : respond.data.data || [];
        if(respondData.length > 0){
          const localIds = await config.table.toCollection().primaryKeys();
          const newData = respondData.filter(item => !localIds.includes(item.id));
          if(newData.length > 0){
            await config.table.bulkAdd(newData.map(item => ({
              ...item,
              sync_status: 'synced'
            })));
          }else {
            console.log(`✅ Data ${config.endpoint} sudah mutakhir (tidak ada data baru).`);
          }
        }
      }
      
      console.log("Data lokal berhasil diperbarui.");
    } catch (err) {
      console.error("Gagal download data:", err);
    }
  },
  syncAllPending: async () => {
    const tables = [
      { from: db.farmers, to:"profile", endpoint: 'auth/profile' },
      { from: db.lands, to:"lahan", endpoint: 'map/lahan' },
      { from: db.plants, to:"tanaman", endpoint: 'map/tanaman' },
      { endpoint: 'map/panen', to:"panen", from: db.harvest},
      { endpoint: 'map/inspeksi', to:"inspeksi", from: db.plant_inspections},
      { endpoint: 'map/offtaker', to:"offtaker", from: db.offtakers},
      { endpoint: 'distribusi/panen', to:"panen", from: db.distributions},
      // { endpoint: 'map/validator', to:"validator", from: db.validators}
    ];

    const token = localStorage.getItem('access_token');
    const baseURL = import.meta.env.VITE_BASE44_API_URL.replace(/\/+$/, "");

    let hasChanged = false;

    for (const item of tables) {
      const items = await item.from.where('sync_status').equals('pending').toArray();
      for (const record of items) {
        try {
          const { sync_status, ...dataToPush } = record;
          
          if (dataToPush.luas_lahan) {
            dataToPush.luas_lahan = parseFloat(parseFloat(dataToPush.luas_lahan).toFixed(2));
          }

          const response = await axios.post(`${baseURL}/api/${item.endpoint}`, dataToPush, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.status === 200 || response.status === 201) {
            await item.table.delete(record.id);
            console.log(`Synced & Deleted Local ID: ${record.id}`);
            hasChanged = true;
          }
        } catch (e) {
          if(e.response ){
            console.error(`Detail Error Backend (${item.endpoint}):`, e.response.data);
            console.error(`Gagal sync: ${e.response.data.message || 'Server Error'}`);
          }
          console.error(`Gagal sync ${record.id}:`, e.message);
        }
      }
    }
    if (hasChanged) {
      console.log("🔄 Memicu download data terbaru agar Dexie sinkron dengan Server...");
      await OfflineService.downloadFromServer();
    }
  },
  cacheMasterData: async (villages) => {
    if (villages.length > 0) {
      await db.master_villages.clear();
      await db.master_villages.bulkAdd(villages);
    }
}
};