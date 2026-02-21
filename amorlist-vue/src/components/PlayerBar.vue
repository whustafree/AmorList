<template>
  <div class="h-24 bg-black/80 backdrop-blur-xl border-t border-white/10 flex items-center justify-between px-6 fixed bottom-0 left-0 right-0 z-50">
    
    <div class="flex items-center gap-4 w-1/3">
      <img :src="coverSrc" alt="Cover" class="w-14 h-14 rounded-md object-cover shadow-lg">
      <div class="flex flex-col truncate pr-4">
        <span class="font-bold text-sm text-white truncate">{{ title }}</span>
        <span class="text-xs text-gray-400 truncate">{{ artist }}</span>
      </div>
      <button v-if="currentTrack" @click="playerStore.toggleFavorite(currentTrack.id)" :class="['ml-2 transition-colors text-lg', playerStore.isFavorite(currentTrack.id) ? 'text-pink-500' : 'text-gray-400 hover:text-pink-500']">
        <i :class="playerStore.isFavorite(currentTrack.id) ? 'fa-solid fa-heart' : 'fa-regular fa-heart'"></i>
      </button>
    </div>

    <div class="flex flex-col items-center w-1/3">
      <div class="flex items-center gap-6 mb-2">
        <button class="text-gray-400 hover:text-white"><i class="fa-solid fa-shuffle"></i></button>
        
        <button @click="playerStore.prevTrack()" class="text-gray-400 hover:text-white text-xl transition-transform hover:scale-110">
          <i class="fa-solid fa-backward-step"></i>
        </button>
        
        <button @click="playerStore.togglePlay()" class="w-10 h-10 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 transition-transform shadow-lg">
          <i :class="['fa-solid ml-0.5', playerStore.isPlaying ? 'fa-pause' : 'fa-play']"></i>
        </button>
        
        <button @click="playerStore.nextTrack()" class="text-gray-400 hover:text-white text-xl transition-transform hover:scale-110">
          <i class="fa-solid fa-forward-step"></i>
        </button>
        
        <button class="text-gray-400 hover:text-white"><i class="fa-solid fa-repeat"></i></button>
      </div>
      
      <div class="flex items-center gap-3 w-full max-w-md text-xs text-gray-400 font-mono">
        <span>{{ formatTime(currentTime) }}</span>
        
        <div class="flex-1 h-1.5 bg-gray-600 rounded-full cursor-pointer relative group" @click="handleSeek">
          <div class="absolute left-0 top-0 h-full bg-pink-500 rounded-full" :style="{ width: progressPercent + '%' }"></div>
          <div class="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" :style="{ left: progressPercent + '%', transform: 'translate(-50%, -50%)' }"></div>
        </div>
        
        <span>{{ formatTime(duration) }}</span>
      </div>
    </div>

    <div class="flex items-center justify-end gap-4 w-1/3 text-gray-400">
      
      <button 
        @click="playerStore.isVisualizerActive = !playerStore.isVisualizerActive" 
        :class="['transition-colors hover:text-white', playerStore.isVisualizerActive ? 'text-pink-500 drop-shadow-[0_0_5px_rgba(236,72,153,0.8)]' : '']" 
        title="Visualizador">
        <i class="fa-solid fa-wave-square"></i>
      </button>
      
      <button 
        @click="playerStore.isCassetteMode = !playerStore.isCassetteMode" 
        :class="['transition-colors hover:text-white', playerStore.isCassetteMode ? 'text-pink-500 drop-shadow-[0_0_5px_rgba(236,72,153,0.8)]' : '']" 
        title="Modo Cassette">
        <i class="fa-solid fa-compact-disc"></i>
      </button>

      <div class="flex items-center gap-2 ml-4">
        <i class="fa-solid fa-volume-high text-xs"></i>
        <input type="range" min="0" max="1" step="0.01" v-model="volume" @input="updateVolume" class="w-24 h-1.5 bg-gray-600 rounded-full appearance-none accent-pink-500 cursor-pointer">
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

const progressPercent = computed(() => {
  if (!duration.value) return 0;
  return (currentTime.value / duration.value) * 100;
});

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

const updateVolume = () => {
  playerStore.setVolume(volume.value);
};

onMounted(() => {
  playerStore.audioEl.addEventListener('timeupdate', () => {
    currentTime.value = playerStore.audioEl.currentTime;
    duration.value = playerStore.audioEl.duration || 0;
  });
});
</script>