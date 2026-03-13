import Dexie from 'dexie';

// Inisialisasi Database
export const db = new Dexie('PertanianDB');

// Definisi tabel (Hanya tentukan Primary Key 'id', kolom lain bebas/otomatis)
db.version(1).stores({
  farmers: 'id, nik,email,nama,name, sync_status', 
  lands:'id, province,regency,district,village,farmer_id, sync_status',
  plants: 'id,land_id, farmer_id, sync_status, name, nama',
  validators:'id, sync_status, name, nama',
  offtakers:'id, sync_status, name, nama',
  pending_sync: 'id, entity_type, sync_status',
  users:'id,email,village_id, sync_status, name, nama',
  profile: 'id,user_id, kk,ktp,email, sync_status, name, nama',
  harvest: 'id, plant_id, land_id,farmer_id, sync_status',
  plant_inspections: 'id, plant_id, land_id, farmer_id, sync_status',
  master_villages: 'id, district_id, name',
  distributions: 'id, farmer_id,offtaker_id, sync_status'
});