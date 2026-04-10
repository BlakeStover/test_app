const pool = require('../config/db');

let _cache = null;
let _cacheTime = 0;
const TTL_MS = 60_000;

async function getSettings() {
  const now = Date.now();
  if (_cache && now - _cacheTime < TTL_MS) return _cache;
  const result = await pool.query('SELECT key, value FROM system_settings');
  _cache = Object.fromEntries(result.rows.map((r) => [r.key, r.value]));
  _cacheTime = now;
  return _cache;
}

function invalidateCache() {
  _cache = null;
  _cacheTime = 0;
}

module.exports = { getSettings, invalidateCache };
