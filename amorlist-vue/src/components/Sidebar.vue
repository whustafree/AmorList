<template>
  <aside class="w-64 bg-black/40 backdrop-blur-md border-r border-white/10 flex flex-col p-4 h-full">
    <div class="flex justify-center mb-8 mt-4">
      <img src="/logo.png" alt="AmorList" class="w-32 h-auto drop-shadow-md">
    </div>
    
    <div class="flex flex-col gap-2">
      <div class="text-xs text-gray-500 font-bold tracking-wider mb-2">BIBLIOTECA</div>
      
      <button 
        @click="playerStore.currentMode = 'audio'"
        :class="['flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold', 
                 playerStore.currentMode === 'audio' ? 'bg-pink-500 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5']">
        Música
      </button>
      
      <button 
        @click="playerStore.currentMode = 'video'"
        :class="['flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold', 
                 playerStore.currentMode === 'video' ? 'bg-pink-500 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5']">
        Videos
      </button>

      <button 
        @click="playerStore.currentMode = 'fav'"
        :class="['flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold', 
                 playerStore.currentMode === 'fav' ? 'bg-pink-500 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5']">
        Favoritos ❤️
      </button>
    </div>

    <div class="mt-auto text-center text-xs text-gray-500 opacity-50 pb-4">
      Propiedad de <strong>whustaf</strong>
    </div>
  </aside>
</template>

<script setup>
import { playerStore } from '../store/playerStore.js';
</script>