import Dexie from 'dexie';

// Inisialisasi Database
export const db = new Dexie('PertanianDB');

// Definisi tabel (Hanya tentukan Primary Key 'id', kolom lain bebas/otomatis)
db.version(1).stores({
  farmers: 'id, nik, sync_status', 
  lands:'id, province,regency,district,village,farmer_id',
  plants: 'id,land_id, farmer_id',
  validators:'id',
  offtakers:'id',
  pending_sync: 'id, entity_type'
});