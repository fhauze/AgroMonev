/**
 * Mock API for Vite Dev Server
 * Offline-first, JSON storage, no Express
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// ===============================
// Path helpers (ESM-safe)
// ===============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===============================
// Local JSON storage
// ===============================
const DATA_DIR = path.join(__dirname, 'data');

// const files = {
//   Farmer: path.join(DATA_DIR, 'farmer.json'),
//   Land: path.join(DATA_DIR, 'land.json'),
//   Plant: path.join(DATA_DIR, 'plant.json'),
//   Validator: path.join(DATA_DIR, 'validator.json'),
//   Offtaker: path.join(DATA_DIR, 'offtaker.json'),
//   LandValidation: path.join(DATA_DIR, 'landValidation.json'),
// };

// console.log('[MOCK API] DATA_DIR =', DATA_DIR);
// console.log('[MOCK API] FILES =', files);

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// for (const file of Object.values(files)) {
//   if (!fs.existsSync(file)) fs.writeFileSync(file, '[]');
// }

// const read = (type) => {
//   try {
//     return JSON.parse(fs.readFileSync(files[type], 'utf-8'));
//   } catch {
//     return [];
//   }
// };

const read = (type) => {
  try {
    return JSON.parse(fs.readFileSync(getFilePath(type), 'utf-8'));
  } catch {
    return [];
  }
};

// const write = (type, data) =>
//   fs.writeFileSync(files[type], JSON.stringify(data, null, 2));

const write = (type, data) =>
  fs.writeFileSync(getFilePath(type), JSON.stringify(data, null, 2));

// ===============================
// Utils
// ===============================
const sendJSON = (res, data, status = 200) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
};

const getFilePath = (type) => {
  const file = path.join(DATA_DIR, `${type}.json`);

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, '[]');
  }

  return file;
};

const getBody = async (req) =>
  new Promise((resolve) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });

// ===============================
// Helpers
// ===============================
const stripQuery = (url) => url.split('?')[0];

// ===============================
// Vite middleware
// ===============================
export function mockApi(server) {
  server.middlewares.use(async (req, res, next) => {
    const url = stripQuery(req.url);
    const { method } = req;

    // ---------------------------
    // AUTH MOCK
    // ---------------------------
    if (method === 'GET' && url === '/api/apps/probindo.com/entities/User/me') {
      return sendJSON(res, {
        id: 'local-user',
        email: 'offline@local.dev',
        name: 'Offline User',
        mode: 'offline'
      });
    }

    if (
      method === 'POST' &&
      url === '/api/apps/probindo.com/analytics/track/batch'
    ) {
      return sendJSON(res, { status: 'ignored', mode: 'offline' });
    }

    // ---------------------------
    // Public settings
    // ---------------------------
    if (
      method === 'GET' &&
      url === '/api/apps/public/prod/public-settings/by-id/probindo.com'
    ) {
      return sendJSON(res, {
        app_id: 'probindo.com',
        environment: 'local',
        features: {
          offline: true,
          sync: true
        }
      });
    }

    // ---------------------------
    // GENERIC ENTITY LIST
    // ---------------------------
    // const entityMatch = url.match(
    //   /^\/api\/apps\/probindo\.com\/entities\/(Farmer|Land|Plant|Validator|Offtaker|LandValidation)$/
    // );
    const entityMatch = url.match(
      /^\/api\/apps\/probindo\.com\/entities\/([^\/]+)$/
    );
    
    if (method === 'GET' && entityMatch) {
      const type = entityMatch[1];
      return sendJSON(res, read(type));
    }

    // ---------------------------
    // CREATE ENTITY
    // ---------------------------
    if (method === 'POST' && entityMatch) {
      const type = entityMatch[1];
      const body = await getBody(req);
      const data = read(type);

      const item = {
        id: crypto.randomUUID(),
        ...body,
        created_date: new Date().toISOString(),
        sync_status: 'pending'
      };

      console.log("TYPE:", type);
      console.log("DATA RAW:", data);
      console.log("IS ARRAY?", Array.isArray(data));

      console.log("[POST]", type);
      console.log("BODY:", body);
      console.log("FILE CONTENT:", read(type));

      data.push(item);
      write(type, data);

      return sendJSON(res, item, 201);
    }

    // ---------------------------
    // UPDATE ENTITY
    // ---------------------------
    // const updateMatch = url.match(
    //   /^\/api\/apps\/probindo\.com\/entities\/(Farmer|Land|Plant|Validator|Offtaker|LandValidation)\/(.+)$/
    // );

    const updateMatch = url.match(
      /^\/api\/apps\/probindo\.com\/entities\/([^\/]+)\/([^\/]+)$/
    );

    if (method === 'PUT' && updateMatch) {
      const [, type, id] = updateMatch;
      const body = await getBody(req);
      const data = read(type);

      // const index = data.findIndex((i) => i.id === id);
      const index = data.findIndex(
        (i) => String(i.id) === String(id)
      );

      if (index === -1) {
        return sendJSON(res, { message: 'Not found' }, 404);
      }

      data[index] = {
        ...data[index],
        ...body,
        updated_date: new Date().toISOString(),
        sync_status: 'pending'
      };

      write(type, data);
      return sendJSON(res, data[index]);
    }

    // ---------------------------
    // SYNC (stub)
    // ---------------------------
    if (method === 'POST' && url.startsWith('/api/apps/probindo.com/sync')) {
      return sendJSON(res, { status: 'success', mode: 'offline' });
    }

    next();
  });
}
