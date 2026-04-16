import sqlite3InitModule from "@sqlite.org/sqlite-wasm";

let db;

export async function initDB() {
  if (db) return db;

  const sqlite3 = await sqlite3InitModule();
  const oo = sqlite3.oo1;

  db = new oo.DB("offline.db", "c");

  db.exec(`
    CREATE TABLE IF NOT EXISTS pending_sync (
      id TEXT PRIMARY KEY,
      entity_type TEXT,
      operation TEXT,
      entity_id TEXT,
      payload TEXT,
      retry_count INTEGER DEFAULT 0,
      created_at TEXT
    );
  `);

  return db;
}
