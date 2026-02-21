<template>
  <div class="fade-in pb-10 relative z-10">
    <button @click="goBack" class="text-gray-400 hover:text-white flex items-center gap-2 mb-6 transition-colors">
      <i class="fa-solid fa-chevron-left"></i> Volver
    </button>

    <div class="flex flex-col md:flex-row gap-6 items-end mb-8">
      <div 
        class="w-48 h-48 overflow-hidden shadow-2xl shrink-0 transition-all duration-500"
        :class="playerStore.isCassetteMode ? 'rounded-full animate-[spin_4s_linear_infinite]' : 'rounded-xl'"
      >
        <img :src="album.cover" :alt="album.name" class="w-full h-full object-cover">
      </div>

      <div class="flex flex-col gap-2">
        <span class="text-xs font-bold text-gray-400 tracking-widest">LISTA</span>
        <h1 class="text-4xl md:text-5xl font-black text-white">{{ album.name }}</h1>
        <p class="text-gray-400">AmorList • {{ album.songs.length }} canciones</p>
        
        <div class="flex gap-3 mt-4">
          <button @click="playAll" class="bg-pink-500 hover:bg-pink-400 text-white px-6 py-2 rounded-full font-bold transition-all flex items-center gap-2 shadow-lg shadow-pink-500/30">
            <i class="fa-solid fa-play"></i> Reproducir
          </button>
        </div>
      </div>
    </div>

    <div class="w-full">
      <div class="flex text-gray-400 border-b border-white/10 pb-2 mb-4 px-4 text-sm font-bold">
        <div class="w-12">#</div>
        <div class="flex-1">Título</div>
        <div class="w-24 text-right">Acciones</div>
      </div>
      
      <div 
        v-for="(song, index) in album.songs" 
        :key="song.id"
        @click="playSong(index)"
        :class="['flex items-center p-4 rounded-lg transition-colors group cursor-pointer', 
                 isCurrentSong(song) ? 'bg-white/10 text-pink-500' : 'text-gray-300 hover:bg-white/5']"
      >
        <div :class="['w-12', isCurrentSong(song) ? 'text-pink-500' : 'text-gray-500']">
          <i v-if="isCurrentSong(song) && playerStore.isPlaying" class="fa-solid fa-chart-simple"></i>
          <span v-else>{{ index + 1 }}</span>
        </div>
        
        <div :class="['flex-1 font-semibold truncate pr-4', isCurrentSong(song) ? 'text-pink-500' : 'text-white']">
          {{ song.title }}
          <span v-if="song.playCount" class="text-xs text-gray-500 ml-2 border border-white/10 px-2 py-0.5 rounded-full">
            <i class="fa-solid fa-headphones text-[10px]"></i> {{ song.playCount }}
          </span>
        </div>
        
        <div class="w-24 text-right flex justify-end gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <button @click.stop="playerStore.addToQueue(song)" class="hover:text-pink-500 text-white transition-colors" title="Añadir a cola">
            <i class="fa-solid fa-plus"></i>
          </button>
          <button @click.stop="playerStore.toggleFavorite(song.id)" :class="['transition-colors', playerStore.isFavorite(song.id) ? 'text-pink-500' : 'text-white hover:text-pink-500']" title="Me gusta">
            <i :class="playerStore.isFavorite(song.id) ? 'fa-solid fa-heart' : 'fa-regular fa-heart'"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { playerStore } from '../store/playerStore.js';

const album = computed(() => playerStore.currentAlbumData);

const goBack = () => {
  playerStore.currentAlbumData = null;
  // ACTUALIZADO: Para que pueda volver correctamente desde stats
  if (['fav', 'history', 'stats'].includes(playerStore.currentMode)) {
    playerStore.currentMode = 'audio';
  }
};

const playSong = (index) => {
  playerStore.playTrack(album.value.songs, index);
};

const playAll = () => {
  if (album.value && album.value.songs.length > 0) {
    playerStore.playTrack(album.value.songs, 0);
  }
};

const isCurrentSong = (song) => {
  const current = playerStore.currentPlaylist[playerStore.currentIndex];
  return current && current.id === song.id;
};
</script>