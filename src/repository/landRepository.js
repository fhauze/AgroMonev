import { initDB, persistDB } from "@/utils/sqlClient";

export async function createLand(data) {
  const db = await initDB();

  console.log("🛠 DB Instance Check:", db);

  if (!db || typeof db.run !== 'function') {
    console.error("❌ Database instance tidak valid!");
    throw new Error("Database not initialized correctly");
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

   if (!data.farmer_id) {
    throw new Error("farmer_id is required");
  }
  if (!data.center_lat || !data.center_lng) {
    throw new Error("center coordinate is required");
  }

   console.log("📦 createLand data:", data);

  try {
    const query = `INSERT INTO land (
      id, farmer_id, name, polygon_coordinates,
      center_lat, center_lng, area_hectares,
      land_status, village, district, regency,
      validation_status, sync_status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    // Masukkan data ke dalam ARRAY sesuai urutan kolom di atas
    const values = [
      id,                                         // id
      data.farmer_id,                             // farmer_id
      data.name,                                   // name
      JSON.stringify(data.polygon_coordinates),   // polygon_coordinates
      data.center_lat,                            // center_lat
      data.center_lng,                            // center_lng
      data.area_hectares,                         // area_hectares
      data.land_status,                           // land_status
      data.village,                               // village
      data.district,                              // district
      data.regency,                               // regency
      data.validation_status || 'pending',        // validation_status
      data.sync_status || 'pending',              // sync_status
      now                                         // created_at
    ];
    console.log("📦 createLand values:", values);

    console.log("📡 Menjalankan query dengan nilai:", values);

    db.run(query, values);
    persistDB(db);

    console.log("✅ Land inserted:", id);

    return { id };

  } catch (err) {
    console.error("❌ INSERT GAGAL", err);
    throw err;
  }
}
// export async function getAllLand(farmerId) {
//   const db = await initDB();
//   console.log("🔍 Database instance:", db);
  
//   try {
//     // 1. Cek dulu total row di tabel tanpa filter
//     const countRes = db.exec("SELECT COUNT(*) FROM land");
//     console.log("📊 Total baris di tabel land:", countRes[0]?.values[0][0]);

//     // 2. Query dengan filter farmer_id
//     const res = db.exec(`SELECT * FROM land WHERE farmer_id = '${farmerId}'`);
    
//     if (!res || res.length === 0) {
//       console.warn("⚠️ Query berhasil tapi hasil kosong untuk farmer:", farmerId);
//       return [];
//     }

//     const { columns, values } = res[0];
//     return values.map(row => Object.fromEntries(columns.map((col, i) => [col, row[i]])));
    
//   } catch (err) {
//     console.error("❌ Gagal Query:", err);
//     return [];
//   }
// }

export async function getAllLand(farmerId) {
  const db = await initDB();
  
  try {
    // 1. Audit: Lihat SEMUA data di tabel tanpa filter apapun
    // const rawCheck = db.exec("SELECT * FROM land");
    // console.log("🕵️ Isi Seluruh Tabel Land:", rawCheck[0]?.values || "KOSONG MELOMPONG");

    const rawCheck = db.exec("SELECT id, name, farmer_id FROM land");
      if (rawCheck[0]) {
        console.table(rawCheck[0].values.map(v => ({ 
          id: v[0], 
          name: v[1], 
          farmer_id_in_db: v[2] 
        })));
      }
      console.log("Mencari farmerId:", farmerId);
    // 2. Jika kita ingin filter berdasarkan farmerId
    let query = "SELECT * FROM land";
    if (farmerId) {
      query += ` WHERE farmer_id = '${farmerId}'`;
    }
    
    const res = db.exec(query);
    
    if (!res || res.length === 0 || !res[0].values) {
      console.log(`ℹ️ Tidak ada lahan untuk farmerId: ${farmerId}`);
      return [];
    }

    const { columns, values } = res[0];
    return values.map(row => Object.fromEntries(columns.map((col, i) => [col, row[i]])));
    
  } catch (err) {
    console.error("❌ SQL Error:", err.message);
    return [];
  }
}