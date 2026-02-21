<template>
  <div class="fade-in pb-10">
    <button 
      @click="goBack" 
      class="text-gray-400 hover:text-white flex items-center gap-2 mb-6 transition-colors"
    >
      <i class="fa-solid fa-chevron-left"></i> Volver
    </button>

    <div class="flex flex-col md:flex-row gap-6 items-end mb-8">
      <div class="w-48 h-48 rounded-xl overflow-hidden shadow-2xl shrink-0">
        <img :src="album.cover" :alt="album.name" class="w-full h-full object-cover">
      </div>
      <div class="flex flex-col gap-2">
        <span class="text-xs font-bold text-gray-400 tracking-widest">ÁLBUM</span>
        <h1 class="text-4xl md:text-5xl font-black text-white">{{ album.name }}</h1>
        <p class="text-gray-400">AmorList • {{ album.songs.length }} canciones</p>
        
        <div class="flex gap-3 mt-4">
          <button class="bg-pink-500 hover:bg-pink-400 text-white px-6 py-2 rounded-full font-bold transition-all flex items-center gap-2 shadow-lg shadow-pink-500/30">
            <i class="fa-solid fa-play"></i> Reproducir
          </button>
          <button class="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-full font-bold transition-all flex items-center gap-2">
            <i class="fa-solid fa-shuffle"></i> Aleatorio
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
        class="flex items-center text-gray-300 hover:bg-white/5 p-4 rounded-lg transition-colors group cursor-pointer"
      >
        <div class="w-12 text-gray-500">{{ index + 1 }}</div>
        <div class="flex-1 font-semibold text-white truncate pr-4">{{ song.title }}</div>
        <div class="w-24 text-right flex justify-end gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="hover:text-pink-500 transition-colors" title="Añadir a la cola"><i class="fa-solid fa-plus"></i></button>
          <button class="hover:text-pink-500 transition-colors" title="Me gusta"><i class="fa-regular fa-heart"></i></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { playerStore } from '../store/playerStore.js';

// Obtenemos el álbum que el usuario seleccionó
const album = computed(() => playerStore.currentAlbumData);

// Función para vaciar el álbum seleccionado (lo que nos devuelve a la grilla)
const goBack = () => {
  playerStore.currentAlbumData = null;
};
</script>