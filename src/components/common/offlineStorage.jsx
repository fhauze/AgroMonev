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
    const tables = ['farmers', 'lands', 'plants', 'harvests', 'plant_inspections', 'offtakers', 'validators', 'distributions','profiles'];
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
      await db[table].put(record);
      await db.pending_sync.add({
        id: `q_${Date.now()}`,
        entity_type: entityType,
        operation: 'CREATE',
        payload: record,
        created_at: new Date().toISOString()
      });
      return id;
    } catch (err) {
      console.error("Error:", err);
      throw err;
    }
  },

  getEntities: async (entityType, filter = {}) => {
    const user = localStorage.getItem('user_data')
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
      }
      
      if (filter && typeof filter === 'object' && Object.keys(filter).length > 0) {
        return await dbTable.where(filter).toArray();
      }
      return await dbTable.reverse().toArray();

    } catch (e) {
      console.error("Errof fetching data from Dexie:", e);
      return [];
    }
  },
  getPendingCount: async () => {
    try {
      const counts = await Promise.all([
        db.farmers.where('sync_status').equals('pending').count(),
        db.lands.where('sync_status').equals('pending').count(),
        db.plants.where('sync_status').equals('pending').count(),
        db.harvests.where('sync_status').equals('pending').count(),
        db.plant_inspections.where('sync_status').equals('pending').count(),
        db.offtakers.where('sync_status').equals('pending').count(),
        db.profiles.where('sync_status').equals('pending').count(),
        db.distributions.where('sync_status').equals('pending').count(),
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

      return true;
    } catch (err) {
      console.error(" Dexie Delete Error:", err);
      throw err;
    }
  },
  syncDataFromServer : async () => {
    const token = localStorage.getItem('access_token');
    const baseURL = import.meta.env.VITE_BASE44_API_URL.replace(/\/+$/, "");
    const syncConfigs = [
      { from: db.farmers, to:"profile", endpoint: 'auth/profile/1' },
      { from: db.lands, to:"lahan", endpoint: 'map/lahan' },
      { from: db.plants, to:"tanaman", endpoint: 'map/tanaman' },
      { from: db.harvests, to:"panen", endpoint: 'map/panen'},
      { from: db.plant_inspections, to:"inspeksi", endpoint: 'map/inspeksi'},
      { from: db.offtakers, to:"offtaker", endpoint: 'map/offtaker'},
      { from: db.distributions, to:"panen", endpoint: 'distribusi/panen'},
      { from: db.villages, to: "desa-kelurahan", endpoint: "master/desa-kelurahan" },
      { from: db.districts, to: "kecamatan", endpoint: "master/kecamatan"},
      { from: db.regencies, to: "kabupaten-kota", endpoint: "master/kabupaten-kota"},
      { from: db.provinces, to: "provinsi", endpoint: "master/provinsi"},
    ];

    for (const config of syncConfigs) {
      try {
        console.log(`Syncing table: ${config.from.name}...`);
        
        const response = await axios.get(`${baseURL}/api/${config.endpoint}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(response, "Res")
        if (response.status !== 200) throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response;
        const dataToSave = config.to ? result[config.to] : (result.data || result.data.data || []);

        if (Array.isArray(dataToSave)) {
          await config.table.bulkPut(dataToSave);
          console.log(`Berhasil sinkron ${dataToSave.length} data ke ${config.table.name}`);
        } else if (typeof dataToSave === 'object' && dataToSave !== null) {
          await config.table.put(dataToSave);
        }

      } catch (error) {
        console.error(`Gagal sinkronisasi ${config.endpoint}:`, error);
        // Lanjut ke config berikutnya meski satu error
        continue; 
      }
    }
  },
  syncAll: async () => {
    const queue = await db.pending_sync.toArray();
    for (const item of queue) {
      try {
        const endpoint = `/${item.entity_type.toLowerCase()}s`;
        const response = await agroApi.post(endpoint, item.payload);
        
        if (response.status === 200 || response.status === 201) {
          await db.pending_sync.delete(item.id);
        }
      } catch (err) {
        console.error("Detail Error:", err.response?.data || err.message);
      }
    }
  },
  downloadFromServer: async (user) => {

    const token = localStorage.getItem('access_token');
    const baseURL = import.meta.env.VITE_BASE44_API_URL.replace(/\/+$/, "");
    console.log(user, "Userr")
    const syncConfigs = [
      { endpoint: `auth/profile/1`, table: db.farmers }, 
      // { endpoint: `auth/me`, table: db.users }, 
      { endpoint: 'map/lahan', table: db.lands },
      { endpoint: 'map/tanaman', table: db.plants },
      { endpoint: 'map/panen', table: db.harvests},
      { endpoint: 'map/inspeksi', table: db.plant_inspections},
      { endpoint: 'map/offtaker', table: db.offtakers},
      { endpoint: 'distribusi/panen', table: db.distributions},
      // { endpoint: 'map/validator', table: db.validators}
      { endpoint: "master/desa-kelurahan", table: db.villages, to: "desa-kelurahan"},
      { endpoint: "master/kecamatan", table: db.districts, to: "kecamatan"},
      { endpoint: "master/kabupaten-kota", table: db.regencies, to: "kabupaten-kota"},
      { endpoint: "master/provinsi", table: db.provinces, to: "provinsi"},

    ];

    try {
      for(const config of syncConfigs){
        const respond = await axios.get(`${baseURL}/api/${config.endpoint}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const rawData = respond.data?.data || respond.data;
        console.log(rawData, "Raw Data")
        let respondData = [];

        // const respondData = (config.endpoint.includes('auth/profile') || config.endpoint.includes('auth/me')) 
        //   ? [rawData] 
        //   : Array.isArray(rawData) ? rawData : [];

        if (config.endpoint.includes('auth/profile') || config.endpoint.includes('auth/me')) {
          if (rawData && typeof rawData === 'object') {
            const { password, ...cleanData } = rawData; 
            respondData = [cleanData]
          }
        } else {
          // Jika data memang seharusnya array (List)
          respondData = Array.isArray(rawData) ? rawData : [];
        }

        console.log(respondData,"  || data  " ,config.table)
        if(respondData.length > 0 && respondData[0] !== null){
          const preparedData = respondData.map(item => ({
            ...item,
            id: item.id, 
            sync_status: 'synced'
          })).filter(item => item.id !== undefined);

          if (preparedData.length > 0) {
            await config.table.bulkPut(preparedData);
            console.log(`✅ Berhasil sync ${preparedData.length} data ke ${config.table.name}`);
          }
        }
      }

    } catch (err) {
      console.error("Gagal download data:", err);
      if (err.failures) {
        console.error("Detail kegagalan Dexie:", err.failures);
      }
    }
  },
  syncAllPending: async () => {
    const tables = [
      { from: db.farmers, to:"profile", endpoint: 'auth/profile/1' },
      { from: db.lands, to:"lahan", endpoint: 'map/lahan' },
      { from: db.plants, to:"tanaman", endpoint: 'map/tanaman' },
      { from: db.harvests, to:"panen", endpoint: 'map/panen'},
      { from: db.plant_inspections, to:"inspeksi", endpoint: 'map/inspeksi'},
      { from: db.offtakers, to:"offtaker", endpoint: 'map/offtaker'},
      { from: db.distributions, to:"panen", endpoint: 'distribusi/panen'},
      // { endpoint: 'map/validator', to:"validator", from: db.validators}
      { from: db.villages, to: "desa-kelurahan", endpoint: "master/desa-kelurahan" },
      { from: db.districts, to: "kecamatan", endpoint: "master/kecamatan"},
      { from: db.regencies, to: "kabupaten-kota", endpoint: "master/kabupaten-kota"},
      { from: db.provinces, to: "provinsi", endpoint: "master/provinsi"},
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