<template>
  <div class="min-h-screen bg-gray-900 text-white flex overflow-hidden font-sans pb-24">
    
    <Sidebar />

    <main class="flex-1 p-8 overflow-y-auto">
      
      <GridView v-if="playerStore.currentMode === 'audio' || playerStore.currentMode === 'video'" />
      
      <div v-else class="text-gray-400 mt-10">
        Modo actual: <span class="text-pink-500 font-bold capitalize">{{ playerStore.currentMode }}</span>
        <br> (Esta vista la construiremos pronto)
      </div>

    </main>

    <PlayerBar />
    
  </div>
</template>

<script setup>
import Sidebar from './components/Sidebar.vue';
import PlayerBar from './components/PlayerBar.vue';
import GridView from './views/GridView.vue';
import { playerStore } from './store/playerStore.js';
</script>