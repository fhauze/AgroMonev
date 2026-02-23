import initSqlJs from "sql.js";

const DB_KEY = "pertanian_sqlite";
let dbPromise = null;


const SEED_FARMERS = [
  {
    id: "2d2e68a9-2e50-48e8-9adb-98f9274003cc",
    nik: "1234567891011",
    full_name: "fhauz",
    phone: "242342",
    farmer_group: "Kelompok Sejahtera",
    village: "Citatah",
    district: "Cipatat",
    regency: "Bandung Barat",
    province: "Jawa Barat",
    verification_status: "verified",
    sync_status: "pending",
    created_date: "2026-02-10T09:23:34.002Z",
    updated_date: "2026-02-12T04:13:30.018Z",
  },
  {
    id: "5a1da6a5-e089-4cf0-9a5b-83f63fd977b6",
    nik: "23123123131123",
    full_name: "Esporte",
    phone: "242342",
    farmer_group: "",
    village: "Kampoeng",
    district: "Kapuas Hulu",
    regency: "Kapuas",
    province: "Kalimantan Barat",
    verification_status: "pending",
    sync_status: "pending",
    created_date: "2026-02-16T05:01:45.468Z",
    updated_date: null,
  },
];

export async function initDB() {
  if (dbPromise) return dbPromise;
  if (!dbPromise) {
    // dbPromise = initSqlJs({
    //   locateFile: () => "/sql-wasm.wasm",
    // }).then(SQL => {
    //   const savedDb = localStorage.getItem(DB_KEY);

    //   let db;
    //   if (savedDb) {
    //     const binary = Uint8Array.from(atob(savedDb), c => c.charCodeAt(0));
    //     db = new SQL.Database(binary);
    //     console.log("✅ DB loaded from storage");
    //   } else {
    //     db = new SQL.Database();
    //     console.log("🆕 DB created");
    //   }
    dbPromise = (async () => {
      try {
        const SQL = await initSqlJs({
          locateFile: () => "/sql-wasm.wasm",
        });

        const savedDb = localStorage.getItem(DB_KEY);
        let db;

        if (savedDb) {
          try {
            const binary = Uint8Array.from(atob(savedDb), c => c.charCodeAt(0));
            db = new SQL.Database(binary);
            console.log("✅ DB loaded from storage");
          } catch (e) {
            console.error("❌ Gagal muat DB, membuat baru:", e);
            db = new SQL.Database();
          }
        } else {
          db = new SQL.Database();
          console.log("🆕 DB created");
        }

        db.run(`
          CREATE TABLE IF NOT EXISTS farmer (
            id TEXT PRIMARY KEY,
            nik TEXT,
            full_name TEXT NOT NULL,
            phone TEXT,
            farmer_group TEXT,
            village TEXT,
            district TEXT,
            regency TEXT,
            province TEXT,
            verification_status TEXT,
            sync_status TEXT,
            created_date TEXT,
            updated_date TEXT
          );
        `);

        // 🚨 WAJIB SELALU DIJALANKAN
        db.run(`
          CREATE TABLE IF NOT EXISTS land (
            id TEXT PRIMARY KEY,
            farmer_id TEXT,
            name TEXT,
            polygon_coordinates TEXT,
            center_lat REAL,
            center_lng REAL,
            area_hectares REAL,
            land_status TEXT,
            village TEXT,
            district TEXT,
            regency TEXT,
            validation_status TEXT DEFAULT 'pending',
            sync_status TEXT DEFAULT 'pending',
            created_at TEXT
          );
        `);

        /* =========================
          SEED FARMER (ONLY IF EMPTY)
        ========================= */
        const countRes = db.exec("SELECT COUNT(*) AS total FROM farmer");
        const farmerCount =
              countRes?.[0]?.values?.[0]?.[0] ?? 0;

        if (farmerCount === 0) {
          console.log("🌱 Seeding farmer data...");

          const stmt = db.prepare(`
            INSERT INTO farmer (
              id, nik, full_name, phone, farmer_group,
              village, district, regency, province,
              verification_status, sync_status,
              created_date, updated_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          for (const f of SEED_FARMERS) {
            stmt.run([
              f.id,
              f.nik,
              f.full_name,
              f.phone,
              f.farmer_group,
              f.village,
              f.district,
              f.regency,
              f.province,
              f.verification_status,
              f.sync_status,
              f.created_date,
              f.updated_date,
            ]);
          }

          stmt.free();
          persistDB(db);
          console.log("✅ Farmer seeded:", SEED_FARMERS.length);
        }

        return db;
      } catch (err) {
        dbPromise = null; // Reset jika gagal agar bisa dicoba lagi
        throw err;
      }
    })();
  }

  return dbPromise;
}

export function persistDB(db) {
  const binary = db.export();
  const base64 = btoa(String.fromCharCode(...binary));
  localStorage.setItem(DB_KEY, base64);
}