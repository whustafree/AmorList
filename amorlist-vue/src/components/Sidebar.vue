<template>
  <Transition name="sidebar-overlay">
    <div v-if="playerStore.isMobileMenuOpen"
      class="fixed inset-0 bg-black/60 z-40 lg:hidden"
      @click="playerStore.isMobileMenuOpen = false"
    ></div>
  </Transition>

  <aside
    :class="[
      'fixed lg:relative z-50 w-60 lg:w-[220px] bg-[#000] lg:bg-transparent border-r border-[#282828] flex flex-col h-full transition-transform duration-300',
      playerStore.isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    ]"
  >
    <div class="p-5 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-gradient-to-br from-pink-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg">
          <span class="text-white font-black text-sm">A</span>
        </div>
        <span class="font-bold text-white text-sm tracking-tight">AmorList</span>
      </div>
      <button @click="playerStore.isMobileMenuOpen = false" class="lg:hidden text-[#727272] hover:text-white">
        <i class="fa-solid fa-xmark text-xl"></i>
      </button>
    </div>

    <div class="flex flex-col gap-1 px-3">
      <button @click="changeMode('audio')" :class="navBtnClass('audio')">
        <i class="fa-solid fa-house w-5 text-center"></i>
        <span>Inicio</span>
      </button>
      <button @click="changeMode('video')" :class="navBtnClass('video')">
        <i class="fa-solid fa-film w-5 text-center"></i>
        <span>Videos</span>
      </button>
    </div>

    <div class="mt-5 px-3">
      <div class="text-[11px] text-[#727272] font-bold tracking-widest uppercase mb-2 px-3">Tu Biblioteca</div>
      <div class="flex flex-col gap-1">
        <button @click="changeMode('fav')" :class="navBtnClass('fav')">
          <i class="fa-solid fa-heart w-5 text-center"></i>
          <span>Favoritos</span>
        </button>
        <button @click="changeMode('history')" :class="navBtnClass('history')">
          <i class="fa-solid fa-clock-rotate-left w-5 text-center"></i>
          <span>Historial</span>
        </button>
        <button @click="changeMode('stats')" :class="navBtnClass('stats')">
          <i class="fa-solid fa-chart-simple w-5 text-center"></i>
          <span>Top</span>
        </button>
      </div>
    </div>

    <div class="mt-auto p-5 text-center text-[10px] text-[#535353]">
      whustaf &middot; AmorList
    </div>
  </aside>
</template>

<script setup>
import { playerStore } from '../store/playerStore.js'

const changeMode = (mode) => {
  playerStore.currentMode = mode
  playerStore.isMobileMenuOpen = false
}

const navBtnClass = (mode) => [
  'flex items-center gap-3 px-3 py-2.5 rounded-md transition-all text-sm font-medium w-full',
  playerStore.currentMode === mode
    ? 'bg-[#282828] text-white'
    : 'text-[#727272] hover:text-white hover:bg-[#1a1a1a]'
]
</script>
