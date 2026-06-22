/**
 * Cliente API centralizado para AmorList
 * 
 * Usa VITE_API_URL cuando está disponible (APK/producción)
 * En desarrollo (Vite proxy) usa rutas relativas
 */

const API_BASE = typeof import.meta !== 'undefined' && import.meta.env.VITE_API_URL || '';

export const api = {
  async get(path) {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
    return res.json();
  },

  async post(path, data) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
    return res.json();
  },

  async put(path, data) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`PUT ${path} → ${res.status}`);
    return res.json();
  },

  async del(path) {
    const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`DELETE ${path} → ${res.status}`);
    return res.json();
  },

  /** Para streaming de audio/video (necesita el Response, no JSON) */
  streamUrl(path) {
    return `${API_BASE}${path}`;
  },
};
