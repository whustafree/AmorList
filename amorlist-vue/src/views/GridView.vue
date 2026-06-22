<template>
  <div>
    <!-- Welcome header -->
    <div class="mb-6 fade-in">
      <h1 class="text-2xl lg:text-3xl font-bold text-white">{{ greeting }}</h1>
      <p class="text-sm text-[#b3b3b3] mt-1">{{ playerStore.fullLibraryData.length }} álbumes en tu biblioteca</p>
    </div>

    <!-- Loading state -->
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-20 fade-in">
      <div class="w-12 h-12 border-2 border-[#535353] border-t-[#1ed760] rounded-full animate-spin mb-4"></div>
      <p class="text-sm text-[#727272]">{{ loadingMessage }}</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="albumsToRender.length === 0" class="text-center py-20 fade-in">
      <i class="fa-solid fa-compact-disc text-4xl mb-4 block text-[#535353]"></i>
      <p class="text-sm text-[#727272]">
        <template v-if="!isOnline && cacheInfo.exists">Modo offline — sin resultados en caché</template>
        <template v-else>No encontramos nada. <button @click="forceRefresh" class="text-white hover:underline">Intentar de nuevo</button></template>
      </p>
    </div>

    <!-- Album grid con TransitionGroup para animación escalonada -->
    <TransitionGroup v-else name="card" tag="div" 
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
      <div v-for="(album, i) in albumsToRender" :key="album.name" tabindex="0"
        @click="openAlbum(album)" @keydown.enter="openAlbum(album)"
        :style="{ '--i': i }"
        class="card-item group bg-[#181818] hover:bg-[#282828] p-2 sm:p-3 lg:p-4 rounded-md cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/30">
        <div class="relative aspect-square w-full overflow-hidden rounded-md mb-2 sm:mb-3 shadow-lg">
          <img :src="api.resolveUrl(album.cover)" :alt="album.name"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            @error="e => e.target.src = FALLBACK_LARC" loading="lazy">
          <div class="absolute bottom-2 right-2 w-8 h-8 sm:w-10 sm:h-10 bg-[#1ed760] rounded-full shadow-xl flex items-center justify-center
                      opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
            <i class="fa-solid fa-play text-black text-xs sm:text-sm ml-0.5"></i>
          </div>
        </div>
        <h3 class="font-bold text-xs sm:text-sm text-white truncate mb-0.5 sm:mb-1">{{ album.name }}</h3>
        <p class="text-[10px] sm:text-xs text-[#727272] truncate">{{ album.artist || (album.songs.length + ' canciones') }}</p>
      </div>
    </TransitionGroup>

    <!-- Cache info -->
    <div v-if="!isLoading && cacheInfo.exists" class="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#535353]">
      <i :class="[isOnline ? 'fa-solid fa-wifi' : 'fa-solid fa-wifi-slash', isOnline ? 'text-[#535353]' : 'text-[#b3b3b3]']"></i>
      <span>{{ cacheInfo.ageFormatted }}</span>
      <button @click="forceRefresh" :disabled="isRefreshing"
        class="text-[#727272] hover:text-white disabled:opacity-50 transition-colors ml-2">
        <i :class="['fa-solid fa-rotate', isRefreshing ? 'fa-spin' : '']"></i>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { playerStore } from '../store/playerStore.js'
import { api } from '../utils/api.js'
import { cache, CACHE_KEYS } from '../utils/cache.js'

const FALLBACK_LARC = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22600%22 height=%22600%22%3E%3Crect fill=%22%23121212%22 width=%22600%22 height=%22600%22/%3E%3Ccircle fill=%22%23e94560%22 opacity=%220.15%22 cx=%22300%22 cy=%22300%22 r=%22200%22/%3E%3Ctext fill=%22%23e94560%22 font-family=%22sans-serif%22 font-size=%2250%22 font-weight=%22bold%22 x=%22300%22 y=%22270%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3E%E2%99%AB%3C/text%3E%3Ctext fill=%22%23999%22 font-family=%22sans-serif%22 font-size=%2220%22 x=%22300%22 y=%22320%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22%3EL%5C%27Arc~en~Ciel%3C/text%3E%3C/svg%3E'

const isLoading = ref(true)
const loadingMessage = ref('Cargando...')
const isRefreshing = ref(false)
const isOnline = ref(navigator.onLine)
const cacheInfo = ref({ exists: false, ageFormatted: '', expired: true })

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días ☀️'
  if (h < 18) return 'Buenas tardes 🌤️'
  return 'Buenas noches 🌙'
})

async function loadLibrary(forceRefresh = false) {
  isLoading.value = true
  const cached = cache.get(CACHE_KEYS.LIBRARY)
  const info = cache.getInfo(CACHE_KEYS.LIBRARY)
  cacheInfo.value = info
  if (cached && !forceRefresh) {
    playerStore.fullLibraryData = cached
    isLoading.value = false
  }
  if (isOnline.value) {
    try {
      loadingMessage.value = 'Actualizando biblioteca...'
      if (!cached) isLoading.value = true
      const data = await api.get('/api/albums')
      playerStore.fullLibraryData = data
      cache.set(CACHE_KEYS.LIBRARY, data)
      cacheInfo.value = cache.getInfo(CACHE_KEYS.LIBRARY)
    } catch (error) {
      console.error(error)
      if (!cached) loadingMessage.value = 'Error al conectar'
    }
  } else if (!cached) {
    loadingMessage.value = 'Sin conexión'
  }
  isLoading.value = false
}

async function forceRefresh() {
  isRefreshing.value = true
  await loadLibrary(true)
  isRefreshing.value = false
}

function handleOnline() { isOnline.value = true }
function handleOffline() { isOnline.value = false }

onMounted(() => {
  loadLibrary()
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
})
onUnmounted(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
})

const albumsToRender = computed(() => {
  if (!playerStore.fullLibraryData) return []
  const query = playerStore.searchQuery.toLowerCase().trim()
  return playerStore.fullLibraryData
    .map(alb => ({ ...alb, songs: alb.songs.filter(s => playerStore.currentMode === 'video' ? s.isVideo : !s.isVideo) }))
    .filter(alb => alb.songs.length > 0)
    .filter(alb => !query || alb.name.toLowerCase().includes(query) || alb.songs.some(s => s.title.toLowerCase().includes(query)))
})

const openAlbum = (album) => {
  playerStore.currentAlbumData = album
  document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<style scoped>
/* TransitionGroup animation for grid cards */
.card-enter-active {
  animation: cardEnter 0.35s ease-out both;
  animation-delay: calc(var(--i, 0) * 40ms);
}
.card-leave-active {
  animation: cardLeave 0.25s ease-in both;
  animation-delay: calc(var(--i, 0) * 20ms);
}
.card-move {
  transition: transform 0.4s ease;
}

@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes cardLeave {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
}
</style>
