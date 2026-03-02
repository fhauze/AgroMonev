import { initDB, persistDB } from '../../utils/sqlClient';
import { db } from '../../utils/db';
import { toArray } from 'lodash';

export const isOnline = () => navigator.onLine;

export const OfflineService = {
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

      const invalidData = await dbTable.filter(
          item => !item.nik || item.nik === ''
        ).toArray();

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
      // Menghitung jumlah baris di tabel pending_sync
      return await db.pending_sync.count();
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
      // 1. Hapus dari tabel utama di Dexie (Local)
      await db[table].delete(id);

      // 2. Tambahkan ke antrean sinkronisasi dengan operasi 'DELETE'
      await db.pending_sync.add({
        id: `q_${Date.now()}`,
        entity_type: entityType,
        operation: 'DELETE',
        payload: { id }, // Kirim ID saja untuk dihapus di server nanti
        created_at: new Date().toISOString()
      });

      console.log(`🗑️ Dexie: Data ${entityType} dengan ID ${id} berhasil dihapus lokal!`);
      return true;
    } catch (err) {
      console.error("❌ Dexie Delete Error:", err);
      throw err;
    }
  }
};