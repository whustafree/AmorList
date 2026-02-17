// public/state.js
// Aquí guardamos el estado compartido entre el reproductor y el control de TV

export const state = {
    fullLibraryData: [],
    currentMode: 'audio',
    favoriteIds: JSON.parse(localStorage.getItem('koteifyLikes')) || [],
    historyList: JSON.parse(localStorage.getItem('koteifyHistory')) || [],
    currentPlaylist: [],
    originalPlaylist: [],
    currentIndex: 0,
    isVideoPlaying: false,
    isDragging: false,
    isShuffle: false,
    repeatMode: 0,
    isCassetteMode: false,
    isVisualizerActive: false,
    queueList: [],
    customPlaylists: [],
    currentAlbumData: null,
    
    // Elementos DOM Globales
    audioEl: new Audio(),
    videoEl: document.getElementById('hero-video'),
    heroImgBox: document.getElementById('hero-img-box')
};

// Configuración inicial del audio
state.audioEl.crossOrigin = "anonymous";
state.audioEl.preload = "auto";