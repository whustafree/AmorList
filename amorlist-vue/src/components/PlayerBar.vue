<template>
  <div class="h-20 lg:h-24 bg-black/90 backdrop-blur-2xl border-t border-white/10 flex items-center justify-between px-4 lg:px-6 fixed bottom-0 left-0 right-0 z-50">
    
    <div class="hidden sm:flex items-center gap-3 w-1/4 lg:w-1/3">
      <img :src="coverSrc" alt="Cover" class="w-10 h-10 lg:w-14 lg:h-14 rounded-md object-cover shadow-lg shrink-0">
      <div class="flex flex-col truncate">
        <span class="font-bold text-xs lg:text-sm text-white truncate">{{ title }}</span>
        <span class="text-[10px] lg:text-xs text-gray-400 truncate">{{ artist }}</span>
      </div>
    </div>

    <div class="flex flex-col items-center flex-1 sm:w-2/4 lg:w-1/3 px-2">
      <div class="flex items-center gap-4 lg:gap-6 mb-1 lg:mb-2">
        <button @click="playerStore.prevTrack()" class="text-gray-400 hover:text-white text-lg lg:text-xl">
          <i class="fa-solid fa-backward-step"></i>
        </button>
        
        <button @click="playerStore.togglePlay()" class="w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform shadow-lg">
          <i :class="['fa-solid ml-0.5 text-sm lg:text-base', playerStore.isPlaying ? 'fa-pause' : 'fa-play']"></i>
        </button>
        
        <button @click="playerStore.nextTrack()" class="text-gray-400 hover:text-white text-lg lg:text-xl">
          <i class="fa-solid fa-forward-step"></i>
        </button>
      </div>
      
      <div class="flex items-center gap-2 w-full max-w-xs lg:max-w-md text-[10px] text-gray-400 font-mono">
        <span class="w-8 text-right">{{ formatTime(currentTime) }}</span>
        <div class="flex-1 h-1 bg-gray-600 rounded-full cursor-pointer relative group" @click="handleSeek">
          <div class="absolute left-0 top-0 h-full bg-pink-500 rounded-full" :style="{ width: progressPercent + '%' }"></div>
        </div>
        <span class="w-8">{{ formatTime(duration) }}</span>
      </div>
    </div>

    <div class="flex items-center justify-end gap-3 w-1/4 lg:w-1/3 text-gray-400">
      <button @click="playerStore.isVisualizerActive = !playerStore.isVisualizerActive" :class="playerStore.isVisualizerActive ? 'text-pink-500' : ''">
        <i class="fa-solid fa-wave-square"></i>
      </button>
      
      <div class="hidden lg:flex items-center gap-2 ml-2">
        <i class="fa-solid fa-volume-high text-xs"></i>
        <input type="range" min="0" max="1" step="0.01" v-model="volume" @input="updateVolume" class="w-20 h-1 bg-gray-600 rounded-full appearance-none accent-pink-500 cursor-pointer">
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { playerStore } from '../store/playerStore.js';

const currentTrack = computed(() => playerStore.currentPlaylist[playerStore.currentIndex] || null);
const coverSrc = computed(() => currentTrack.value?.cover || 'https://placehold.co/56');
const title = computed(() => currentTrack.value?.title || 'AmorList');
const artist = computed(() => currentTrack.value?.artist || 'Selecciona algo bonito ❤️');

const currentTime = ref(0);
const duration = ref(0);
const volume = ref(1);

const progressPercent = computed(() => duration.value ? (currentTime.value / duration.value) * 100 : 0);

const formatTime = (secs) => {
  if (!secs || isNaN(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' + s : s}`;
};

const handleSeek = (e) => {
  if (!duration.value) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const pos = (e.clientX - rect.left) / rect.width;
  playerStore.audioEl.currentTime = pos * duration.value;
};

const updateVolume = () => playerStore.setVolume(volume.value);

onMounted(() => {
  playerStore.audioEl.addEventListener('timeupdate', () => {
    currentTime.value = playerStore.audioEl.currentTime;
    duration.value = playerStore.audioEl.duration || 0;
  });
});
</script>