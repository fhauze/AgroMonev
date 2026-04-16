import {initDB} from '../../utils/sqliteClient';

const STORAGE_KEYS = {
  FARMERS: 'offline_farmers',
  LANDS: 'offline_lands',
  PLANTS: 'offline_plants',
  PENDING_SYNC: 'pending_sync_queue',
  LAST_SYNC: 'last_sync_timestamp'
};

// Check online status
export const isOnline = () => navigator.onLine;

// Get stored data
export const getOfflineData = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading offline data:', e);
    return [];
  }
};

// Save data to local storage
export const saveOfflineData = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Error saving offline data:', e);
    return false;
  }
};

// Add item to pending sync queue
export const addToPendingSync = (action) => {
  const queue = getOfflineData(STORAGE_KEYS.PENDING_SYNC);
  const newAction = {
    ...action,
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    retryCount: 0
  };
  queue.push(newAction);
  saveOfflineData(STORAGE_KEYS.PENDING_SYNC, queue);
  return newAction;
};


// Remove item from pending sync queue
export const removeFromPendingSync = (actionId) => {
  const queue = getOfflineData(STORAGE_KEYS.PENDING_SYNC);
  const filtered = queue.filter(item => item.id !== actionId);
  saveOfflineData(STORAGE_KEYS.PENDING_SYNC, filtered);
};

// Get pending sync count
export const getPendingSyncCount = () => {
  return getOfflineData(STORAGE_KEYS.PENDING_SYNC).length;
};


// Cache server data locally
export const cacheServerData = (entityType, data) => {
  const key = `cache_${entityType}`;
  saveOfflineData(key, {
    data,
    cachedAt: new Date().toISOString()
  });
};

// Get cached server data
export const getCachedData = (entityType) => {
  const key = `cache_${entityType}`;
  const cached = getOfflineData(key);
  return cached?.data || [];
};

// Update last sync timestamp
export const updateLastSync = () => {
  localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
};

// Get last sync timestamp
export const getLastSync = () => {
  return localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
};

/* export async function addToPendingSync(action) {
  const db = await initDB();

  const id = `${Date.now()}_${Math.random()}`;
  db.exec({
    sql: `
      INSERT INTO pending_sync
      (id, entity_type, operation, entity_id, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
    bind: [
      id,
      action.entityType,
      action.operation,
      action.entityId || null,
      JSON.stringify(action.data),
      new Date().toISOString()
    ]
  });

  return id;
} */

/* export async function getPendingQueue() {
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
} */
export async function removePending(id) {
  const db = await initDB();
  db.exec(`DELETE FROM pending_sync WHERE id = ?`, [id]);
}

export { STORAGE_KEYS };