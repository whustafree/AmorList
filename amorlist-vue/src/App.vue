<template>
  <div class="min-h-screen bg-gray-900 text-white flex overflow-hidden font-sans">
    
    <Sidebar />

    <main class="flex-1 p-8 overflow-y-auto">
      <h1 class="text-3xl font-bold mb-6">Tu Colección</h1>
      <p class="text-gray-400">El modo actual es: {{ playerStore.currentMode }}</p>
    </main>
    
  </div>
</template>

<script setup>
// Importamos el componente y el estado
import Sidebar from './components/Sidebar.vue';
import { playerStore } from './store/playerStore.js';
</script>