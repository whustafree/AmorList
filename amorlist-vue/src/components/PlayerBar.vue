<template>
  <div class="h-[72px] bg-[#181818] border-t border-[#282828] flex items-center px-4 fixed bottom-0 left-0 right-0 z-50 select-none">

    <div class="flex items-center gap-3 w-[30%] min-w-[140px]">
      <img :src="coverSrc" class="w-12 h-12 rounded object-cover shadow-lg shrink-0"
           @error="e => e.target.src = 'https://placehold.co/48/181818/fff?text=♪'">
      <div class="flex flex-col truncate">
        <span class="font-normal text-sm text-white truncate hover:underline cursor-default leading-tight">{{ title }}</span>
        <span class="text-[11px] text-[#b3b3b3] truncate hover:underline hover:text-white">{{ artist }}</span>
      </div>
    </div>

    <div class="flex flex-col items-center justify-center flex-1 max-w-[722px] mx-4 gap-0.5">
      <div class="flex items-center gap-4">
        <button @click="playerStore.isShuffle = !playerStore.isShuffle"
          :class="['text-sm', playerStore.isShuffle ? 'text-[#1ed760]' : 'text-[#727272] hover:text-white']">
          <i class="fa-solid fa-shuffle text-xs"></i>
        </button>
        <button @click="playerStore.prevTrack()" class="text-[#727272] hover:text-white text-sm">
          <i class="fa-solid fa-backward-step"></i>
        </button>
        <button @click="playerStore.togglePlay()"
          class="w-8 h-8 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform">
          <i :class="['fa-solid ml-0.5 text-xs', playerStore.isPlaying ? 'fa-pause' : 'fa-play']"></i>
        </button>
        <button @click="playerStore.nextTrack()" class="text-[#727272] hover:text-white text-sm">
          <i class="fa-solid fa-forward-step"></i>
        </button>
        <button @click="playerStore.repeatMode = (playerStore.repeatMode + 1) % 3"
          :class="['text-sm relative', playerStore.repeatMode > 0 ? 'text-[#1ed760]' : 'text-[#727272] hover:text-white']">
          <i class="fa-solid fa-repeat text-xs"></i>
          <span v-if="playerStore.repeatMode === 2" class="absolute -top-1 -right-2 text-[8px] font-bold">1</span>
        </button>
      </div>
      <div class="flex items-center gap-2 w-full text-[11px] text-[#b3b3b3] font-mono tabular-nums">
        <span class="w-8 text-right">{{ formatTime(playerStore.currentTime) }}</span>
        <div class="flex-1 h-1 bg-[#535353] rounded-full cursor-pointer relative group"
             ref="seekBarRef"
             @mousedown="startSeekDrag"
             @touchstart.prevent="startSeekTouch">
          <div class="absolute left-0 top-0 h-full rounded-full transition-colors"
               :class="isDragging ? 'bg-[#1ed760]' : 'bg-white group-hover:bg-[#1ed760]'"
               :style="{ width: progressPercent + '%' }">
            <div class="absolute right-[-5px] top-[-4px] w-[10px] h-[10px] rounded-full shadow"
                 :class="isDragging ? 'bg-[#1ed760] scale-100' : 'bg-white opacity-0 group-hover:opacity-100'"></div>
          </div>
        </div>
        <span class="w-8">{{ formatTime(playerStore.duration) }}</span>
      </div>
    </div>

    <div class="flex items-center justify-end gap-2 w-[30%] min-w-[140px]">
      <button @click="playerStore.isQueueOpen = !playerStore.isQueueOpen"
        :class="['text-sm', playerStore.isQueueOpen ? 'text-[#1ed760]' : 'text-[#727272] hover:text-white']">
        <i class="fa-solid fa-list-ul"></i>
      </button>
      <button @click="playerStore.isVisualizerActive = !playerStore.isVisualizerActive"
        :class="['text-sm', playerStore.isVisualizerActive ? 'text-[#1ed760]' : 'text-[#727272] hover:text-white']">
        <i class="fa-solid fa-chart-simple"></i>
      </button>
      <div class="flex items-center gap-1.5">
        <button @click="toggleMute" class="text-[#727272] hover:text-white text-xs">
          <i :class="volumeIcon"></i>
        </button>
        <input type="range" min="0" max="1" step="0.01" v-model="volume" @input="updateVolume"
          class="w-20 h-1 bg-[#535353] rounded-full appearance-none cursor-pointer accent-[#1ed760]">
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { playerStore, getAudio } from '../store/playerStore.js'
import { api } from '../utils/api.js'

const currentTrack = computed(() => playerStore.currentPlaylist[playerStore.currentIndex] || null)
const coverSrc = computed(() => {
  const t = currentTrack.value
  return t?.cover ? api.resolveUrl(t.cover) : 'https://placehold.co/48/181818/fff?text=♪'
})
const title = computed(() => currentTrack.value?.title || 'AmorList')
const artist = computed(() => currentTrack.value?.artist || '')

const volume = ref(1)
const prevVolume = ref(1)
const isDragging = ref(false)
const seekBarRef = ref(null)

const progressPercent = computed(() => {
  const d = playerStore.duration
  return d > 0 ? (playerStore.currentTime / d) * 100 : 0
})

const volumeIcon = computed(() => {
  if (volume.value === 0) return 'fa-solid fa-volume-xmark'
  if (volume.value < 0.3) return 'fa-solid fa-volume-off'
  if (volume.value < 0.7) return 'fa-solid fa-volume-low'
  return 'fa-solid fa-volume-high'
})

const formatTime = (secs) => {
  if (!secs || !isFinite(secs)) return '0:00'
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s < 10 ? '0' + s : s}`
}

const toggleMute = () => {
  if (volume.value > 0) {
    prevVolume.value = volume.value
    volume.value = 0
  } else {
    volume.value = prevVolume.value || 0.5
  }
  updateVolume()
}

const updateVolume = () => {
  const audio = getAudio()
  if (audio) audio.volume = volume.value
}

const seekFromClientX = (clientX) => {
  if (!seekBarRef.value || !playerStore.duration) return
  const rect = seekBarRef.value.getBoundingClientRect()
  const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  playerStore.seekTo(pos)
}

const startSeekDrag = (e) => {
  isDragging.value = true
  seekFromClientX(e.clientX)
  document.addEventListener('mousemove', onSeekDrag)
  document.addEventListener('mouseup', stopSeekDrag)
}

const startSeekTouch = (e) => {
  isDragging.value = true
  seekFromClientX(e.touches[0].clientX)
  document.addEventListener('touchmove', onSeekTouch, { passive: false })
  document.addEventListener('touchend', stopSeekTouch)
}

const onSeekDrag = (e) => seekFromClientX(e.clientX)
const onSeekTouch = (e) => { e.preventDefault(); seekFromClientX(e.touches[0].clientX) }

const stopSeekDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onSeekDrag)
  document.removeEventListener('mouseup', stopSeekDrag)
}

const stopSeekTouch = () => {
  isDragging.value = false
  document.removeEventListener('touchmove', onSeekTouch)
  document.removeEventListener('touchend', stopSeekTouch)
}
</script>
