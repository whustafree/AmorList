<template>
  <div 
    v-if="playerStore.isMobileMenuOpen" 
    class="fixed inset-0 bg-black/60 z-40 lg:hidden"
    @click="playerStore.isMobileMenuOpen = false"
  ></div>

  <aside 
    :class="[
      'fixed lg:relative z-50 w-64 bg-black/90 lg:bg-black/40 backdrop-blur-md border-r border-white/10 flex flex-col p-4 h-full transition-transform duration-300',
      playerStore.isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    ]"
  >
    <div class="flex justify-between items-center mb-8 mt-4">
      <img src="/logo.png" alt="AmorList" class="w-32 h-auto drop-shadow-md">
      <button @click="playerStore.isMobileMenuOpen = false" class="lg:hidden text-gray-400">
        <i class="fa-solid fa-xmark text-2xl"></i>
      </button>
    </div>
    
    <div class="flex flex-col gap-1 overflow-y-auto">
      <div class="text-xs text-gray-500 font-bold tracking-wider mb-2 px-4 uppercase">Biblioteca</div>
      
      <button @click="changeMode('audio')" :class="btnClass('audio')">
        <i class="fa-solid fa-music w-5"></i> Música
      </button>
      
      <button @click="changeMode('video')" :class="btnClass('video')">
        <i class="fa-solid fa-film w-5"></i> Videos
      </button>

      <div class="text-xs text-gray-500 font-bold tracking-wider mb-2 mt-4 px-4 uppercase">Actividad</div>

      <button @click="changeMode('fav')" :class="btnClass('fav')">
        <i class="fa-solid fa-heart w-5"></i> Favoritos
      </button>

      <button @click="changeMode('history')" :class="btnClass('history')">
        <i class="fa-solid fa-clock-rotate-left w-5"></i> Historial
      </button>

      <button @click="changeMode('stats')" :class="btnClass('stats')">
        <i class="fa-solid fa-trophy w-5"></i> Top Canciones
      </button>
    </div>

    <div class="mt-auto text-center text-[10px] text-gray-500 opacity-50 pb-4">
      Propiedad de <strong>whustaf</strong>
    </div>
  </aside>
</template>

<script setup>
import { playerStore } from '../store/playerStore.js';

const changeMode = (mode) => {
  playerStore.currentMode = mode;
  playerStore.isMobileMenuOpen = false; // Cerrar al elegir algo en móvil
};

const btnClass = (mode) => [
  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold text-sm',
  playerStore.currentMode === mode ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20' : 'text-gray-400 hover:text-white hover:bg-white/5'
];
</script>