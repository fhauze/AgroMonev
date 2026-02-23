import { initDB } from "../../utils/sqliteClient";

/* =====================================================
   KONFIG & UTIL
===================================================== */

export const STORAGE_KEYS = {
  FARMERS: "offline_farmers",
  LANDS: "offline_lands",
  PLANTS: "offline_plants",
  PENDING_SYNC: "pending_sync_queue",
  LAST_SYNC: "last_sync_timestamp"
};

// Check online status
export const isOnline = () => navigator.onLine;

/* =====================================================
   ❌ VERSI LAMA (localStorage) — TIDAK DIPAKAI LAGI
   (DI-COMMENT SESUAI PERMINTAAN)
===================================================== */

/*
export const getOfflineData = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Error reading offline data:", e);
    return [];
  }
};

export const saveOfflineData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Error saving offline data:", e);
    return false;
  }
};

export const cacheServerData = (entityType, data) => {
  const key = `cache_${entityType}`;
  saveOfflineData(key, {
    data,
    cachedAt: new Date().toISOString()
  });
};
*/

/* =====================================================
   ✅ VERSI BARU — SQLITE (WAJIB DIPAKAI)
===================================================== */

/* ---------- ENTITY ---------- */

// Ambil semua entity (pengganti getOfflineData)
export async function getEntities(entityType) {
  const db = await initDB();
  const rows = [];

  db.exec({
    sql: `SELECT payload FROM ${entityType}`,
    rowMode: "object",
    resultRows: rows
  });

  return rows.map(r => JSON.parse(r.payload));
}

export async function getData(tableName) {
  const db = await initDB();
  const rows = [];

  db.exec({
    sql: `SELECT * FROM ${tableName} ORDER BY created_at ASC`,
    rowMode: "object",
    resultRows: rows
  });

  return rows.map(r => ({
    ...r,
    payload: JSON.parse(r.payload)
  }));
}

// Insert / Update entity
export async function upsertEntity(entityType, data, syncStatus = "synced") {
  const db = await initDB();

  db.exec(
    `INSERT OR REPLACE INTO ${entityType}
     (id, payload, sync_status, updated_at)
     VALUES (?, ?, ?, ?)`,
    [
      data.id,
      JSON.stringify(data),
      syncStatus,
      new Date().toISOString()
    ]
  );
}

// Delete entity
export async function deleteEntity(entityType, id) {
  const db = await initDB();
  db.exec(`DELETE FROM ${entityType} WHERE id = ?`, [id]);
}

/* ---------- PENDING SYNC ---------- */

// ❌ VERSI LAMA (localStorage)
/*
export const addToPendingSync = (action) => {
  const queue = getOfflineData(STORAGE_KEYS.PENDING_SYNC);
  queue.push(action);
  saveOfflineData(STORAGE_KEYS.PENDING_SYNC, queue);
};
*/

// ✅ VERSI SQLITE
export async function addToPendingSync(action) {
  const db = await initDB();

  const id = `${Date.now()}_${Math.random()}`;

  db.exec(
    `INSERT INTO pending_sync
     (id, entity_type, operation, entity_id, payload, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      action.entityType,
      action.operation,
      action.entityId || null,
      JSON.stringify(action.data),
      new Date().toISOString()
    ]
  );

  return id;
}

// Ambil queue
export async function getPendingQueue() {
  const db = await initDB();
  const rows = [];

  db.exec({
    sql: `SELECT * FROM pending_sync ORDER BY created_at ASC`,
    rowMode: "object",
    resultRows: rows
  });

  return rows.map(r => ({
    ...r,
    payload: JSON.parse(r.payload)
  }));
}

// Hapus dari queue
export async function removePending(id) {
  const db = await initDB();
  db.exec(`DELETE FROM pending_sync WHERE id = ?`, [id]);
}

// Hitung pending
export async function getPendingSyncCount() {
  const db = await initDB();
  const rows = [];

  db.exec({
    sql: `SELECT COUNT(*) as count FROM pending_sync`,
    rowMode: "object",
    resultRows: rows
  });

  return rows[0]?.count || 0;
}

/* ---------- META ---------- */

// ❌ VERSI LAMA
/*
export const updateLastSync = () => {
  localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
};

export const getLastSync = () => {
  return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
};
*/

// ✅ SQLITE
export async function updateLastSync() {
  const db = await initDB();
  db.exec(
    `INSERT OR REPLACE INTO meta (key, value)
     VALUES ('last_sync', ?)`,
    [new Date().toISOString()]
  );
}

export async function getLastSync() {
  const db = await initDB();
  const rows = [];

  db.exec({
    sql: `SELECT value FROM meta WHERE key = 'last_sync'`,
    rowMode: "object",
    resultRows: rows
  });

  return rows[0]?.value || null;
}
