import { reactive } from 'vue';

export const playerStore = reactive({
  audioEl: new Audio(),
  videoEl: document.createElement('video'),
  
  fullLibraryData: [],
  currentAlbumData: null,
  currentPlaylist: [],
  originalPlaylist: [],
  queueList: [],
  
  historyList: JSON.parse(localStorage.getItem('koteifyHistory')) || [],
  customPlaylists: JSON.parse(localStorage.getItem('koteifyPlaylists')) || [],
  favoriteIds: JSON.parse(localStorage.getItem('koteifyLikes')) || [],
  
  currentIndex: 0,
  isPlaying: false,
  isVideoPlaying: false,
  isShuffle: false,
  repeatMode: 0, 
  currentMode: 'audio', 
  searchQuery: '', 
  
  isVisualizerActive: false,
  isCassetteMode: false,
  isQueueOpen: false,

  playTrack(playlist, index) {
    this.currentPlaylist = playlist;
    this.currentIndex = index;
    const track = this.currentPlaylist[this.currentIndex];
    
    if (!track) return;

    if (track.isVideo) {
      this.audioEl.pause();
      this.isVideoPlaying = true;
      this.isPlaying = true;
    } else {
      this.isVideoPlaying = false;
      this.audioEl.src = track.src;
      this.audioEl.play().catch(e => console.error("Play error:", e));
      this.isPlaying = true;
    }
    
    this.addToHistory(track);
  },

  togglePlay() {
    if (this.currentPlaylist.length === 0) return;
    if (this.isVideoPlaying) {
      this.isPlaying = !this.isPlaying;
    } else {
      if (this.audioEl.paused) {
        this.audioEl.play();
        this.isPlaying = true;
      } else {
        this.audioEl.pause();
        this.isPlaying = false;
      }
    }
  },

  nextTrack() {
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
    if (!this.isVideoPlaying && this.audioEl.currentTime > 3) {
      this.audioEl.currentTime = 0;
      return;
    }
    let prev = (this.currentIndex - 1 + this.currentPlaylist.length) % this.currentPlaylist.length;
    this.playTrack(this.currentPlaylist, prev);
  },

  setVolume(value) {
    this.audioEl.volume = value;
  },

  addToQueue(track) { this.queueList.push(track); },
  playFromQueue(index) {
    const song = this.queueList.splice(index, 1)[0];
    if (this.currentPlaylist.length === 0) {
      this.playTrack([song], 0);
    } else {
      const newList = [...this.currentPlaylist];
      newList.splice(this.currentIndex + 1, 0, song);
      this.playTrack(newList, this.currentIndex + 1);
    }
  },
  removeFromQueue(index) { this.queueList.splice(index, 1); },
  clearQueue() { this.queueList = []; },

  addToHistory(track) {
    if (this.historyList.length > 0 && this.historyList[this.historyList.length - 1].id === track.id) return;
    this.historyList.push(track);
    if (this.historyList.length > 50) this.historyList.shift();
    localStorage.setItem('koteifyHistory', JSON.stringify(this.historyList));
  },
  toggleFavorite(id) {
    if (this.favoriteIds.includes(id)) {
      this.favoriteIds = this.favoriteIds.filter(f => f !== id);
    } else {
      this.favoriteIds.push(id);
    }
    localStorage.setItem('koteifyLikes', JSON.stringify(this.favoriteIds));
  },
  isFavorite(id) { return this.favoriteIds.includes(id); },
  getFavoritesAlbum() {
    let allTracks = [];
    this.fullLibraryData.forEach(alb => allTracks.push(...alb.songs));
    const myFavs = allTracks.filter(t => this.favoriteIds.includes(t.id));
    return { name: "Tus Favoritos ❤️", cover: "https://placehold.co/600/ff69b4/ffffff?text=Favoritos", songs: myFavs };
  },
  getHistoryAlbum() {
    return { name: "Historial de Escucha 🕒", cover: "https://placehold.co/600/333333/ffffff?text=Historial", songs: [...this.historyList].reverse() };
  },

  // NUEVO: CARGAR TOP CANCIONES DESDE TU BACKEND
  async loadTopSongs() {
    this.currentAlbumData = { name: "Cargando Top...", cover: "https://placehold.co/600/ffd700/ffffff?text=Cargando...", songs: [] };
    try {
      const res = await fetch('/api/stats/top');
      const topSongs = await res.json();
      this.currentAlbumData = { 
        name: "Top Canciones 🏆", 
        cover: "https://placehold.co/600/ffd700/ffffff?text=Top+Hits", 
        songs: topSongs 
      };
    } catch (error) {
      console.error("Error cargando el top de canciones:", error);
      this.currentAlbumData = null;
      this.currentMode = 'audio';
    }
  }
});

playerStore.audioEl.addEventListener('ended', () => {
  if (playerStore.repeatMode === 2) {
    playerStore.audioEl.currentTime = 0;
    playerStore.audioEl.play();
  } else {
    playerStore.nextTrack();
  }
});