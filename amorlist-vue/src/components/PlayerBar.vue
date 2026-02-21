<template>
  <div class="h-24 bg-black/80 backdrop-blur-xl border-t border-white/10 flex items-center justify-between px-6 fixed bottom-0 left-0 right-0 z-50">
    
    <div class="flex items-center gap-4 w-1/3">
      <img src="https://placehold.co/56" alt="Cover" class="w-14 h-14 rounded-md object-cover shadow-lg">
      <div class="flex flex-col">
        <span class="font-bold text-sm text-white">AmorList</span>
        <span class="text-xs text-gray-400">Selecciona algo bonito ❤️</span>
      </div>
      <button class="text-gray-400 hover:text-pink-500 ml-4 transition-colors">
        <i class="fa-regular fa-heart"></i>
      </button>
    </div>

    <div class="flex flex-col items-center w-1/3">
      <div class="flex items-center gap-6 mb-2">
        <button class="text-gray-400 hover:text-white"><i class="fa-solid fa-shuffle"></i></button>
        <button class="text-gray-400 hover:text-white text-xl"><i class="fa-solid fa-backward-step"></i></button>
        
        <button class="w-10 h-10 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform">
          <i class="fa-solid fa-play ml-1"></i>
        </button>
        
        <button class="text-gray-400 hover:text-white text-xl"><i class="fa-solid fa-forward-step"></i></button>
        <button class="text-gray-400 hover:text-white"><i class="fa-solid fa-repeat"></i></button>
      </div>
      <div class="flex items-center gap-2 w-full max-w-md text-xs text-gray-400">
        <span>0:00</span>
        <div class="flex-1 h-1.5 bg-gray-600 rounded-full cursor-pointer hover:h-2 transition-all">
          <div class="w-0 h-full bg-pink-500 rounded-full relative">
            <div class="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 hover:opacity-100"></div>
          </div>
        </div>
        <span>0:00</span>
      </div>
    </div>

    <div class="flex items-center justify-end gap-4 w-1/3 text-gray-400">
      <button class="hover:text-white"><i class="fa-solid fa-wave-square"></i></button>
      <button class="hover:text-white"><i class="fa-solid fa-compact-disc"></i></button>
      <div class="flex items-center gap-2 ml-4">
        <i class="fa-solid fa-volume-high text-xs"></i>
        <input type="range" class="w-24 h-1.5 bg-gray-600 rounded-full appearance-none accent-pink-500 cursor-pointer">
      </div>
    </div>

  </div>
</template>

<script setup>
import { playerStore } from '../store/playerStore.js';
// Más adelante conectaremos los botones de play/pausa con las funciones de tu script original
</script>