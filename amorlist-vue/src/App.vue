<template>
  <div :class="['h-[100dvh] w-full bg-[#121212] text-white flex overflow-hidden relative', device.cssClass, playerStore.isVideoPlaying ? '' : 'pb-[72px]']">

    <!-- Dynamic gradient background -->
    <div class="fixed inset-0 z-0 pointer-events-none transition-opacity duration-1000"
         :style="{ background: gradientBg }"></div>

    <!-- Offline badge -->
    <Transition name="badge-slide">
      <div v-if="!isOnline"
        class="fixed top-2 left-1/2 -translate-x-1/2 z-[200] bg-[#282828]/90 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-md whitespace-nowrap border border-[#535353]/30">
        <i class="fa-solid fa-wifi-slash text-[#1ed760]"></i>
        <span>Sin conexión</span>
        <span class="opacity-60 hidden sm:inline">— modo offline</span>
      </div>
    </Transition>

    <audio ref="audioRef" preload="auto" crossorigin="anonymous"></audio>

    <!-- Audio error badge -->
    <Transition name="badge-slide">
      <div v-if="playerStore.audioError"
        class="fixed top-2 left-1/2 -translate-x-1/2 z-[200] bg-[#e91429]/90 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-md whitespace-nowrap">
        <i class="fa-solid fa-circle-exclamation"></i>
        <span>Error al reproducir</span>
      </div>
    </Transition>

    <Visualizer />
    <Sidebar />

    <main ref="mainContent"
      class="flex-1 overflow-y-auto relative z-10"
      @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
      <div class="px-3 sm:px-4 lg:px-8 pt-3 sm:pt-4 pb-8">
        <TopBar />
        <div class="max-w-7xl mx-auto">
          <AlbumView v-if="playerStore.currentAlbumData" />
          <GridView v-else-if="playerStore.currentMode === 'audio' || playerStore.currentMode === 'video'" />
          <div v-else class="text-center py-20 text-[#727272]">
            <i class="fa-solid fa-layer-group text-4xl mb-4 block"></i>
            <p>Modo <span class="text-white font-bold capitalize">{{ playerStore.currentMode }}</span></p>
          </div>
        </div>
      </div>
    </main>

    <QueuePanel class="z-[60]" />
    <PlayerBar v-show="!playerStore.isVideoPlaying" class="z-50" />

    <!-- Video player -->
    <div v-if="playerStore.isVideoPlaying" class="fixed inset-0 z-[100] bg-black flex flex-col">
      <div class="p-4 flex justify-between items-center bg-gradient-to-b from-black/90 to-transparent absolute top-0 left-0 right-0 z-[101]">
        <button @click="closeVideo"
          class="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-white text-sm flex items-center gap-2 font-medium backdrop-blur-md">
          <i class="fa-solid fa-chevron-left"></i> Volver
        </button>
        <div class="text-sm lg:text-base truncate px-4">{{ currentTrack?.title }}</div>
        <div class="w-10"></div>
      </div>
      <video :src="currentTrack?.streamUrl" controls autoplay
        class="w-full h-full object-contain"
        @ended="playerStore.nextTrack()"></video>
    </div>

    <!-- Toast -->
    <Transition name="toast-fade">
      <div v-if="toastMessage"
        class="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-[#282828]/90 text-white text-xs px-4 py-2 rounded-full backdrop-blur-md shadow-lg border border-[#535353]/30">
        <i class="fa-solid fa-arrow-right mr-1.5 text-[#1ed760]"></i>
        {{ toastMessage }}
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { onMounted, onUnmounted, watch, computed, ref } from 'vue'
import Sidebar from './components/Sidebar.vue'
import PlayerBar from './components/PlayerBar.vue'
import TopBar from './components/TopBar.vue'
import GridView from './views/GridView.vue'
import AlbumView from './views/AlbumView.vue'
import QueuePanel from './components/QueuePanel.vue'
import Visualizer from './components/Visualizer.vue'
import { playerStore, initAudio } from './store/playerStore.js'
import { api } from './utils/api.js'
import { device } from './utils/device.js'
import { setupTVControls } from './utils/tv-input.js'

const audioRef = ref(null)

const currentTrack = computed(() => {
  const track = playerStore.currentPlaylist[playerStore.currentIndex]
  if (!track) return null
  return { ...track, streamUrl: api.resolveUrl(track.src) }
})

const gradientBg = computed(() => {
  const t = currentTrack.value
  if (!t || !t.cover) return 'background: transparent'
  const gradients = [
    'linear-gradient(180deg, rgba(80,40,120,0.3) 0%, transparent 60%)',
    'linear-gradient(180deg, rgba(200,30,80,0.25) 0%, transparent 60%)',
    'linear-gradient(180deg, rgba(30,100,180,0.25) 0%, transparent 60%)',
    'linear-gradient(180deg, rgba(20,150,80,0.2) 0%, transparent 60%)',
  ]
  return gradients[playerStore.currentIndex % gradients.length]
})

const closeVideo = () => { playerStore.isVideoPlaying = false; playerStore.isPlaying = false }

const isOnline = ref(navigator.onLine)
const handleOnline = () => { isOnline.value = true }
const handleOffline = () => { isOnline.value = false }

const toastMessage = ref('')
let toastTimeout = null
function showToast(msg) {
  toastMessage.value = msg
  if (toastTimeout) clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => { toastMessage.value = '' }, 2000)
}

let touchStartX = 0, touchStartY = 0
function onTouchStart(e) { touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY }
function onTouchMove(e) {
  if (!touchStartX) return
  if (Math.abs(e.touches[0].clientX - touchStartX) > 20) e.preventDefault()
}
function onTouchEnd(e) {
  if (!touchStartX) return
  const dx = e.changedTouches[0].clientX - touchStartX
  const dy = e.changedTouches[0].clientY - touchStartY
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
    if (dx > 0) {
      if (device.isMobile) { playerStore.isMobileMenuOpen = true; showToast('Menú abierto') }
    } else {
      const modes = ['audio', 'video', 'fav', 'history', 'stats']
      const idx = modes.indexOf(playerStore.currentMode)
      if (idx < modes.length - 1) { playerStore.currentMode = modes[idx + 1]; showToast(modes[idx + 1]) }
    }
  }
  touchStartX = 0; touchStartY = 0
}

watch(() => playerStore.currentMode, (m) => {
  playerStore.searchQuery = ''
  if (['audio', 'video'].includes(m)) { playerStore.currentAlbumData = null }
  else if (m === 'fav') { playerStore.currentAlbumData = playerStore.getFavoritesAlbum() }
  else if (m === 'history') { playerStore.currentAlbumData = playerStore.getHistoryAlbum() }
  else if (m === 'stats') { playerStore.loadTopSongs() }
})
watch(() => playerStore.currentAlbumData, (d) => {
  if (!d && ['fav', 'history', 'stats'].includes(playerStore.currentMode)) playerStore.currentMode = 'audio'
})

onMounted(() => {
  setupTVControls()
  if (audioRef.value) initAudio(audioRef.value)
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
})
onUnmounted(() => {
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
  if (toastTimeout) clearTimeout(toastTimeout)
})
</script>

<style>
::-webkit-scrollbar { width: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }

.fade-in { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.badge-slide-enter-active { animation: badgeIn 0.3s ease-out; }
.badge-slide-leave-active { animation: badgeIn 0.3s ease-in reverse; }
@keyframes badgeIn { from { opacity: 0; transform: translate(-50%, -10px); } to { opacity: 1; transform: translate(-50%, 0); } }

.toast-fade-enter-active { animation: toastUp 0.25s ease-out; }
.toast-fade-leave-active { animation: toastUp 0.25s ease-in reverse; }
@keyframes toastUp { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }

.tv-mode button:focus-visible, .tv-mode [tabindex]:focus-visible {
  outline: 3px solid #1ed760 !important;
  outline-offset: 4px; border-radius: 10px;
  box-shadow: 0 0 0 4px rgba(30,215,96,0.3);
}
.device-mobile button { min-height: 48px; }
</style>
