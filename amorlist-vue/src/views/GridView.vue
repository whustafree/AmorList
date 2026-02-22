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
            @error="(e) => e.target.src = 'https://placehold.co/600'"
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

const isLoading = ref(true);

onMounted(async () => {
  try {
    const res = await fetch('/api/albums');
    const data = await res.json();
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
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
</script>