import initSqlJs from "sql.js";

let isInitializing = false;
let dbInstance = null;

const DB_KEY = "pertanian_sqlite";
let dbPromise = null;

export async function initDB() {
  if (dbInstance) return dbInstance;
  if (dbPromise) return dbPromise;

  if (isInitializing) {
    await new Promise(resolve => setTimeout(resolve, 100));
    return initDB();
  }

  isInitializing = true;

  dbPromise = (async () => {
    try {
      const SQL = await initSqlJs({
        locateFile: () => "/sql-wasm.wasm",
      });

      const savedDb = localStorage.getItem(DB_KEY);
      let db;

      // if (savedDb) {
      //   const binary = Uint8Array.from(atob(savedDb), c => c.charCodeAt(0));
      //   db = new SQL.Database(binary);
      //   console.log("✅ DB loaded from storage");
      // } else {
      //   db = new SQL.Database();
      //   console.log("🆕 DB created");
      // }

      if (savedDb) {
        const binary = Uint8Array.from(atob(savedDb), c => c.charCodeAt(0));
        dbInstance = new SQL.Database(binary);
        console.log("✅ DB loaded from storage");
        
        // --- TAMBAHKAN INI UNTUK RESET ---
        dbInstance.run("DROP TABLE IF EXISTS farmer;"); 
        console.log("⚠️ Tabel Farmer lama dihapus untuk sinkronisasi skema");
        // ---------------------------------
        
      } else {
        dbInstance = new SQL.Database();
        console.log("🆕 DB created");
      }

      // Buat Tabel Farmer
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS farmer (
          id TEXT PRIMARY KEY,
          nik TEXT,
          full_name TEXT NOT NULL,
          phone TEXT,
          farmer_group TEXT, -- Tambahkan kolom ini
          village TEXT,
          district TEXT,
          regency TEXT,
          province TEXT,
          verification_status TEXT,
          sync_status TEXT DEFAULT 'pending',
          created_date TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_date TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      const columnsInfo = dbInstance.exec("PRAGMA table_info(farmer);");
      console.log("🔍 KOLOM YANG TERDETEKSI DI SQLITE:", JSON.stringify(columnsInfo[0].values.map(v => v[1])));

      // Buat Tabel Land
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS land (
          id TEXT PRIMARY KEY,
          farmer_id TEXT,
          name TEXT,
          area_hectares REAL,
          validation_status TEXT DEFAULT 'pending',
          sync_status TEXT DEFAULT 'synced'
        );
      `);

      // Tabel Antrean Sinkronisasi
      dbInstance.run(`
        CREATE TABLE IF NOT EXISTS pending_sync (
          id TEXT PRIMARY KEY,
          entity_type TEXT,
          operation TEXT,
          payload TEXT,
          created_at TEXT
        );
      `);

      return dbInstance;
    } catch (err) {
      dbPromise = null;
      throw err;
    }finally {
      isInitializing = false;
    }
  })();

  return dbPromise;
}

export function persistDB(db) {
  const binary = db.export();
  const base64 = btoa(String.fromCharCode(...binary));
  localStorage.setItem(DB_KEY, base64);
}