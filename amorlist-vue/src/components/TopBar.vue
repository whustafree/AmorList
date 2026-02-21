<template>
  <div class="flex items-center justify-between mb-8">
    
    <div class="relative w-full max-w-md">
      <i class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
      <input 
        type="text" 
        v-model="playerStore.searchQuery"
        placeholder="Buscar discos o canciones..." 
        class="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-pink-500 focus:bg-white/10 transition-all placeholder-gray-500"
      >
    </div>

    <div class="flex gap-4">
      <button 
        @click="refreshLibrary" 
        :disabled="isRefreshing"
        class="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-gray-400 hover:text-white disabled:opacity-50" 
        title="Actualizar Biblioteca desde Drive"
      >
        <i :class="['fa-solid fa-rotate', isRefreshing ? 'fa-spin text-pink-500' : '']"></i>
      </button>

      <button 
        @click="playerStore.isQueueOpen = !playerStore.isQueueOpen" 
        class="relative w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-gray-400 hover:text-white" 
        title="Ver Cola"
      >
        <i class="fa-solid fa-layer-group"></i>
        <span v-if="playerStore.queueList.length > 0" class="absolute -top-1 -right-1 bg-pink-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-lg">
          {{ playerStore.queueList.length }}
        </span>
      </button>
    </div>
    
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { playerStore } from '../store/playerStore.js';

const isRefreshing = ref(false);

const refreshLibrary = async () => {
  if (isRefreshing.value) return;
  isRefreshing.value = true;
  
  try {
    const res = await fetch('/api/refresh');
    const data = await res.json();
    playerStore.fullLibraryData = data;
    console.log("Biblioteca actualizada desde Drive");
  } catch (error) {
    console.error("Error actualizando biblioteca:", error);
    alert("Hubo un error al sincronizar con Drive.");
  } finally {
    isRefreshing.value = false;
  }
};
</script>