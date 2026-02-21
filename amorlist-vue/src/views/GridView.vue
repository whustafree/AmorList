<template>
  <div class="fade-in">
    <h1 class="text-3xl font-bold mb-6">Tu Colección</h1>
    
    <div v-if="isLoading" class="text-gray-400">
      Cargando biblioteca con amor... ❤️
    </div>

    <div v-else-if="albumsToRender.length === 0" class="text-gray-400">
      No hay contenido para mostrar en este modo.
    </div>

    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      <div 
        v-for="album in albumsToRender" 
        :key="album.name"
        class="bg-white/5 hover:bg-white/10 p-4 rounded-xl cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl group"
        @click="openAlbum(album)"
      >
        <div class="aspect-square w-full overflow-hidden rounded-lg mb-4 shadow-lg">
          <img 
            :src="album.cover" 
            :alt="album.name" 
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            @error="(e) => e.target.src = 'https://placehold.co/600'"
          >
        </div>
        <h3 class="font-bold text-sm truncate text-white">{{ album.name }}</h3>
        <p class="text-xs text-gray-400 mt-1">{{ album.songs.length }} items</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { playerStore } from '../store/playerStore.js';

const isLoading = ref(true);

// 1. Cargar datos del backend al iniciar
onMounted(async () => {
  try {
    const res = await fetch('/api/albums');
    const data = await res.json();
    playerStore.fullLibraryData = data;
  } catch (error) {
    console.error("Error cargando biblioteca:", error);
  } finally {
    isLoading.false = false;
    isLoading.value = false;
  }
});

// 2. Filtrar los discos dependiendo si estamos en Música o Video
const albumsToRender = computed(() => {
  if (!playerStore.fullLibraryData) return [];
  
  return playerStore.fullLibraryData.map(alb => {
    // Filtramos las canciones internas según el modo actual
    const filteredSongs = alb.songs.filter(s => 
      playerStore.currentMode === 'video' ? s.isVideo : !s.isVideo
    );
    return { ...alb, songs: filteredSongs };
  }).filter(alb => alb.songs.length > 0); // Solo mostramos discos que tengan contenido
});

// 3. Función temporal para cuando haces clic en un disco
const openAlbum = (album) => {
  console.log("Abrir disco:", album.name);
  alert(`Hiciste clic en: ${album.name}. ¡Pronto abriremos la lista de canciones!`);
};
</script>