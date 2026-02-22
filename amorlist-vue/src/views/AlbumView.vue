<template>
  <div class="fade-in pb-10 px-2 lg:px-0">
    <button @click="goBack" class="text-gray-400 hover:text-white focus:text-pink-500 focus:outline-none focus:bg-white/10 flex items-center gap-2 mb-6 transition-colors font-bold text-sm p-2 rounded-lg">
      <i class="fa-solid fa-chevron-left"></i> VOLVER
    </button>

    <div class="flex flex-col md:flex-row gap-6 items-center md:items-end mb-10 text-center md:text-left">
      <div 
        class="w-48 h-48 lg:w-56 lg:h-56 overflow-hidden shadow-2xl shrink-0 transition-all duration-500"
        :class="playerStore.isCassetteMode ? 'rounded-full animate-[spin_4s_linear_infinite]' : 'rounded-2xl'"
      >
        <img :src="album.cover" :alt="album.name" class="w-full h-full object-cover">
      </div>

      <div class="flex flex-col gap-2 w-full">
        <span class="text-[10px] font-black text-pink-500 tracking-[0.2em] uppercase">Álbum</span>
        <h1 class="text-3xl lg:text-5xl font-black text-white leading-tight">{{ album.name }}</h1>
        <p class="text-sm text-gray-400 font-medium">AmorList • {{ album.songs.length }} canciones</p>
        
        <div class="flex justify-center md:justify-start gap-3 mt-4">
          <button @click="playAll" class="bg-pink-500 hover:bg-pink-400 focus:ring-4 focus:ring-white/50 focus:outline-none text-white px-8 py-3 rounded-full font-bold transition-all flex items-center gap-2 shadow-lg shadow-pink-500/30 text-sm">
            <i class="fa-solid fa-play"></i> REPRODUCIR
          </button>
        </div>
      </div>
    </div>

    <div class="w-full">
      <div class="hidden lg:flex text-gray-500 border-b border-white/5 pb-2 mb-4 px-4 text-[10px] font-black uppercase tracking-widest">
        <div class="w-12 text-center">#</div>
        <div class="flex-1 px-4">Título</div>
        <div class="w-32 text-right">Acciones</div>
      </div>
      
      <div 
        v-for="(song, index) in album.songs" 
        :key="song.id"
        tabindex="0"
        @click="playSong(index)"
        @keydown.enter="playSong(index)"
        :class="['flex items-center p-4 rounded-xl transition-all group cursor-pointer mb-1 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:bg-white/10', 
                 isCurrentSong(song) ? 'bg-pink-500/10 text-pink-500' : 'text-gray-300 hover:bg-white/5']"
      >
        <div :class="['w-8 lg:w-12 text-center text-xs lg:text-sm', isCurrentSong(song) ? 'text-pink-500' : 'text-gray-500']">
          <i v-if="isCurrentSong(song) && playerStore.isPlaying" class="fa-solid fa-volume-high animate-pulse"></i>
          <span v-else>{{ index + 1 }}</span>
        </div>
        
        <div class="flex-1 px-2 lg:px-4 truncate">
          <div :class="['font-bold text-sm lg:text-base truncate', isCurrentSong(song) ? 'text-pink-500' : 'text-white']">
            {{ song.title }}
          </div>
          <div class="text-[10px] lg:text-xs text-gray-500 mt-0.5" v-if="song.playCount">
             {{ song.playCount }} reproducciones
          </div>
        </div>
        
        <div class="flex items-center gap-3 lg:gap-5">
          <button @click.stop="playerStore.addToQueue(song)" class="text-gray-500 hover:text-white focus:text-pink-500 focus:outline-none focus:scale-125 transition-transform p-2">
            <i class="fa-solid fa-plus text-sm"></i>
          </button>
          <button @click.stop="playerStore.toggleFavorite(song.id)" :class="['p-2 transition-all focus:outline-none focus:scale-125', playerStore.isFavorite(song.id) ? 'text-pink-500' : 'text-gray-500 hover:text-pink-500 focus:text-pink-500']">
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
const goBack = () => { playerStore.currentAlbumData = null; };
const playSong = (index) => { playerStore.playTrack(album.value.songs, index); };
const playAll = () => { if (album.value?.songs.length) playerStore.playTrack(album.value.songs, 0); };
const isCurrentSong = (song) => {
  const current = playerStore.currentPlaylist[playerStore.currentIndex];
  return current && current.id === song.id;
};
</script>