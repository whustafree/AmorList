<template>
  <div 
    class="fixed left-64 top-0 bottom-24 w-96 bg-black/95 backdrop-blur-2xl border-r border-white/10 z-40 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out"
    :class="playerStore.isLyricsOpen ? 'translate-x-0' : '-translate-x-full'"
  >
    <div class="p-6 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-pink-500/20 to-transparent">
      <h3 class="font-bold text-lg text-white flex items-center gap-2">
        <i class="fa-solid fa-microphone-lines"></i> Letras
      </h3>
      <button @click="playerStore.isLyricsOpen = false" class="text-gray-400 hover:text-white text-lg transition-colors">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-6 scroll-smooth">
      <div v-if="playerStore.currentPlaylist.length === 0" class="text-gray-500 text-sm text-center mt-10">
        Reproduce una canción para ver su letra.
      </div>
      
      <div v-else-if="playerStore.isLoadingLyrics" class="flex justify-center mt-10 text-pink-500 animate-pulse">
        <i class="fa-solid fa-circle-notch fa-spin text-3xl"></i>
      </div>

      <pre 
        v-else 
        class="whitespace-pre-wrap font-sans text-lg leading-relaxed text-gray-300 font-medium text-center"
      >{{ playerStore.currentLyrics }}</pre>
    </div>
  </div>
</template>

<script setup>
import { playerStore } from '../store/playerStore.js';
</script>