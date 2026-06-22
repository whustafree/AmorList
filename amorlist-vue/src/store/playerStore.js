import { reactive } from 'vue';
import { api } from '../utils/api.js';

// Elemento de audio en el DOM (se asigna desde App.vue)
let _audioEl = null;
let _initialized = false;

/** Inicializa el elemento de audio (llamar desde App.vue onMounted) */
export function initAudio(el) {
  if (_initialized) return;
  _initialized = true;
  _audioEl = el;
  _audioEl.addEventListener('ended', () => {
    if (playerStore.repeatMode === 2) {
      _audioEl.currentTime = 0;
      _audioEl.play().catch(() => {});
    } else {
      playerStore.nextTrack();
    }
  });
  _audioEl.addEventListener('error', () => {
    console.error('🔇 Error de audio:', _audioEl.error?.message);
    playerStore.isPlaying = false;
    playerStore.audioError = true;
  });
}

function getAudio() {
  if (!_audioEl) {
    // Fallback: crear audio si no se inicializó (útil en desarrollo)
    _audioEl = new Audio();
    _audioEl.addEventListener('ended', () => {
      playerStore.nextTrack();
    });
  }
  return _audioEl;
}

export const playerStore = reactive({
  audioError: false,
  
  // Listas de datos
  fullLibraryData: [],
  currentAlbumData: null,
  currentPlaylist: [],
  originalPlaylist: [],
  queueList: [],
  
  // Datos persistentes en localStorage
  historyList: JSON.parse(localStorage.getItem('koteifyHistory')) || [],
  customPlaylists: JSON.parse(localStorage.getItem('koteifyPlaylists')) || [],
  favoriteIds: JSON.parse(localStorage.getItem('koteifyLikes')) || [],
  
  // Estado de la reproducción
  currentIndex: 0,
  isPlaying: false,
  isVideoPlaying: false,
  isShuffle: false,
  repeatMode: 0, 
  currentMode: 'audio', 
  searchQuery: '', 
  
  // Estado de la interfaz
  isVisualizerActive: false,
  isCassetteMode: false,
  isQueueOpen: false,
  isMobileMenuOpen: false, // Control para el menú en dispositivos móviles

  // ==========================================
  // FUNCIONES DE REPRODUCCIÓN
  // ==========================================
  playTrack(playlist, index) {
    this.currentPlaylist = playlist;
    this.currentIndex = index;
    const track = this.currentPlaylist[this.currentIndex];
    
    if (!track) return;
    this.audioError = false;
    if (track.isVideo) {
      const audio = getAudio();
      audio.pause();
      this.isVideoPlaying = true;
      this.isPlaying = true;
    } else {
      const audio = getAudio();
      this.isVideoPlaying = false;
      audio.src = api.resolveUrl(track.src);
      audio.load(); // Force load en Capacitor
      audio.play().catch(e => {
        console.error("🔇 Error al reproducir:", e);
        this.audioError = true;
        this.isPlaying = false;
      });
      this.isPlaying = true;
    }
    
    this.addToHistory(track);
  },

  togglePlay() {
    if (this.currentPlaylist.length === 0) return;
    
    if (this.isVideoPlaying) {
      this.isPlaying = !this.isPlaying;
    } else {
      const audio = getAudio();
      if (audio.paused) {
        audio.play().catch(e => {
          console.error('🔇 Error al reanudar:', e);
          this.audioError = true;
          this.isPlaying = false;
        });
        this.isPlaying = true;
      } else {
        audio.pause();
        this.isPlaying = false;
      }
    }
  },

  nextTrack() {
    // Si hay canciones en la cola, tienen prioridad
    if (this.queueList.length > 0) {
      const nextSong = this.queueList.shift();
      const newList = [...this.currentPlaylist];
      newList.splice(this.currentIndex + 1, 0, nextSong);
      this.playTrack(newList, this.currentIndex + 1);
      return;
    }

    if (this.currentPlaylist.length === 0) return;
    let next = (this.currentIndex + 1) % this.currentPlaylist.length;
    this.playTrack(this.currentPlaylist, next);
  },

  prevTrack() {
    if (this.currentPlaylist.length === 0) return;
    
    const audio = getAudio();
    if (!this.isVideoPlaying && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    
    let prev = (this.currentIndex - 1 + this.currentPlaylist.length) % this.currentPlaylist.length;
    this.playTrack(this.currentPlaylist, prev);
  },

  setVolume(value) {
    getAudio().volume = value;
  },

  // ==========================================
  // COLA Y FAVORITOS
  // ==========================================
  addToQueue(track) {
    this.queueList.push(track);
  },
  
  playFromQueue(index) {
    const song = this.queueList.splice(index, 1)[0];
    const newList = [...this.currentPlaylist];
    newList.splice(this.currentIndex + 1, 0, song);
    this.playTrack(newList, this.currentIndex + 1);
  },

  removeFromQueue(index) {
    this.queueList.splice(index, 1);
  },

  clearQueue() {
    this.queueList = [];
  },

  toggleFavorite(id) {
    if (this.favoriteIds.includes(id)) {
      this.favoriteIds = this.favoriteIds.filter(f => f !== id);
    } else {
      this.favoriteIds.push(id);
    }
    localStorage.setItem('koteifyLikes', JSON.stringify(this.favoriteIds));
  },

  isFavorite(id) {
    return this.favoriteIds.includes(id);
  },

  // ==========================================
  // ÁLBUMES DINÁMICOS Y BACKEND
  // ==========================================
  addToHistory(track) {
    if (this.historyList.length > 0 && this.historyList[this.historyList.length - 1].id === track.id) return;
    this.historyList.push(track);
    if (this.historyList.length > 50) this.historyList.shift();
    localStorage.setItem('koteifyHistory', JSON.stringify(this.historyList));
  },

  getFavoritesAlbum() {
    let allTracks = [];
    this.fullLibraryData.forEach(alb => allTracks.push(...alb.songs));
    const myFavs = allTracks.filter(t => this.favoriteIds.includes(t.id));
    return { 
      name: "Tus Favoritos ❤️", 
      cover: "https://placehold.co/600/ff69b4/ffffff?text=Favoritos", 
      songs: myFavs 
    };
  },

  getHistoryAlbum() {
    return { 
      name: "Historial de Escucha 🕒", 
      cover: "https://placehold.co/600/333333/ffffff?text=Historial", 
      songs: [...this.historyList].reverse() 
    };
  },

  async loadTopSongs() {
    this.currentAlbumData = { 
      name: "Cargando Top...", 
      cover: "https://placehold.co/600/ffd700/ffffff?text=Cargando...", 
      songs: [] 
    };
    try {
      const topSongs = await api.get('/api/stats/top');
      this.currentAlbumData = { 
        name: "Top Canciones 🏆", 
        cover: "https://placehold.co/600/ffd700/ffffff?text=Top+Hits", 
        songs: topSongs 
      };
    } catch (e) {
      console.error("Error al cargar estadísticas:", e);
      this.currentAlbumData = null;
      this.currentMode = 'audio';
    }
  }
});