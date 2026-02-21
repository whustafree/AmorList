<template>
  <div :class="['min-h-screen bg-gray-900 text-white flex overflow-hidden font-sans relative', playerStore.isVideoPlaying ? '' : 'pb-24']">
    
    <Visualizer />
    <Sidebar class="relative z-20" />

    <main class="flex-1 p-8 overflow-y-auto relative z-10">
      <TopBar />
      <AlbumView v-if="playerStore.currentAlbumData" />
      <GridView v-else-if="playerStore.currentMode === 'audio' || playerStore.currentMode === 'video'" />
      <div v-else class="text-gray-400 mt-10">
        Modo actual: <span class="text-pink-500 font-bold capitalize">{{ playerStore.currentMode }}</span>
      </div>
    </main>

    <QueuePanel class="z-30" />
    <PlayerBar v-show="!playerStore.isVideoPlaying" class="z-40" />
    
    <div v-if="playerStore.isVideoPlaying" class="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in">
      <div class="p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-[101] transition-opacity hover:opacity-100">
        <button @click="closeVideo" class="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-white flex items-center gap-2 font-bold transition-all shadow-lg backdrop-blur-md">
          <i class="fa-solid fa-chevron-left"></i> Cerrar Video
        </button>
        <div class="font-bold text-xl drop-shadow-md">{{ currentTrack?.title }}</div>
        <div class="w-32"></div>
      </div>
      <video 
        :src="currentTrack?.src" 
        controls 
        autoplay 
        class="w-full h-full object-contain"
        @ended="playerStore.nextTrack()"
      ></video>
    </div>

  </div>
</template>

<script setup>
import { onMounted, watch, computed } from 'vue';

import Sidebar from './components/Sidebar.vue';
import PlayerBar from './components/PlayerBar.vue';
import TopBar from './components/TopBar.vue';
import GridView from './views/GridView.vue';
import AlbumView from './views/AlbumView.vue';
import QueuePanel from './components/QueuePanel.vue'; 
import Visualizer from './components/Visualizer.vue';
import { playerStore } from './store/playerStore.js';
import { setupTVControls } from './utils/tv-input.js';

const currentTrack = computed(() => playerStore.currentPlaylist[playerStore.currentIndex]);

const closeVideo = () => {
  playerStore.isVideoPlaying = false;
  playerStore.isPlaying = false;
};

watch(() => playerStore.currentMode, (newMode) => {
  playerStore.searchQuery = ''; 
  if (newMode === 'audio' || newMode === 'video') {
    playerStore.currentAlbumData = null; 
  } else if (newMode === 'fav') {
    playerStore.currentAlbumData = playerStore.getFavoritesAlbum();
  } else if (newMode === 'history') {
    playerStore.currentAlbumData = playerStore.getHistoryAlbum();
  } else if (newMode === 'stats') {
    // LLAMAMOS A LA NUEVA FUNCIÓN DEL BACKEND
    playerStore.loadTopSongs();
  }
});

onMounted(() => {
  setupTVControls();
});
</script>

<style>
.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}
</style>