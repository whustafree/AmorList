<template>
  <div class="fade-in px-2 lg:px-0">
    <h1 class="text-2xl lg:text-3xl font-bold mb-6 text-white">Tu Colección</h1>
    
    <div v-if="isLoading" class="flex flex-col items-center justify-center py-20 text-gray-400">
      <i class="fa-solid fa-heart animate-pulse text-pink-500 text-4xl mb-4"></i>
      <p>Cargando biblioteca...</p>
    </div>

    <div v-else-if="albumsToRender.length === 0" class="text-center py-20 text-gray-500">
      <i class="fa-solid fa-magnifying-glass text-4xl mb-4 block"></i>
      <p>No encontramos nada en este modo.</p>
    </div>

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
            :src="album.cover" 
            :alt="album.name" 
            class="w-full h-full object-cover group-hover:scale-105 group-focus:scale-105 transition-transform duration-500"
            @error="handleImageError"
          >
        </div>
        <h3 class="font-bold text-xs lg:text-sm truncate text-white mb-1">{{ album.name }}</h3>
        <p class="text-[10px] lg:text-xs text-gray-500 uppercase font-bold tracking-tighter">{{ album.songs.length }} items</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { playerStore } from '../store/playerStore.js';
import { api } from '../utils/api.js';

const isLoading = ref(true);

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

onMounted(async () => {
  try {
    const data = await api.get('/api/albums');
    playerStore.fullLibraryData = data;
  } catch (error) {
    console.error("Error:", error);
  } finally {
    isLoading.value = false;
  }
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