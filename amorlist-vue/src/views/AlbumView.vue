<template>
  <div class="fade-in">
    <!-- Gradient header -->
    <div class="relative -mx-4 lg:-mx-8 -mt-4 mb-6 px-4 lg:px-8 pt-16 pb-8"
         :style="{ background: `linear-gradient(180deg, ${headerColor} 0%, #121212 100%)` }">
      <button @click="goBack"
        class="text-[#b3b3b3] hover:text-white flex items-center gap-2 mb-6 text-sm font-medium">
        <i class="fa-solid fa-chevron-left"></i> Volver
      </button>
      <div class="flex flex-col md:flex-row gap-6 items-center md:items-end">
        <div class="w-48 h-48 lg:w-56 lg:h-56 overflow-hidden shadow-2xl shrink-0 rounded-md"
             :class="playerStore.isCassetteMode ? 'rounded-full animate-spin' : ''">
          <img :src="api.resolveUrl(album.cover)" :alt="album.name"
            class="w-full h-full object-cover" @error="e => e.target.src = 'https://placehold.co/224/282828/fff?text=♪'">
        </div>
        <div class="flex flex-col gap-2 text-center md:text-left">
          <span class="text-[11px] font-bold text-[#b3b3b3] tracking-widest uppercase">Álbum</span>
          <h1 class="text-3xl lg:text-5xl font-black text-white leading-tight">{{ album.name }}</h1>
          <p class="text-sm text-[#b3b3b3]">{{ album.songs.length }} canciones</p>
          <div class="flex justify-center md:justify-start gap-3 mt-3">
            <button @click="playAll"
              class="bg-[#1ed760] hover:bg-[#1fdf64] text-black px-8 py-2.5 rounded-full font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-[#1ed760]/30">
              <i class="fa-solid fa-play"></i> Reproducir
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Track list -->
    <div class="px-0">
      <div v-for="(song, index) in album.songs" :key="song.id" tabindex="0"
        @click="playSong(index)" @keydown.enter="playSong(index)"
        :class="['flex items-center p-3 rounded-md transition-all group cursor-pointer hover:bg-[#282828] focus:outline-none focus:bg-[#282828]',
          isCurrentSong(song) ? 'bg-[#282828]' : '']">
        <div class="w-8 text-center text-sm text-[#727272] shrink-0">
          <i v-if="isCurrentSong(song) && playerStore.isPlaying" class="fa-solid fa-volume-high text-[#1ed760] text-xs animate-pulse"></i>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <div class="flex-1 px-3 truncate">
          <div :class="['text-sm truncate', isCurrentSong(song) ? 'text-[#1ed760]' : 'text-white']">{{ song.title }}</div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <button @click.stop="playerStore.addToQueue(song)"
            class="text-[#727272] hover:text-white p-1.5 opacity-0 group-hover:opacity-100 transition-all">
            <i class="fa-solid fa-plus text-xs"></i>
          </button>
          <button @click.stop="playerStore.toggleFavorite(song.id)"
            :class="['p-1.5 transition-all', playerStore.isFavorite(song.id) ? 'text-[#1ed760]' : 'text-[#727272] hover:text-white']">
            <i :class="playerStore.isFavorite(song.id) ? 'fa-solid fa-heart' : 'fa-regular fa-heart'"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { playerStore } from '../store/playerStore.js'
import { api } from '../utils/api.js'

const album = computed(() => playerStore.currentAlbumData)
const goBack = () => { playerStore.currentAlbumData = null }

const headerColor = computed(() => {
  const colors = ['#503078', '#c81e50', '#1e64b4', '#149650', '#7a2878', '#b44020']
  return colors[playerStore.currentIndex % colors.length]
})

const playSong = (index) => playerStore.playTrack(album.value.songs, index)
const playAll = () => { if (album.value?.songs.length) playerStore.playTrack(album.value.songs, 0) }
const isCurrentSong = (song) => {
  const current = playerStore.currentPlaylist[playerStore.currentIndex]
  return current && current.id === song.id
}
</script>
