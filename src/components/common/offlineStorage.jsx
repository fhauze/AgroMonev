import { initDB, persistDB } from '../../utils/sqlClient';
import { db } from '../../utils/db';

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
      // Simpan objek JSON langsung ke IndexedDB
      await db[table].put(record);
      // Tambahkan ke antrean sinkronisasi
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

  getEntities: async (entityType, filter = {}) => { // Tambahkan default value {}
    try {
      // 1. Validasi Nama Tabel
      if (!entityType) return [];
      const table = entityType.toLowerCase().endsWith('s') 
        ? entityType.toLowerCase() 
        : `${entityType.toLowerCase()}s`;

      const dbTable = db[table];
      if (!dbTable) {
        console.error(`Tabel ${table} tidak ditemukan di Dexie`);
        return [];
      }

      // 2. Cek apakah ada filter yang valid
      // Pastikan filter bukan null/undefined dan punya isi
      if (filter && typeof filter === 'object' && Object.keys(filter).length > 0) {
        console.log(`🔍 Fetching ${table} with filter:`, filter);
        return await dbTable.where(filter).toArray();
      }

      // 3. Jika tidak ada filter, ambil semua (Urutkan terbaru)
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
  }
};