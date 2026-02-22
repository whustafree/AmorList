<template>
  <div :class="['h-[100dvh] w-full bg-gray-900 text-white flex overflow-hidden font-sans relative', playerStore.isVideoPlaying ? '' : 'pb-20 lg:pb-24']">
    
    <Visualizer />
    
    <Sidebar />

    <main class="flex-1 p-4 lg:p-8 overflow-y-auto relative z-10 w-full">
      <TopBar />
      
      <div class="max-w-7xl mx-auto">
        <AlbumView v-if="playerStore.currentAlbumData" />
        <GridView v-else-if="playerStore.currentMode === 'audio' || playerStore.currentMode === 'video'" />
        
        <div v-else class="text-center py-20 text-gray-500">
          <i class="fa-solid fa-layer-group text-4xl mb-4 block"></i>
          Modo <span class="text-pink-500 font-bold capitalize">{{ playerStore.currentMode }}</span> en construcción
        </div>
      </div>
    </main>

    <QueuePanel class="z-[60]" />
    <PlayerBar v-show="!playerStore.isVideoPlaying" class="z-50" />
    
    <div v-if="playerStore.isVideoPlaying" class="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in">
      <div class="p-4 flex justify-between items-center bg-gradient-to-b from-black/90 to-transparent absolute top-0 left-0 right-0 z-[101]">
        <button @click="closeVideo" class="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-white text-sm flex items-center gap-2 font-bold backdrop-blur-md">
          <i class="fa-solid fa-chevron-left"></i> Volver
        </button>
        <div class="font-bold text-sm lg:text-xl truncate px-4">{{ currentTrack?.title }}</div>
        <div class="w-10"></div>
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
  if (['audio', 'video'].includes(newMode)) {
    playerStore.currentAlbumData = null; 
  } else if (newMode === 'fav') {
    playerStore.currentAlbumData = playerStore.getFavoritesAlbum();
  } else if (newMode === 'history') {
    playerStore.currentAlbumData = playerStore.getHistoryAlbum();
  } else if (newMode === 'stats') {
    playerStore.loadTopSongs();
  }
});

onMounted(() => { setupTVControls(); });
</script>

<style>
.fade-in { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* SOLUCIÓN AL SCROLL INVISIBLE: Una barra de desplazamiento elegante color rosa */
.overflow-y-auto { 
  scrollbar-width: thin; 
  scrollbar-color: rgba(236, 72, 153, 0.5) transparent; 
}
.overflow-y-auto::-webkit-scrollbar { 
  width: 6px; 
}
.overflow-y-auto::-webkit-scrollbar-track { 
  background: transparent; 
}
.overflow-y-auto::-webkit-scrollbar-thumb { 
  background-color: rgba(236, 72, 153, 0.5); 
  border-radius: 10px; 
}
.overflow-y-auto::-webkit-scrollbar-thumb:hover { 
  background-color: rgba(236, 72, 153, 0.8); 
}
</style>