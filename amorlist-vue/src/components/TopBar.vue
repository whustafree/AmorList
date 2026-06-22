<template>
  <div class="flex items-center gap-4 mb-6">
    <button @click="playerStore.isMobileMenuOpen = true"
      class="lg:hidden w-9 h-9 flex items-center justify-center bg-[#282828] rounded-full text-white hover:bg-[#3a3a3a]">
      <i class="fa-solid fa-bars text-sm"></i>
    </button>
    <div class="relative flex-1 max-w-md">
      <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-[#727272] text-xs"></i>
      <input type="text" v-model="playerStore.searchQuery"
        placeholder="Buscar en tu biblioteca..."
        class="w-full bg-[#282828] border border-transparent focus:border-[#535353] rounded-full py-2 pl-9 pr-4 text-sm text-white placeholder-[#727272] focus:outline-none focus:bg-[#3a3a3a] transition-all">
    </div>
    <div class="flex gap-2 shrink-0">
      <button @click="refreshLibrary" :disabled="isRefreshing"
        class="w-9 h-9 rounded-full bg-[#282828] hover:bg-[#3a3a3a] flex items-center justify-center text-[#727272] hover:text-white disabled:opacity-50 transition-all"
        title="Actualizar biblioteca">
        <i :class="['fa-solid fa-rotate', isRefreshing ? 'fa-spin text-[#1ed760]' : '']"></i>
      </button>
      <button @click="playerStore.isQueueOpen = !playerStore.isQueueOpen"
        class="relative w-9 h-9 rounded-full bg-[#282828] hover:bg-[#3a3a3a] flex items-center justify-center text-[#727272] hover:text-white transition-all">
        <i class="fa-solid fa-layer-group text-xs"></i>
        <span v-if="playerStore.queueList.length > 0"
          class="absolute -top-0.5 -right-0.5 bg-[#1ed760] text-black text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{{ playerStore.queueList.length }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { playerStore } from '../store/playerStore.js'
import { api } from '../utils/api.js'
import { setCache, CACHE_KEYS } from '../utils/cache.js'

const isRefreshing = ref(false)

const refreshLibrary = async () => {
  if (isRefreshing.value) return
  isRefreshing.value = true
  try {
    const data = await api.get('/api/refresh')
    playerStore.fullLibraryData = data
    setCache(CACHE_KEYS.LIBRARY, data)
  } catch (error) {
    console.error(error)
  } finally {
    isRefreshing.value = false
  }
}
</script>
