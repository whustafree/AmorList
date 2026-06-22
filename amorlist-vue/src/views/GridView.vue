<template>
  <div class="fade-in px-2 lg:px-0">
    <div class="flex items-center justify-between mb-2">
      <h1 class="text-2xl lg:text-3xl font-bold text-white">Tu Colección</h1>
      
      <!-- Indicador de caché -->
      <div v-if="!isLoading && cacheInfo.exists" class="text-[10px] lg:text-xs text-gray-500 flex items-center gap-2">
        <span class="flex items-center gap-1">
          <i v-if="isOnline" class="fa-solid fa-wifi text-green-500"></i>
          <i v-else class="fa-solid fa-wifi-slash text-yellow-500"></i>
          {{ cacheInfo.ageFormatted }}
        </span>
        <button 
          @click="forceRefresh"
          :disabled="isRefreshing"
          class="text-pink-400 hover:text-pink-300 disabled:opacity-50 text-xs"
        >
          <i :class="['fa-solid fa-rotate', isRefreshing ? 'fa-spin' : '']"></i>
        </button>
      </div>
    </div>

    <!-- Estado: cargando -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-20 text-gray-400">
      <i v-if="loadingFromCache" class="fa-solid fa-database text-pink-500 text-4xl mb-4 animate-pulse"></i>
      <i v-else class="fa-solid fa-heart animate-pulse text-pink-500 text-4xl mb-4"></i>
      <p>{{ loadingMessage }}</p>
    </div>

    <!-- Estado: sin datos -->
    <div v-else-if="albumsToRender.length === 0" class="text-center py-20 text-gray-500">
      <i class="fa-solid fa-magnifying-glass text-4xl mb-4 block"></i>
      <p v-if="!isOnline && cacheInfo.exists">Modo offline — biblioteca en caché disponible pero sin resultados</p>
      <p v-else>No encontramos nada en este modo.</p>
      <button v-if="!isOnline && !cacheInfo.exists" 
        @click="forceRefresh" 
        class="mt-4 bg-pink-500 text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-pink-600 transition-colors"
      >
        <i class="fa-solid fa-wifi mr-2"></i>Conectar y cargar
      </button>
    </div>

    <!-- Grid de álbumes -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-6">
      <div 
        v-for="album in albumsToRender" 
        :key="album.name"
        tabindex="0" 
        class="bg-white/5 hover:bg-white/10 focus:bg-white/10 focus:ring-4 focus:ring-pink-500 focus:outline-none p-3 lg:p-4 rounded-xl cursor-pointer transition-all hover:-translate-y-1 focus:-translate-y-1 group"
        @click="openAlbum(album)"
        @keydown.enter="openAlbum(album)"
      >
        <div class="aspect-square w-full overflow-hidden rounded-lg mb-3 shadow-lg">
          <img 
            :src="api.resolveUrl(album.cover)" 
            :alt="album.name" 
            class="w-full h-full object-cover group-hover:scale-105 group-focus:scale-105 transition-transform duration-500"
            @error="handleImageError"
            loading="lazy"
          >
        </div>
        <h3 class="font-bold text-xs lg:text-sm truncate text-white mb-1">{{ album.name }}</h3>
        <p class="text-[10px] lg:text-xs text-gray-500 uppercase font-bold tracking-tighter">{{ album.songs.length }} items</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { playerStore } from '../store/playerStore.js';
import { api } from '../utils/api.js';
import { cache, CACHE_KEYS } from '../utils/cache.js';

const isLoading = ref(true);
const loadingFromCache = ref(false);
const loadingMessage = ref('Cargando biblioteca...');
const isRefreshing = ref(false);
const isOnline = ref(navigator.onLine);
const cacheInfo = ref({ exists: false, ageFormatted: '', expired: true });

// ✅ Fallback doble de imágenes: placehold.co → SVG inline (sin dependencias externas)
const FALLBACK_PLACEHOLDER = 'https://placehold.co/600/1a1a2e/e94560?text=AmorList';
const FALLBACK_SVG = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22600%22 height=%22600%22%3E%3Crect fill=%22%231a1a2e%22 width=%22600%22 height=%22600%22/%3E%3Ctext fill=%22%23e94560%22 font-family=%22sans-serif%22 font-size=%2240%22 x=%22300%22 y=%22300%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3E🎵%3C/text%3E%3C/svg%3E';

const handleImageError = (e) => {
  const img = e.target;
  if (!img.dataset.fallback) {
    img.dataset.fallback = '1';
    img.src = FALLBACK_PLACEHOLDER;
  } else {
    img.src = FALLBACK_SVG;
  }
};

/** Carga la biblioteca: primero caché, luego red */
async function loadLibrary(forceRefresh = false) {
  isLoading.value = true;
  
  // 1. Intentar cargar desde caché inmediatamente
  const cached = cache.get(CACHE_KEYS.LIBRARY);
  const info = cache.getInfo(CACHE_KEYS.LIBRARY);
  cacheInfo.value = info;
  
  if (cached && !forceRefresh) {
    playerStore.fullLibraryData = cached;
    loadingFromCache.value = true;
    loadingMessage.value = 'Biblioteca desde caché...';
    // Mostrar datos cacheados mientras se refresca en background
    isLoading.value = false;
  }
  
  // 2. Si hay conexión, refrescar desde el servidor
  if (isOnline.value) {
    if (!cached || forceRefresh || info.expired) {
      try {
        loadingMessage.value = forceRefresh ? 'Actualizando biblioteca...' : 'Cargando biblioteca...';
        if (!cached) isLoading.value = true;
        
        const data = await api.get('/api/albums');
        playerStore.fullLibraryData = data;
        // Guardar en caché
        cache.set(CACHE_KEYS.LIBRARY, data);
        cacheInfo.value = cache.getInfo(CACHE_KEYS.LIBRARY);
      } catch (error) {
        console.error('Error al cargar:', error);
        if (!cached) {
          // Sin caché y sin conexión = error real
          loadingMessage.value = 'Error al conectar con el servidor';
        }
      }
    }
  } else {
    // Sin conexión: mostrar datos cacheados
    if (!cached) {
      loadingMessage.value = 'Sin conexión y sin caché disponible';
    } else {
      loadingMessage.value = '📡 Modo offline — mostrando datos en caché';
    }
  }
  
  isLoading.value = false;
  loadingFromCache.value = false;
}

/** Forzar refresco desde el servidor */
async function forceRefresh() {
  isRefreshing.value = true;
  await loadLibrary(true);
  isRefreshing.value = false;
}

// Monitorear cambios de conectividad
function handleOnline() { isOnline.value = true; }
function handleOffline() { isOnline.value = false; }

onMounted(() => {
  loadLibrary();
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
});

onUnmounted(() => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
});

const albumsToRender = computed(() => {
  if (!playerStore.fullLibraryData) return [];
  const query = playerStore.searchQuery.toLowerCase().trim();

  return playerStore.fullLibraryData.map(alb => {
    const filteredSongs = alb.songs.filter(s => 
      playerStore.currentMode === 'video' ? s.isVideo : !s.isVideo
    );
    return { ...alb, songs: filteredSongs };
  })
  .filter(alb => alb.songs.length > 0)
  .filter(alb => {
    if (!query) return true;
    return alb.name.toLowerCase().includes(query) || 
           alb.songs.some(s => s.title.toLowerCase().includes(query));
  });
});

const openAlbum = (album) => {
  playerStore.currentAlbumData = album;
  const mainEl = document.querySelector('main');
  if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
};
</script>