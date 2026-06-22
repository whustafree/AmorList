<template>
  <div :class="['h-[100dvh] w-full bg-gray-900 text-white flex overflow-hidden font-sans relative', device.cssClass, playerStore.isVideoPlaying ? '' : 'pb-20 lg:pb-24']">
    
    <!-- Badge offline -->
    <Transition name="badge-slide">
      <div v-if="!isOnline" class="fixed top-2 left-1/2 -translate-x-1/2 z-[200] bg-yellow-500/90 text-black text-[10px] lg:text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-sm whitespace-nowrap">
        <i class="fa-solid fa-wifi-slash"></i>
        <span>Sin conexión</span>
        <span class="opacity-60 hidden sm:inline">— datos en caché</span>
      </div>
    </Transition>
    
    <!-- Elemento de audio invisible en el DOM (requerido para Capacitor) -->
    <audio ref="audioRef" preload="auto" crossorigin="anonymous"></audio>
    
    <!-- Badge error de audio -->
    <Transition name="badge-slide">
      <div v-if="playerStore.audioError" class="fixed top-2 left-1/2 -translate-x-1/2 z-[200] bg-red-500/90 text-white text-[10px] lg:text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-sm whitespace-nowrap">
        <i class="fa-solid fa-circle-exclamation"></i>
        <span>Error al reproducir</span>
      </div>
    </Transition>
    
    <Visualizer />
    
    <Sidebar />

    <main ref="mainContent" class="flex-1 p-4 lg:p-8 overflow-y-auto relative z-10 w-full" @touchstart="onTouchStart" @touchmove="onTouchMove" @touchend="onTouchEnd">
      <TopBar />
      
      <div class="max-w-7xl mx-auto">
        <AlbumView v-if="playerStore.currentAlbumData" />
        <GridView v-else-if="playerStore.currentMode === 'audio' || playerStore.currentMode === 'video'" />
        
        <div v-else class="text-center py-20 text-gray-500">
          <i class="fa-solid fa-layer-group text-4xl mb-4 block"></i>
          Modo <span class="text-pink-500 font-bold capitalize">{{ playerStore.currentMode }}</span> en construcción
        </div>
      </div>
    </main>

    <QueuePanel class="z-[60]" />
    <PlayerBar v-show="!playerStore.isVideoPlaying" class="z-50" />
    
    <!-- Video player overlay -->
    <div v-if="playerStore.isVideoPlaying" class="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in">
      <div class="p-4 flex justify-between items-center bg-gradient-to-b from-black/90 to-transparent absolute top-0 left-0 right-0 z-[101]">
        <button @click="closeVideo" class="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-white text-sm flex items-center gap-2 font-bold backdrop-blur-md">
          <i class="fa-solid fa-chevron-left"></i> Volver
        </button>
        <div class="font-bold text-sm lg:text-xl truncate px-4">{{ currentTrack?.title }}</div>
        <div class="w-10"></div>
      </div>
      <video 
        :src="currentTrack?.streamUrl" 
        controls 
        autoplay 
        class="w-full h-full object-contain"
        @ended="playerStore.nextTrack()"
      ></video>
    </div>

    <!-- Toast de cambio de canción (feedback táctil) -->
    <Transition name="toast-fade">
      <div v-if="toastMessage" class="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-white/10 text-white text-xs px-4 py-2 rounded-full backdrop-blur-md shadow-lg">
        <i class="fa-solid fa-arrow-right mr-1.5 text-pink-400"></i>
        {{ toastMessage }}
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { onMounted, onUnmounted, watch, computed, ref } from 'vue';
import Sidebar from './components/Sidebar.vue';
import PlayerBar from './components/PlayerBar.vue';
import TopBar from './components/TopBar.vue';
import GridView from './views/GridView.vue';
import AlbumView from './views/AlbumView.vue';
import QueuePanel from './components/QueuePanel.vue'; 
import Visualizer from './components/Visualizer.vue';
import { playerStore, initAudio } from './store/playerStore.js';
import { api } from './utils/api.js';
import { device } from './utils/device.js';
import { setupTVControls } from './utils/tv-input.js';

const audioRef = ref(null);

const currentTrack = computed(() => {
  const track = playerStore.currentPlaylist[playerStore.currentIndex];
  if (!track) return null;
  return { ...track, streamUrl: api.resolveUrl(track.src) };
});

const closeVideo = () => {
  playerStore.isVideoPlaying = false;
  playerStore.isPlaying = false;
};

// ===== OFFLINE BADGE =====
const isOnline = ref(navigator.onLine);
function handleOnline() { isOnline.value = true; }
function handleOffline() { isOnline.value = false; }

// ===== TOAST =====
const toastMessage = ref('');
let toastTimeout = null;
function showToast(msg) {
  toastMessage.value = msg;
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => { toastMessage.value = ''; }, 2000);
}

// ===== GESTOS TÁCTILES =====
let touchStartX = 0;
let touchStartY = 0;

function onTouchStart(e) {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}

function onTouchMove(e) {
  // Prevenir scroll horizontal durante swipe fuerte
  if (!touchStartX) return;
  const dx = e.touches[0].clientX - touchStartX;
  if (Math.abs(dx) > 20) e.preventDefault();
}

function onTouchEnd(e) {
  if (!touchStartX) return;
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  
  const SWIPE_THRESHOLD = 60;
  
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
    if (dx > 0) {
      // Swipe derecha: abrir sidebar
      if (device.isMobile) {
        playerStore.isMobileMenuOpen = true;
        showToast('Menú abierto');
      }
    } else {
      // Swipe izquierda: siguiente modo (audio/video/fav/history/stats)
      const modes = ['audio', 'video', 'fav', 'history', 'stats'];
      const idx = modes.indexOf(playerStore.currentMode);
      if (idx < modes.length - 1) {
        playerStore.currentMode = modes[idx + 1];
        showToast(modes[idx + 1]);
      }
    }
  }
  
  touchStartX = 0;
  touchStartY = 0;
}

// ===== WATCHERS =====
watch(() => playerStore.currentMode, (newMode) => {
  playerStore.searchQuery = ''; 
  if (['audio', 'video'].includes(newMode)) {
    playerStore.currentAlbumData = null; 
  } else if (newMode === 'fav') {
    playerStore.currentAlbumData = playerStore.getFavoritesAlbum();
  } else if (newMode === 'history') {
    playerStore.currentAlbumData = playerStore.getHistoryAlbum();
  } else if (newMode === 'stats') {
    playerStore.loadTopSongs();
  }
});

watch(() => playerStore.currentAlbumData, (newData) => {
  if (!newData && ['fav', 'history', 'stats'].includes(playerStore.currentMode)) {
    playerStore.currentMode = 'audio';
  }
});

// ===== LIFECYCLE =====
onMounted(() => { 
  setupTVControls();
  // Inicializar audio con el elemento del DOM
  if (audioRef.value) {
    initAudio(audioRef.value);
  }
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
});

onUnmounted(() => {
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
  if (toastTimeout) clearTimeout(toastTimeout);
});
</script>

<style>
.fade-in { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* SOLUCIÓN AL SCROLL INVISIBLE: Una barra de desplazamiento elegante color rosa */
.overflow-y-auto { 
  scrollbar-width: thin; 
  scrollbar-color: rgba(236, 72, 153, 0.5) transparent; 
}
.overflow-y-auto::-webkit-scrollbar { 
  width: 6px; 
}
.overflow-y-auto::-webkit-scrollbar-track { 
  background: transparent; 
}
.overflow-y-auto::-webkit-scrollbar-thumb { 
  background-color: rgba(236, 72, 153, 0.5); 
  border-radius: 10px; 
}
.overflow-y-auto::-webkit-scrollbar-thumb:hover { 
  background-color: rgba(236, 72, 153, 0.8); 
}

/* ===== MODO TV ===== */
.tv-mode button:focus-visible,
.tv-mode [tabindex]:focus-visible {
  outline: 3px solid #ec4899 !important;
  outline-offset: 4px;
  border-radius: 14px;
  box-shadow: 0 0 0 4px rgba(236, 72, 153, 0.3), 0 0 30px rgba(236, 72, 153, 0.25);
  transform: scale(1.05);
  transition: all 0.2s ease;
}

/* Grid más grande en TV (sin scale para evitar solapamiento) */
.tv-mode .grid {
  gap: 1.25rem;
}

.tv-mode .grid > div {
  padding: 1.25rem !important;
  border-radius: 16px;
  z-index: 1;
  position: relative;
}

.tv-mode .grid > div:focus-visible {
  z-index: 10;
}

.tv-mode .grid img {
  border-radius: 14px;
}

.tv-mode .grid h3 {
  font-size: 1rem !important;
}

/* Sin cursor en TV — navegación solo por foco */
.tv-mode * {
  cursor: default;
}

/* ===== MODO MÓVIL ===== */
.device-mobile button {
  min-height: 48px;
}

/* Mejor touch targets en móvil */
.device-mobile .grid > div {
  min-height: 100px;
}

/* ===== OFFLINE BADGE ANIMATION ===== */
.badge-slide-enter-active {
  animation: badgeIn 0.3s ease-out;
}
.badge-slide-leave-active {
  animation: badgeIn 0.3s ease-in reverse;
}
@keyframes badgeIn {
  from { opacity: 0; transform: translate(-50%, -10px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

/* ===== TOAST ANIMATION ===== */
.toast-fade-enter-active {
  animation: toastUp 0.25s ease-out;
}
.toast-fade-leave-active {
  animation: toastUp 0.25s ease-in reverse;
}
@keyframes toastUp {
  from { opacity: 0; transform: translate(-50%, 10px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

/* ===== TRANSICIÓN SUAVE AL CAMBIAR DE DISPOSITIVO ===== */
html {
  transition: font-size 0.2s ease;
}
</style>