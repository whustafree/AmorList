import { reactive } from 'vue';

export const playerStore = reactive({
  // Reproductores en segundo plano
  audioEl: new Audio(),
  videoEl: document.createElement('video'),
  
  // Listas de datos
  fullLibraryData: [],
  currentAlbumData: null,
  currentPlaylist: [],
  originalPlaylist: [],
  queueList: [],
  
  // Datos guardados en el navegador (Local)
  historyList: JSON.parse(localStorage.getItem('koteifyHistory')) || [],
  customPlaylists: JSON.parse(localStorage.getItem('koteifyPlaylists')) || [],
  favoriteIds: JSON.parse(localStorage.getItem('koteifyLikes')) || [],
  
  // Controles de estado
  currentIndex: 0,
  isPlaying: false,
  isVideoPlaying: false,
  isShuffle: false,
  repeatMode: 0, // 0: no, 1: todo, 2: uno
  currentMode: 'audio', // audio, video, fav, history
  
  // Opciones visuales
  isVisualizerActive: false,
  isCassetteMode: false,
});