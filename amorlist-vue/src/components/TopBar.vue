<template>
  <div class="flex items-center gap-4 mb-6 lg:mb-8">
    
    <button 
      @click="playerStore.isMobileMenuOpen = true" 
      class="lg:hidden w-10 h-10 flex items-center justify-center bg-white/5 rounded-full text-white"
    >
      <i class="fa-solid fa-bars"></i>
    </button>

    <div class="relative flex-1 max-w-md">
      <i class="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
      <input 
        type="text" 
        v-model="playerStore.searchQuery"
        placeholder="Buscar..." 
        class="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-pink-500 focus:bg-white/10 transition-all placeholder-gray-500"
      >
    </div>

    <div class="flex gap-2 lg:gap-4 shrink-0">
      <button 
        @click="refreshLibrary" 
        :disabled="isRefreshing"
        class="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all text-gray-400 hover:text-white disabled:opacity-50" 
      >
        <i :class="['fa-solid fa-rotate', isRefreshing ? 'fa-spin text-pink-500' : '']"></i>
      </button>

      <button 
        @click="playerStore.isQueueOpen = !playerStore.isQueueOpen" 
        class="relative w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors text-gray-400 hover:text-white" 
      >
        <i class="fa-solid fa-layer-group"></i>
        <span v-if="playerStore.queueList.length > 0" class="absolute -top-1 -right-1 bg-pink-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
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
  } catch (error) { console.error(error); } 
  finally { isRefreshing.value = false; }
};
</script>