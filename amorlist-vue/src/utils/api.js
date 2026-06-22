/**
 * Cliente API centralizado para AmorList
 * 
 * Usa VITE_API_URL cuando está disponible (APK/producción)
 * En desarrollo (Vite proxy) usa rutas relativas
 */

/**
 * API Base URL. En desarrollo (Vite proxy) es vacío.
 * En producción/APK se configura con VITE_API_URL.
 */
const API_BASE = typeof import.meta !== 'undefined' && import.meta.env.VITE_API_URL || '';

/** Detecta si una URL ya es absoluta */
function isAbsolute(url) {
  return url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//'));
}

/** Convierte una ruta relativa a absoluta usando API_BASE */
function resolve(path) {
  if (!path || isAbsolute(path)) return path;
  return `${API_BASE}${path}`;
}

export const api = {
  async get(path) {
    const res = await fetch(resolve(path));
    if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
    return res.json();
  },

  async post(path, data) {
    const res = await fetch(resolve(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
    return res.json();
  },

  async put(path, data) {
    const res = await fetch(resolve(path), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`PUT ${path} → ${res.status}`);
    return res.json();
  },

  async del(path) {
    const res = await fetch(resolve(path), { method: 'DELETE' });
    if (!res.ok) throw new Error(`DELETE ${path} → ${res.status}`);
    return res.json();
  },

  /** URL absoluta para streaming de audio/video o imágenes */
  resolveUrl(path) {
    return resolve(path);
  },
};
