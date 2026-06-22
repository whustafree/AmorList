import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// ─── Service Worker ────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('✅ SW registrado:', reg.scope);
    }).catch((err) => {
      console.warn('⚠️ SW no disponible:', err.message);
    });
  });
}

createApp(App).mount('#app')
