import { loadFarmers, saveFarmers } from './localStore';
import { isOnline } from './networkService';

const API_URL = 'https://app.base44.com/api/apps/XXX/entities/Farmer';
const API_KEY = 'XXXX';

export async function syncFarmersToServer() {
  if (!isOnline()) return;

  const farmers = loadFarmers();
  const pendingFarmers = farmers.filter(f => f.sync_status !== 'synced');

  for (const farmer of pendingFarmers) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api_key': API_KEY
        },
        body: JSON.stringify(farmer)
      });

      if (!response.ok) throw new Error('Sync failed');

      farmer.sync_status = 'synced';
      farmer.last_synced_at = new Date().toISOString();

    } catch (err) {
      farmer.sync_status = 'failed';
      console.error('Sync error:', err);
    }
  }

  saveFarmers(farmers);
}
