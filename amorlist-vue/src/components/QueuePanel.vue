<template>
  <div 
    class="fixed right-0 top-0 bottom-0 lg:bottom-24 w-full sm:w-80 bg-black/95 backdrop-blur-3xl border-l border-white/10 z-[100] flex flex-col shadow-2xl transition-transform duration-500 ease-in-out"
    :class="playerStore.isQueueOpen ? 'translate-x-0' : 'translate-x-full'"
  >
    <div class="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
      <h3 class="font-black text-sm lg:text-base text-white flex items-center gap-3 tracking-widest uppercase">
        <i class="fa-solid fa-list-ul text-pink-500"></i> Cola de Espera
      </h3>
      <button @click="playerStore.isQueueOpen = false" class="text-gray-400 hover:text-white p-2">
        <i class="fa-solid fa-xmark text-2xl lg:text-xl"></i>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-4 flex flex-col gap-2 custom-scroll">
      <div v-if="playerStore.queueList.length === 0" class="text-gray-500 text-sm text-center mt-20 px-10">
        <i class="fa-solid fa-layer-group text-4xl mb-4 block opacity-20"></i>
        Tu lista de espera está vacía. Añade canciones con el botón <i class="fa-solid fa-plus mx-1"></i>
      </div>
      
      <div 
        v-for="(song, index) in playerStore.queueList" 
        :key="index"
        class="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 group cursor-pointer transition-all border border-transparent hover:border-white/10"
        @click="playerStore.playFromQueue(index)"
      >
        <img :src="song.cover" class="w-10 h-10 rounded-lg object-cover">
        <div class="flex-1 truncate">
          <div class="text-sm font-bold text-white truncate">{{ song.title }}</div>
          <div class="text-[10px] text-gray-500 truncate uppercase tracking-tighter">{{ song.album }}</div>
        </div>
        <button @click.stop="playerStore.removeFromQueue(index)" class="text-gray-500 hover:text-pink-500 p-2">
          <i class="fa-solid fa-trash-can text-xs"></i>
        </button>
      </div>
    </div>

    <div v-if="playerStore.queueList.length > 0" class="p-4 bg-white/5 border-t border-white/10">
      <button @click="playerStore.clearQueue()" class="w-full py-3 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-pink-500 transition-colors">
        Limpiar toda la cola
      </button>
    </div>
  </div>
</template>

<script setup>
import { playerStore } from '../store/playerStore.js';
</script>

<style scoped>
.custom-scroll::-webkit-scrollbar { width: 4px; }
.custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
</style>