/**
 * Caché offline para AmorList
 * Guarda datos de la biblioteca en localStorage para carga instantánea
 * y funcionamiento sin conexión.
 */

const CACHE_PREFIX = 'amorlist_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 horas

/** Guarda datos en localStorage con timestamp */
export function setCache(key, data) {
  try {
    const entry = {
      data,
      timestamp: Date.now(),
      version: 1,
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    return true;
  } catch (e) {
    // Si localStorage está lleno, limpiar cachés viejos
    if (e.name === 'QuotaExceededError') {
      clearExpired();
      try {
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, timestamp: Date.now(), version: 1 }));
        return true;
      } catch (e2) {
        console.warn('⚠️ Cache: no hay espacio incluso después de limpiar');
        return false;
      }
    }
    console.warn('⚠️ Cache: error guardando', key, e.message);
    return false;
  }
}

/** Lee datos de localStorage */
export function getCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    return entry.data;
  } catch (e) {
    return null;
  }
}

/** Obtiene timestamp del caché */
export function getCacheTimestamp(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    return entry.timestamp || null;
  } catch (e) {
    return null;
  }
}

/** Verifica si el caché está expirado */
export function isCacheExpired(key, maxAge = CACHE_EXPIRY) {
  const ts = getCacheTimestamp(key);
  if (!ts) return true;
  return Date.now() - ts > maxAge;
}

/** Limpia cachés viejos (más de 7 días) */
function clearExpired() {
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX)) {
      try {
        const entry = JSON.parse(localStorage.getItem(key));
        if (now - entry.timestamp > SEVEN_DAYS) {
          localStorage.removeItem(key);
        }
      } catch (e) {
        // Si no se puede parsear, eliminar
        localStorage.removeItem(key);
      }
    }
  }
}

/** Elimina un caché específico */
export function removeCache(key) {
  localStorage.removeItem(CACHE_PREFIX + key);
}

/** Obtiene información del estado del caché */
export function getCacheInfo(key) {
  const ts = getCacheTimestamp(key);
  const exists = ts !== null;
  const expired = isCacheExpired(key);
  const age = exists ? Date.now() - ts : 0;

  return {
    exists,
    expired,
    age,
    ageFormatted: formatAge(age),
    timestamp: ts,
    lastUpdated: ts ? new Date(ts).toLocaleString() : 'Nunca',
  };
}

function formatAge(ms) {
  if (ms < 60000) return 'hace unos segundos';
  if (ms < 3600000) return `hace ${Math.floor(ms / 60000)}min`;
  if (ms < 86400000) return `hace ${Math.floor(ms / 3600000)}h`;
  return `hace ${Math.floor(ms / 86400000)}d`;
}

/** Claves de caché predefinidas */
export const CACHE_KEYS = {
  LIBRARY: 'library',
  STATS: 'stats',
};

/** Objeto caché para acceso conveniente (compatible con GridView) */
export const cache = {
  get: getCache,
  set: setCache,
  remove: removeCache,
  getInfo: getCacheInfo,
  isExpired: isCacheExpired,
  getTimestamp: getCacheTimestamp,
};
