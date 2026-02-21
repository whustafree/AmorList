<template>
  <div 
    class="fixed right-0 top-0 bottom-24 w-80 bg-black/95 backdrop-blur-2xl border-l border-white/10 z-40 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out"
    :class="playerStore.isQueueOpen ? 'translate-x-0' : 'translate-x-full'"
  >
    <div class="p-6 border-b border-white/10 flex justify-between items-center">
      <h3 class="font-bold text-lg text-white flex items-center gap-2">
        <i class="fa-solid fa-layer-group"></i> Cola
      </h3>
      <div class="flex gap-4 items-center">
        <button @click="playerStore.clearQueue()" class="text-xs text-gray-400 hover:text-white uppercase tracking-wider font-bold transition-colors">Limpiar</button>
        <button @click="playerStore.isQueueOpen = false" class="text-gray-400 hover:text-white text-lg transition-colors"><i class="fa-solid fa-xmark"></i></button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
      <div v-if="playerStore.queueList.length === 0" class="text-gray-500 text-sm text-center mt-10">
        La cola está vacía. <br> Añade canciones con el botón <i class="fa-solid fa-plus mx-1"></i>
      </div>
      
      <div 
        v-else 
        v-for="(song, index) in playerStore.queueList" 
        :key="index + '-' + song.id"
        class="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 group cursor-pointer transition-colors"
        @click="playerStore.playFromQueue(index)"
      >
        <div class="flex flex-col truncate pr-2 w-full">
          <span class="text-sm font-semibold text-white truncate">{{ song.title }}</span>
          <span class="text-xs text-gray-400 truncate">{{ song.artist || 'AmorList' }}</span>
        </div>
        <button @click.stop="playerStore.removeFromQueue(index)" class="text-gray-500 hover:text-pink-500 opacity-0 group-hover:opacity-100 transition-opacity px-2">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { playerStore } from '../store/playerStore.js';
</script>