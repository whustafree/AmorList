/**
 * AmorList v2.0 - Frontend Mejorado
 * Reproductor de música/video con todas las mejoras premium
 */

// ==================== VARIABLES GLOBALES ====================
let fullLibraryData = [];
let currentMode = 'audio';
let favoriteIds = JSON.parse(localStorage.getItem('koteifyLikes')) || [];
let historyList = JSON.parse(localStorage.getItem('koteifyHistory')) || [];
let currentPlaylist = [];
let originalPlaylist = [];
let currentIndex = 0;
let isVideoPlaying = false;
let isDragging = false;

// Variables avanzadas
let isShuffle = false;
let repeatMode = 0;
let sleepTimer = null;
let isCassetteMode = false;
let isVisualizerActive = false;

// Cola de reproducción
let queueList = [];

// Playlists personalizadas
let customPlaylists = [];

// Audio Context para visualizador
let audioContext = null;
let analyser = null;
let source = null;

// Current album reference
let currentAlbumData = null;

// ==================== ELEMENTOS DOM ====================
const audioEl = new Audio();
audioEl.crossOrigin = "anonymous";
audioEl.preload = "auto";

const videoEl = document.getElementById('hero-video');
const heroImgBox = document.getElementById('hero-img-box');
const visualizerCanvas = document.getElementById('visualizer-canvas');
const ctx = visualizerCanvas ? visualizerCanvas.getContext('2d') : null;

// ==================== INICIALIZACIÓN ====================
window.onload = async () => {
    console.log('🎵 AmorList v2.0 Iniciando...');
    
    setGreeting();
    loadTheme();
    setupSearch();
    setupKeyboard();
    setupRemoteControl();
    setupMediaSession();
    setupServiceWorker();
    setupIntersectionObserver();
    setupProgressSlider();
    
    // Cargar datos
    await loadLibrary();
    await loadPlaylists();
    await loadTopPlayed();
    
    loadLastPosition();
    updateBadges();
    
    console.log('✅ AmorList listo!');
};

// ==================== SERVICE WORKER ====================
async function setupServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const reg = await navigator.serviceWorker.register('/sw.js');
            console.log('✅ Service Worker registrado:', reg.scope);
        } catch (e) {
            console.log('⚠️ Service Worker no disponible:', e.message);
        }
    }
}

// ==================== INTERSECTION OBSERVER (Lazy Loading) ====================
function setupIntersectionObserver() {
    if (!('IntersectionObserver' in window)) return;
    
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
                imageObserver.unobserve(img);
            }
        });
    }, { rootMargin: '50px' });
    
    window.lazyImageObserver = imageObserver;
}

// ==================== PROGRESS SLIDER STYLING ====================
function setupProgressSlider() {
    const seek = document.getElementById('seek-slider');
    if (seek) {
        seek.addEventListener('input', (e) => {
            const value = e.target.value;
            const max = e.target.max || 1;
            const percent = (value / max) * 100;
            e.target.style.background = `linear-gradient(to right, var(--accent) 0%, var(--accent) ${percent}%, var(--border) ${percent}%, var(--border) 100%)`;
        });
    }
    
    const vol = document.getElementById('vol-slider');
    if (vol) {
        vol.addEventListener('input', (e) => {
            const value = e.target.value;
            const percent = (value / 1) * 100;
            e.target.style.background = `linear-gradient(to right, var(--accent) 0%, var(--accent) ${percent}%, var(--border) ${percent}%, var(--border) 100%)`;
        });
    }
}

// ==================== TOAST NOTIFICATIONS ====================
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const icons = {
        success: 'fa-check-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle',
        error: 'fa-times-circle'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${icons[type]} toast-icon"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==================== REFRESCAR BIBLIOTECA ====================
async function refreshLibrary() {
    const icon = document.getElementById('refresh-icon');
    if (icon) icon.classList.add('fa-spin');
    
    // Mostrar skeleton
    showSkeletonLoader();
    
    try {
        console.log("🔄 Forzando actualización desde Drive...");
        const res = await fetch('/api/refresh');
        
        if (!res.ok) throw new Error('Error en la actualización');
        
        fullLibraryData = await res.json();
        renderGrid();
        showToast('¡Biblioteca actualizada!', 'success');
    } catch (e) {
        console.error("Error al actualizar:", e);
        showToast('Error al conectar con Drive', 'error');
    }
    
    if (icon) icon.classList.remove('fa-spin');
    hideSkeletonLoader();
}

// ==================== SKELETON LOADER ====================
function showSkeletonLoader() {
    const skeleton = document.getElementById('skeleton-container');
    const albums = document.getElementById('albums-container');
    if (skeleton) skeleton.style.display = 'grid';
    if (albums) albums.innerHTML = '';
}

function hideSkeletonLoader() {
    const skeleton = document.getElementById('skeleton-container');
    if (skeleton) skeleton.style.display = 'none';
}

// ==================== COLOR AMBIENTAL ====================
function updateAmbientColor(str) {
    if (isVideoPlaying) return;
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    const hex = "#" + "00000".substring(0, 6 - c.length) + c;
    
    const bg = document.getElementById('dynamic-bg');
    if (bg) {
        bg.style.background = `radial-gradient(circle at 50% -20%, ${hex}66, var(--bg-main))`;
    }
}

// ==================== INTERFAZ ====================
function setGreeting() {
    const hour = new Date().getHours();
    const msgEl = document.getElementById('greeting-msg');
    
    let greeting = "Hola ❤️";
    if (hour >= 5 && hour < 12) greeting = "Buenos días, mi amor ☀️";
    else if (hour >= 12 && hour < 20) greeting = "Buenas tardes, preciosa 🌸";
    else greeting = "Buenas noches, descansa 🌙";
    
    if (msgEl) msgEl.innerText = greeting;
}

function toggleTheme() {
    const body = document.body;
    if (body.getAttribute('data-theme') === 'kawaii') {
        body.removeAttribute('data-theme');
        localStorage.setItem('koteifyTheme', 'dark');
        showToast('Tema oscuro activado', 'info');
    } else {
        body.setAttribute('data-theme', 'kawaii');
        localStorage.setItem('koteifyTheme', 'kawaii');
        showToast('Tema kawaii activado 🌸', 'info');
    }
}

function loadTheme() {
    if (localStorage.getItem('koteifyTheme') === 'kawaii') {
        document.body.setAttribute('data-theme', 'kawaii');
    }
}

// ==================== BÚSQUEDA CON DEBOUNCE ====================
let searchTimeout;
function setupSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;
    
    input.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const term = e.target.value.toLowerCase().trim();
            filterContent(term);
        }, 200);
    });
}

function filterContent(term) {
    const cards = document.querySelectorAll('.album-card');
    
    cards.forEach(card => {
        const title = card.querySelector('.album-title')?.innerText.toLowerCase() || '';
        card.style.display = title.includes(term) ? 'block' : 'none';
    });
}

// ==================== CARGA DE DATOS ====================
async function loadLibrary() {
    showSkeletonLoader();
    
    try {
        const res = await fetch('/api/albums');
        if (!res.ok) throw new Error('Error');
        fullLibraryData = await res.json();
        renderGrid();
    } catch (e) {
        console.error('Error cargando biblioteca:', e);
        const container = document.getElementById('albums-container');
        if (container) {
            container.innerHTML = '<p style="padding:20px; opacity:0.6;">Error al cargar. <button onclick="refreshLibrary()">Reintentar</button></p>';
        }
    }
    
    hideSkeletonLoader();
}

async function loadPlaylists() {
    try {
        const res = await fetch('/api/playlists');
        if (res.ok) {
            customPlaylists = await res.json();
        }
    } catch (e) {
        console.log('Usando playlists locales');
        customPlaylists = JSON.parse(localStorage.getItem('koteifyPlaylists')) || [];
    }
}

async function loadTopPlayed() {
    try {
        const res = await fetch('/api/stats/top');
        if (res.ok) {
            const topSongs = await res.json();
            renderTopPlayed(topSongs);
        }
    } catch (e) {
        console.log('Estadísticas no disponibles');
    }
}

function renderTopPlayed(songs) {
    if (!songs || songs.length === 0) return;
    
    const section = document.getElementById('top-played-section');
    const grid = document.getElementById('top-played-grid');
    
    if (!section || !grid) return;
    
    section.style.display = 'block';
    grid.innerHTML = '';
    
    songs.slice(0, 6).forEach((song, idx) => {
        const item = document.createElement('div');
        item.className = 'top-played-item';
        item.onclick = () => {
            // Encontrar el álbum y reproducir
            const album = fullLibraryData.find(a => a.songs.some(s => s.id === song.id));
            if (album) {
                openAlbum(album);
                setTimeout(() => {
                    const songIndex = album.songs.findIndex(s => s.id === song.id);
                    if (songIndex >= 0) playTrack(album.songs, songIndex);
                }, 300);
            }
        };
        
        item.innerHTML = `
            <img src="${song.cover}" alt="${song.title}">
            <div class="top-played-info">
                <div class="top-played-title">${song.title}</div>
                <div class="top-played-count">${song.playCount} reproducciones</div>
            </div>
        `;
        
        grid.appendChild(item);
    });
}

// ==================== SWITCH MODE ====================
function switchMode(mode) {
    currentMode = mode;
    
    // Actualizar botones activos
    const buttons = document.querySelectorAll('.nav-btn, .mob-btn');
    buttons.forEach(b => b.classList.remove('active'));
    
    const map = {
        'audio': ['btn-pc-audio', 'btn-mob-audio', 'Tu Música'],
        'video': ['btn-pc-video', 'btn-mob-video', 'Tus Videos'],
        'fav': ['btn-pc-fav', 'btn-mob-fav', 'Tus Favoritos ❤️'],
        'history': ['btn-pc-history', 'btn-mob-history', 'Recién Escuchado 🕒']
    };
    
    if (map[mode]) {
        map[mode].slice(0, 2).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('active');
        });
        
        const title = document.getElementById('page-title');
        if (title) title.innerText = map[mode][2];
    }

    if (mode !== 'fav' && mode !== 'history') showGrid();
    renderGrid();
}

// ==================== VISTAS ====================
function showGrid() {
    const gridView = document.getElementById('grid-view');
    const playlistView = document.getElementById('playlist-view');
    const playlistsView = document.getElementById('playlists-view');
    const heroImg = document.getElementById('hero-img');
    const monthly = document.getElementById('monthly-featured');
    const queuePanel = document.getElementById('queue-panel');
    
    if (gridView) {
        gridView.style.display = 'block';
        gridView.classList.add('fade-in');
    }
    if (playlistView) playlistView.style.display = 'none';
    if (playlistsView) playlistsView.style.display = 'none';
    if (queuePanel) queuePanel.style.display = 'none';
    if (monthly) monthly.style.display = currentMode === 'audio' ? 'block' : 'none';
    
    if (heroImgBox) heroImgBox.classList.remove('video-mode');
    
    // Resetear video
    if (videoEl) {
        videoEl.style.display = 'none';
        videoEl.pause();
    }
    
    if (heroImg) heroImg.style.display = 'block';
    
    // Mostrar barra audio
    const pb = document.getElementById('player-bar');
    if (pb) pb.style.display = 'flex';
}

function showPlaylistsView() {
    const gridView = document.getElementById('grid-view');
    const playlistView = document.getElementById('playlist-view');
    const playlistsView = document.getElementById('playlists-view');
    
    if (gridView) gridView.style.display = 'none';
    if (playlistView) playlistView.style.display = 'none';
    if (playlistsView) {
        playlistsView.style.display = 'block';
        playlistsView.classList.add('fade-in');
    }
    
    renderPlaylists();
}

// ==================== RENDER GRID ====================
function renderGrid() {
    const container = document.getElementById('albums-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    let albumsToRender = [];
    
    // Modo favoritos
    if (currentMode === 'fav') {
        let allTracks = [];
        if (fullLibraryData) {
            fullLibraryData.forEach(alb => allTracks.push(...alb.songs));
        }
        
        const myFavs = allTracks.filter(t => favoriteIds.includes(t.id));
        
        if (myFavs.length === 0) {
            showGrid();
            container.innerHTML = '<p style="opacity:0.6; padding:20px;">Sin favoritos aún. ¡Dale ❤️ a tus canciones!</p>';
            return;
        }
        
        document.getElementById('grid-view').style.display = 'none';
        document.getElementById('playlist-view').style.display = 'block';
        openAlbum({ name: "Mis Favoritos ❤️", cover: "https://placehold.co/600?text=Favoritos", songs: myFavs }, true);
        return;
    }
    
    // Modo historial
    if (currentMode === 'history') {
        if (historyList.length === 0) {
            showGrid();
            container.innerHTML = '<p style="opacity:0.6; padding:20px;">Historial vacío. ¡Escucha algo!</p>';
            return;
        }
        
        document.getElementById('grid-view').style.display = 'none';
        document.getElementById('playlist-view').style.display = 'block';
        openAlbum({ name: "Historial", cover: "https://placehold.co/600?text=Historial", songs: [...historyList].reverse() }, true);
        return;
    }
    
    // Modo audio/video
    if (fullLibraryData) {
        albumsToRender = fullLibraryData.map(alb => {
            const filteredSongs = alb.songs.filter(s => 
                currentMode === 'video' ? s.isVideo : !s.isVideo
            );
            return { ...alb, songs: filteredSongs };
        }).filter(alb => alb.songs.length > 0);
    }

    if (albumsToRender.length === 0) {
        container.innerHTML = '<p style="opacity:0.6; padding:20px;">Sin contenido en esta categoría.</p>';
        return;
    }

    // Renderizar álbumes con animación escalonada
    albumsToRender.forEach((album, index) => {
        const card = document.createElement('div');
        card.className = 'album-card';
        card.setAttribute('tabindex', '0');
        card.style.animationDelay = `${index * 0.05}s`;
        
        card.onclick = () => openAlbum(album);
        card.onkeydown = (e) => { if (e.key === 'Enter') openAlbum(album); };
        
        const img = document.createElement('img');
        img.src = album.cover;
        img.loading = 'lazy';
        img.alt = album.name;
        img.onerror = () => { img.src = `https://placehold.co/600?text=${encodeURIComponent(album.name)}`; };
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'album-title';
        titleDiv.innerText = album.name;
        
        const descDiv = document.createElement('div');
        descDiv.className = 'album-desc';
        descDiv.innerText = `${album.songs.length} ${album.songs.length === 1 ? 'canción' : 'canciones'}`;
        
        card.appendChild(img);
        card.appendChild(titleDiv);
        card.appendChild(descDiv);
        container.appendChild(card);
    });
}

// ==================== ABRIR ÁLBUM ====================
function openAlbum(album, isDirect = false) {
    currentAlbumData = album;
    
    if (!isDirect) {
        document.getElementById('grid-view').style.display = 'none';
        document.getElementById('playlist-view').style.display = 'block';
        document.getElementById('playlists-view').style.display = 'none';
    }
    
    const heroImg = document.getElementById('hero-img');
    if (heroImg) {
        heroImg.src = album.cover;
        heroImg.onerror = () => { heroImg.src = `https://placehold.co/600?text=${encodeURIComponent(album.name)}`; };
    }
    
    document.getElementById('hero-title').innerText = album.name;
    document.getElementById('hero-meta').innerText = `Para ti ❤️ • ${album.songs.length} items`;

    const tbody = document.getElementById('track-table-body');
    tbody.innerHTML = '';

    album.songs.forEach((song, idx) => {
        const isLiked = favoriteIds.includes(song.id);
        const isCurrentlyPlaying = currentPlaylist[currentIndex]?.id === song.id;
        
        const tr = document.createElement('tr');
        tr.className = `track-row ${isCurrentlyPlaying ? 'playing' : ''}`;
        tr.setAttribute('tabindex', '0');
        
        tr.onclick = (e) => {
            if (e.target.closest('.btn-icon')) return;
            originalPlaylist = [...album.songs];
            playTrack(album.songs, idx);
        };
        
        tr.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.target.closest('.btn-icon')) {
                originalPlaylist = [...album.songs];
                playTrack(album.songs, idx);
            }
        };
        
        tr.innerHTML = `
            <td class="track-num">${idx + 1}</td>
            <td>
                <div class="track-title">${song.title}</div>
            </td>
            <td>
                <button class="btn-icon btn-queue" onclick="addToQueueFromList('${song.id}', event)" title="Añadir a cola">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </td>
            <td style="text-align:right;">
                <button class="btn-icon ${isLiked ? 'liked' : ''}" onclick="toggleLike('${song.id}', this, event)" tabindex="0" title="Me gusta">
                    <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// ==================== REPRODUCTOR CORE ====================
function playTrack(playlist, index) {
    currentPlaylist = playlist;
    currentIndex = index;
    
    const track = currentPlaylist[index];
    if (!track) return;

    // Actualizar UI
    document.getElementById('player-img').src = track.cover;
    document.getElementById('player-title').innerText = track.title;
    document.getElementById('player-artist').innerText = track.artist;
    document.getElementById('play-icon').className = "fa-solid fa-pause";
    
    // Actualizar botón de like
    updateLikeButton(track.id);
    
    updateAmbientColor(track.title);
    addToHistory(track);
    updateTrackListHighlight();

    // MODO VIDEO
    if (track.isVideo) {
        isVideoPlaying = true;
        audioEl.pause();
        
        document.getElementById('hero-img').style.display = 'none';
        videoEl.style.display = 'block';
        
        if (heroImgBox) heroImgBox.classList.add('video-mode');
        
        videoEl.src = track.src;
        videoEl.play();
        
        const pb = document.getElementById('player-bar');
        if (pb) pb.style.display = 'none';

        if (window.innerWidth < 768) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } 
    // MODO AUDIO
    else {
        isVideoPlaying = false;
        videoEl.pause();
        videoEl.style.display = 'none';
        
        if (heroImgBox) heroImgBox.classList.remove('video-mode');
        document.getElementById('hero-img').style.display = 'block';
        
        const pb = document.getElementById('player-bar');
        if (pb) pb.style.display = 'flex';
        
        audioEl.src = track.src;
        audioEl.play().catch(e => console.log("Play error:", e));
        
        // Iniciar visualizador si está activo
        if (isVisualizerActive) {
            startVisualizer();
        }
    }

    updateMediaSession(track);
    saveState();
}

function updateTrackListHighlight() {
    // Remover highlight anterior
    document.querySelectorAll('.track-row.playing').forEach(el => {
        el.classList.remove('playing');
    });
    
    // Añadir highlight a la pista actual
    if (currentPlaylist[currentIndex]) {
        const currentId = currentPlaylist[currentIndex].id;
        document.querySelectorAll('.track-row').forEach(row => {
            const likeBtn = row.querySelector('.btn-icon[onclick*="toggleLike"]');
            if (likeBtn) {
                const match = likeBtn.getAttribute('onclick').match(/toggleLike\('([^']+)'/);
                if (match && match[1] === currentId) {
                    row.classList.add('playing');
                }
            }
        });
    }
}

function updateLikeButton(trackId) {
    const btn = document.getElementById('btn-like-current');
    if (btn) {
        const isLiked = favoriteIds.includes(trackId);
        btn.innerHTML = `<i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>`;
        btn.className = `ctrl-btn ${isLiked ? 'is-active' : ''}`;
    }
}

function togglePlay() {
    const player = isVideoPlaying ? videoEl : audioEl;
    
    if (player.paused) {
        player.play();
        document.getElementById('play-icon').className = "fa-solid fa-pause";
    } else {
        player.pause();
        document.getElementById('play-icon').className = "fa-solid fa-play";
    }
}

function nextTrack() {
    // Verificar si hay canciones en la cola
    if (queueList.length > 0) {
        const nextSong = queueList.shift();
        playTrack([nextSong, ...currentPlaylist.slice(currentIndex + 1)], 0);
        updateQueueUI();
        showToast('▶️ Reproduciendo desde cola', 'info');
        return;
    }
    
    let next = (currentIndex + 1) % currentPlaylist.length;
    playTrack(currentPlaylist, next);
}

function prevTrack() {
    // Si ha pasado más de 3 segundos, reiniciar canción actual
    const currentTime = isVideoPlaying ? videoEl.currentTime : audioEl.currentTime;
    if (currentTime > 3) {
        if (isVideoPlaying) {
            videoEl.currentTime = 0;
        } else {
            audioEl.currentTime = 0;
        }
        return;
    }
    
    let prev = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    playTrack(currentPlaylist, prev);
}

function playAllAlbum() {
    if (currentAlbumData && currentAlbumData.songs.length > 0) {
        originalPlaylist = [...currentAlbumData.songs];
        playTrack(currentAlbumData.songs, 0);
    }
}

function shuffleAllAlbum() {
    if (currentAlbumData && currentAlbumData.songs.length > 0) {
        const shuffled = [...currentAlbumData.songs].sort(() => Math.random() - 0.5);
        originalPlaylist = [...currentAlbumData.songs];
        playTrack(shuffled, 0);
        showToast('🔀 Modo aleatorio', 'info');
    }
}

function addToQueueAll() {
    if (currentAlbumData && currentAlbumData.songs.length > 0) {
        currentAlbumData.songs.forEach(song => {
            if (!queueList.find(s => s.id === song.id)) {
                queueList.push(song);
            }
        });
        updateQueueUI();
        showToast(`${currentAlbumData.songs.length} canciones añadidas a la cola`, 'success');
    }
}

// ==================== SHUFFLE & REPEAT ====================
function toggleShuffle() {
    isShuffle = !isShuffle;
    document.getElementById('btn-shuffle').classList.toggle('is-active', isShuffle);
    
    if (isShuffle) {
        const current = currentPlaylist[currentIndex];
        let shuffled = [...currentPlaylist].sort(() => Math.random() - 0.5);
        shuffled = shuffled.filter(t => t.id !== current.id);
        shuffled.unshift(current);
        currentPlaylist = shuffled;
        currentIndex = 0;
        showToast('🔀 Aleatorio activado', 'info');
    } else if (originalPlaylist.length) {
        const id = currentPlaylist[currentIndex].id;
        currentPlaylist = [...originalPlaylist];
        currentIndex = currentPlaylist.findIndex(t => t.id === id);
        showToast('➡️ Orden original', 'info');
    }
}

function toggleRepeat() {
    repeatMode = (repeatMode + 1) % 3;
    const btn = document.getElementById('btn-repeat');
    btn.className = 'ctrl-btn' + (repeatMode > 0 ? ' is-active' : '');
    
    if (repeatMode === 2) {
        btn.innerHTML = '<i class="fa-solid fa-repeat"></i><span style="font-size:10px;position:absolute;top:-2px;right:-2px;">1</span>';
        showToast('🔂 Repetir una', 'info');
    } else {
        btn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
        if (repeatMode === 1) {
            showToast('🔁 Repetir todo', 'info');
        } else {
            showToast('➡️ Sin repetir', 'info');
        }
    }
}

// ==================== COLA DE REPRODUCCIÓN ====================
function addToQueue(track) {
    if (queueList.find(t => t.id === track.id)) {
        showToast('Ya está en la cola', 'warning');
        return;
    }
    
    queueList.push(track);
    updateQueueUI();
    showToast(`"${track.title.substring(0, 20)}..." añadida a cola`, 'success');
}

function addToQueueFromList(songId, event) {
    if (event) event.stopPropagation();
    
    if (currentAlbumData) {
        const song = currentAlbumData.songs.find(s => s.id === songId);
        if (song) {
            addToQueue(song);
        }
    }
}

function removeFromQueue(index) {
    queueList.splice(index, 1);
    updateQueueUI();
    showToast('Quitada de la cola', 'info');
}

function clearQueue() {
    queueList = [];
    updateQueueUI();
    showToast('Cola limpiada', 'info');
}

function openQueuePanel() {
    const panel = document.getElementById('queue-panel');
    if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        updateQueueUI();
    }
}

function updateQueueUI() {
    const list = document.getElementById('queue-list');
    if (!list) return;
    
    if (queueList.length === 0) {
        list.innerHTML = '<p class="empty-queue">La cola está vacía<br><small>Añade canciones con el botón +</small></p>';
    } else {
        list.innerHTML = queueList.map((song, index) => `
            <div class="queue-item" onclick="playQueueItem(${index})">
                <img src="${song.cover}" alt="${song.title}">
                <div class="queue-item-info">
                    <div class="queue-item-title">${song.title}</div>
                    <div class="queue-item-album">${song.album}</div>
                </div>
                <button class="queue-item-remove" onclick="removeFromQueue(${index}); event.stopPropagation();">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        `).join('');
    }
    
    // Actualizar badges
    const badges = ['queue-badge-pc', 'queue-badge-top'];
    badges.forEach(id => {
        const badge = document.getElementById(id);
        if (badge) {
            if (queueList.length > 0) {
                badge.style.display = 'inline';
                badge.textContent = queueList.length;
            } else {
                badge.style.display = 'none';
            }
        }
    });
}

function playQueueItem(index) {
    const song = queueList[index];
    queueList.splice(index, 1);
    playTrack([song], 0);
    updateQueueUI();
}

function updateBadges() {
    // Badge de favoritos
    const favBadge = document.getElementById('fav-badge-pc');
    if (favBadge) {
        if (favoriteIds.length > 0) {
            favBadge.style.display = 'inline';
            favBadge.textContent = favoriteIds.length;
        } else {
            favBadge.style.display = 'none';
        }
    }
}

// ==================== VISUALIZER ====================
function toggleVisualizer() {
    isVisualizerActive = !isVisualizerActive;
    document.getElementById('btn-visualizer').classList.toggle('is-active', isVisualizerActive);
    
    if (isVisualizerActive) {
        visualizerCanvas.classList.add('active');
        startVisualizer();
        showToast('🌈 Visualizador activado', 'info');
    } else {
        visualizerCanvas.classList.remove('active');
        stopVisualizer();
        showToast('Visualizador desactivado', 'info');
    }
}

function startVisualizer() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        
        source = audioContext.createMediaElementSource(audioEl);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
    }
    
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    resizeCanvas();
    drawVisualizer();
}

function stopVisualizer() {
    if (ctx) {
        ctx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
    }
}

function resizeCanvas() {
    visualizerCanvas.width = window.innerWidth;
    visualizerCanvas.height = window.innerHeight;
}

function drawVisualizer() {
    if (!isVisualizerActive || !analyser) return;
    
    requestAnimationFrame(drawVisualizer);
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);
    
    ctx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
    
    const barWidth = (visualizerCanvas.width / bufferLength) * 2.5;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * visualizerCanvas.height * 0.5;
        
        const hue = (i / bufferLength) * 360;
        ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.5)`;
        
        ctx.fillRect(x, visualizerCanvas.height - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
    }
}

// ==================== CASSETTE & SLEEP ====================
function toggleCassetteMode() {
    isCassetteMode = !isCassetteMode;
    document.getElementById('btn-cassette').classList.toggle('is-active', isCassetteMode);
    if (heroImgBox) heroImgBox.classList.toggle('spinning', isCassetteMode);
    
    if (isCassetteMode) {
        showToast('💿 Modo cassette', 'info');
    }
}

function toggleSleepTimer() {
    const btn = document.getElementById('btn-sleep');
    
    if (sleepTimer) {
        clearTimeout(sleepTimer);
        sleepTimer = null;
        btn.classList.remove('is-active');
        showToast('🌙 Timer cancelado', 'info');
    } else {
        const mins = prompt("⏰ Minutos para apagar:", "30");
        if (mins && !isNaN(mins) && parseInt(mins) > 0) {
            sleepTimer = setTimeout(() => {
                audioEl.pause();
                videoEl.pause();
                document.getElementById('play-icon').className = "fa-solid fa-play";
                showToast('🌙 ¡Tiempo terminado! Buenas noches', 'success');
                btn.classList.remove('is-active');
            }, parseInt(mins) * 60000);
            
            btn.classList.add('is-active');
            showToast(`🌙 Apagando en ${mins} minutos`, 'success');
        }
    }
}

// ==================== LETRAS ====================
function toggleLyrics() {
    const modal = document.getElementById('lyrics-modal');
    if (modal) {
        if (modal.style.display === 'none' || !modal.style.display) {
            openLyricsModal();
        } else {
            closeLyricsModal();
        }
    }
}

async function openLyricsModal() {
    const modal = document.getElementById('lyrics-modal');
    const title = document.getElementById('lyrics-song-title');
    const container = document.getElementById('lyrics-text');
    
    if (!modal || !currentPlaylist[currentIndex]) return;
    
    const track = currentPlaylist[currentIndex];
    title.innerText = track.title;
    container.innerHTML = '<p class="lyrics-loading">🔍 Buscando letra...</p>';
    modal.style.display = 'flex';
    
    try {
        const res = await fetch(`/api/lyrics?artist=${encodeURIComponent(track.artist || 'L Arc en Ciel')}&title=${encodeURIComponent(track.title)}`);
        const data = await res.json();
        
        if (data.found && data.lyrics) {
            container.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit;">${data.lyrics}</pre>`;
        } else {
            container.innerHTML = '<p class="lyrics-loading">❌ Letra no encontrada</p>';
        }
    } catch (e) {
        container.innerHTML = '<p class="lyrics-loading">❌ Error al buscar letra</p>';
    }
}

function closeLyricsModal() {
    const modal = document.getElementById('lyrics-modal');
    if (modal) modal.style.display = 'none';
}

// ==================== FAVORITOS ====================
function toggleLike(id, btn, event) {
    if (event) event.stopPropagation();
    
    if (favoriteIds.includes(id)) {
        favoriteIds = favoriteIds.filter(f => f !== id);
        if (btn) {
            btn.classList.remove('liked');
            btn.innerHTML = '<i class="fa-regular fa-heart"></i>';
        }
        showToast('Quitado de favoritos', 'info');
    } else {
        favoriteIds.push(id);
        if (btn) {
            btn.classList.add('liked');
            btn.innerHTML = '<i class="fa-solid fa-heart"></i>';
        }
        showToast('❤️ Añadido a favoritos', 'success');
    }
    
    localStorage.setItem('koteifyLikes', JSON.stringify(favoriteIds));
    updateBadges();
    updateLikeButton(id);
}

function toggleLikeCurrent() {
    if (currentPlaylist[currentIndex]) {
        toggleLike(currentPlaylist[currentIndex].id, null, null);
    }
}

// ==================== HISTORIAL ====================
function addToHistory(track) {
    if (historyList.length > 0 && historyList[historyList.length - 1].id === track.id) return;
    
    historyList.push(track);
    if (historyList.length > 50) historyList.shift();
    
    localStorage.setItem('koteifyHistory', JSON.stringify(historyList));
}

// ==================== PLAYLISTS PERSONALIZADAS ====================
function openPlaylistManager() {
    showPlaylistsView();
}

function renderPlaylists() {
    const container = document.getElementById('playlists-container');
    if (!container) return;
    
    if (customPlaylists.length === 0) {
        container.innerHTML = '<p style="opacity:0.6; padding:20px; text-align:center;">No tienes playlists aún. ¡Crea una!</p>';
        return;
    }
    
    container.innerHTML = customPlaylists.map(pl => `
        <div class="playlist-card" onclick="openPlaylist('${pl.id}')">
            <div class="playlist-card-header">
                <div class="playlist-card-cover">
                    <i class="fa-solid fa-music"></i>
                </div>
                <div>
                    <div class="playlist-card-name">${pl.name}</div>
                    <div class="playlist-card-count">${pl.songs.length} canciones</div>
                </div>
            </div>
            <div class="playlist-card-actions">
                <button class="hero-btn secondary" onclick="deletePlaylist('${pl.id}'); event.stopPropagation();" style="padding:8px 12px;font-size:12px;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function createNewPlaylist() {
    const modal = document.getElementById('playlist-modal');
    const input = document.getElementById('new-playlist-name');
    
    if (modal) {
        modal.style.display = 'flex';
        if (input) {
            input.value = '';
            input.focus();
        }
    }
}

function closePlaylistModal() {
    const modal = document.getElementById('playlist-modal');
    if (modal) modal.style.display = 'none';
}

async function saveNewPlaylist() {
    const input = document.getElementById('new-playlist-name');
    const name = input?.value?.trim();
    
    if (!name) {
        showToast('El nombre es obligatorio', 'warning');
        return;
    }
    
    const newPlaylist = {
        id: `pl_${Date.now()}`,
        name: name,
        songs: [],
        createdAt: new Date().toISOString()
    };
    
    try {
        const res = await fetch('/api/playlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPlaylist)
        });
        
        if (res.ok) {
            customPlaylists.push(await res.json());
        } else {
            // Fallback a localStorage
            customPlaylists.push(newPlaylist);
            localStorage.setItem('koteifyPlaylists', JSON.stringify(customPlaylists));
        }
    } catch (e) {
        customPlaylists.push(newPlaylist);
        localStorage.setItem('koteifyPlaylists', JSON.stringify(customPlaylists));
    }
    
    closePlaylistModal();
    renderPlaylists();
    showToast(`Playlist "${name}" creada`, 'success');
}

function openPlaylist(id) {
    const playlist = customPlaylists.find(p => p.id === id);
    if (playlist) {
        document.getElementById('playlists-view').style.display = 'none';
        document.getElementById('playlist-view').style.display = 'block';
        openAlbum(playlist, true);
    }
}

async function deletePlaylist(id) {
    if (!confirm('¿Eliminar esta playlist?')) return;
    
    try {
        await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
    } catch (e) {}
    
    customPlaylists = customPlaylists.filter(p => p.id !== id);
    localStorage.setItem('koteifyPlaylists', JSON.stringify(customPlaylists));
    renderPlaylists();
    showToast('Playlist eliminada', 'info');
}

// ==================== ESTADÍSTICAS ====================
async function showStats() {
    const modal = document.getElementById('stats-modal');
    const container = document.getElementById('stats-container');
    
    if (!modal) return;
    
    modal.style.display = 'flex';
    container.innerHTML = '<p class="stats-loading">Cargando estadísticas...</p>';
    
    try {
        const [statsRes, topRes] = await Promise.all([
            fetch('/api/stats'),
            fetch('/api/stats/top')
        ]);
        
        const stats = await statsRes.json();
        const topSongs = await topRes.json();
        
        const totalPlays = Object.values(stats.plays || {}).reduce((a, b) => a + b, 0);
        const totalAlbums = fullLibraryData.length;
        const totalSongs = fullLibraryData.reduce((acc, a) => acc + a.songs.length, 0);
        
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${totalPlays}</div>
                    <div class="stat-label">Reproducciones</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${favoriteIds.length}</div>
                    <div class="stat-label">Favoritos</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalAlbums}</div>
                    <div class="stat-label">Álbumes</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalSongs}</div>
                    <div class="stat-label">Canciones</div>
                </div>
            </div>
            <h4 style="margin-top:20px;margin-bottom:12px;">🔥 Top 5 Más Escuchadas</h4>
            <div class="top-songs-list">
                ${topSongs.slice(0, 5).map((s, i) => `
                    <div class="top-song-item" onclick="playTopSong('${s.id}')">
                        <span class="top-song-rank">#${i + 1}</span>
                        <img src="${s.cover}" style="width:40px;height:40px;border-radius:4px;">
                        <div class="top-song-info">
                            <div class="track-title">${s.title}</div>
                            <div class="top-song-plays">${s.playCount} reproducciones</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (e) {
        container.innerHTML = '<p class="stats-loading">Error al cargar estadísticas</p>';
    }
}

function closeStatsModal() {
    const modal = document.getElementById('stats-modal');
    if (modal) modal.style.display = 'none';
}

function playTopSong(songId) {
    const album = fullLibraryData.find(a => a.songs.some(s => s.id === songId));
    if (album) {
        closeStatsModal();
        openAlbum(album);
        setTimeout(() => {
            const songIndex = album.songs.findIndex(s => s.id === songId);
            if (songIndex >= 0) playTrack(album.songs, songIndex);
        }, 300);
    }
}

// ==================== PROGRESS & TIME ====================
function updateProgress(e) {
    if (isDragging) return;
    
    const { duration, currentTime } = e.srcElement;
    if (!duration) return;
    
    document.getElementById('seek-slider').value = currentTime;
    document.getElementById('seek-slider').max = duration;
    document.getElementById('curr-time').innerText = formatTime(currentTime);
    document.getElementById('total-time').innerText = formatTime(duration);
    
    // Actualizar estilo del slider
    const seek = document.getElementById('seek-slider');
    const percent = (currentTime / duration) * 100;
    seek.style.background = `linear-gradient(to right, var(--accent) 0%, var(--accent) ${percent}%, var(--border) ${percent}%, var(--border) 100%)`;
    
    // Guardar estado cada 10 segundos
    if (Math.floor(currentTime) % 10 === 0) saveState();
    
    // Preload siguiente canción al 80%
    if (currentTime / duration > 0.8 && currentIndex < currentPlaylist.length - 1) {
        preloadNextTrack();
    }
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' + sec : sec}`;
}

function preloadNextTrack() {
    // Solo precargar, no reproducir
    const nextIndex = currentIndex + 1;
    if (currentPlaylist[nextIndex] && !currentPlaylist[nextIndex].isVideo) {
        const preloadAudio = new Audio();
        preloadAudio.preload = 'auto';
        preloadAudio.src = currentPlaylist[nextIndex].src;
    }
}

// Event listeners de medios
[audioEl, videoEl].forEach(media => {
    media.addEventListener('timeupdate', updateProgress);
    media.addEventListener('ended', () => {
        if (repeatMode === 2) {
            media.currentTime = 0;
            media.play();
        } else {
            nextTrack();
        }
    });
    media.addEventListener('error', (e) => {
        console.error('Media error:', e);
        showToast('Error al reproducir', 'error');
    });
});

// Seek slider
const seek = document.getElementById('seek-slider');
if (seek) {
    seek.addEventListener('input', (e) => {
        isDragging = true;
    });
    
    seek.addEventListener('change', (e) => {
        isDragging = false;
        (isVideoPlaying ? videoEl : audioEl).currentTime = e.target.value;
    });
}

// Volume slider
const vol = document.getElementById('vol-slider');
if (vol) {
    vol.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        audioEl.volume = value;
        videoEl.volume = value;
        
        // Actualizar icono
        const icon = document.querySelector('.player-right .fa-volume-high, .player-right .fa-volume-low, .player-right .fa-volume-xmark');
        if (icon) {
            if (value === 0) {
                icon.className = 'fa-solid fa-volume-xmark';
            } else if (value < 0.5) {
                icon.className = 'fa-solid fa-volume-low';
            } else {
                icon.className = 'fa-solid fa-volume-high';
            }
        }
    });
}

// ==================== MEDIA SESSION API ====================
function setupMediaSession() {
    if (!('mediaSession' in navigator)) return;
    
    navigator.mediaSession.setActionHandler('play', togglePlay);
    navigator.mediaSession.setActionHandler('pause', togglePlay);
    navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
    navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
    navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
            (isVideoPlaying ? videoEl : audioEl).currentTime = details.seekTime;
        }
    });
}

function updateMediaSession(t) {
    if (!('mediaSession' in navigator)) return;
    
    navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title,
        artist: t.artist,
        album: t.album,
        artwork: [
            { src: t.cover, sizes: '512x512', type: 'image/png' }
        ]
    });
}

// ==================== KEYBOARD SHORTCUTS ====================
function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
        // Ignorar si está escribiendo en un input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch (e.code) {
            case 'Space':
                e.preventDefault();
                togglePlay();
                break;
            case 'ArrowRight':
                if (e.ctrlKey) {
                    nextTrack();
                } else {
                    const player = isVideoPlaying ? videoEl : audioEl;
                    player.currentTime += 10;
                }
                break;
            case 'ArrowLeft':
                if (e.ctrlKey) {
                    prevTrack();
                } else {
                    const player = isVideoPlaying ? videoEl : audioEl;
                    player.currentTime -= 10;
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                audioEl.volume = Math.min(1, audioEl.volume + 0.1);
                videoEl.volume = audioEl.volume;
                document.getElementById('vol-slider').value = audioEl.volume;
                break;
            case 'ArrowDown':
                e.preventDefault();
                audioEl.volume = Math.max(0, audioEl.volume - 0.1);
                videoEl.volume = audioEl.volume;
                document.getElementById('vol-slider').value = audioEl.volume;
                break;
            case 'KeyM':
                const vol = document.getElementById('vol-slider');
                if (audioEl.volume > 0) {
                    audioEl.dataset.prevVolume = audioEl.volume;
                    audioEl.volume = 0;
                    videoEl.volume = 0;
                    vol.value = 0;
                } else {
                    audioEl.volume = audioEl.dataset.prevVolume || 1;
                    videoEl.volume = audioEl.volume;
                    vol.value = audioEl.volume;
                }
                break;
            case 'KeyL':
                toggleLikeCurrent();
                break;
            case 'KeyQ':
                openQueuePanel();
                break;
        }
    });
}

function setupRemoteControl() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' || e.key === 'Escape' || e.keyCode === 10009) {
            const pv = document.getElementById('playlist-view');
            const plv = document.getElementById('playlists-view');
            const qp = document.getElementById('queue-panel');
            
            // Cerrar modales primero
            const modals = ['lyrics-modal', 'playlist-modal', 'stats-modal'];
            for (const id of modals) {
                const modal = document.getElementById(id);
                if (modal && modal.style.display !== 'none') {
                    modal.style.display = 'none';
                    return;
                }
            }
            
            // Cerrar cola
            if (qp && qp.style.display !== 'none') {
                qp.style.display = 'none';
                return;
            }
            
            // Volver al grid
            if ((pv && pv.style.display !== 'none') || (plv && plv.style.display !== 'none')) {
                e.preventDefault();
                showGrid();
                setTimeout(() => {
                    const c = document.querySelector('.album-card');
                    if (c) c.focus();
                }, 100);
            }
        }
    });
}

// ==================== PERSISTENCIA ====================
function saveState() {
    if (!currentPlaylist[currentIndex]) return;
    
    const s = {
        track: currentPlaylist[currentIndex],
        time: (isVideoPlaying ? videoEl : audioEl).currentTime,
        playlist: currentPlaylist,
        index: currentIndex
    };
    
    localStorage.setItem('koteifyState', JSON.stringify(s));
}

function loadLastPosition() {
    try {
        const s = JSON.parse(localStorage.getItem('koteifyState'));
        
        if (s && s.track) {
            currentPlaylist = s.playlist || [s.track];
            currentIndex = s.index || 0;
            
            document.getElementById('player-img').src = s.track.cover;
            document.getElementById('player-title').innerText = s.track.title;
            document.getElementById('player-artist').innerText = s.track.artist;
            updateLikeButton(s.track.id);
            
            if (s.track.isVideo) {
                // No autoplay video al cargar
            } else {
                audioEl.src = s.track.src;
                audioEl.currentTime = s.time;
                audioEl.pause(); // No autoplay
            }
        }
    } catch (e) {
        console.log('No hay estado guardado');
    }
}

// ==================== ESPECIAL DEL MES ====================
function playMonthlyTop() {
    if (historyList.length > 0) {
        openAlbum({ 
            name: "Top Reciente 🕒", 
            cover: "https://placehold.co/600?text=Top+Mes", 
            songs: [...historyList].reverse() 
        }, false);
        
        setTimeout(() => {
            playTrack([...historyList].reverse(), 0);
        }, 500);
    } else {
        showToast('¡Escucha música para generar tu Top!', 'info');
    }
}

// ==================== RESIZE HANDLER ====================
window.addEventListener('resize', () => {
    if (isVisualizerActive) {
        resizeCanvas();
    }
});

// ==================== CLICK FUERA DE MODALES ====================
document.addEventListener('click', (e) => {
    // Cerrar modales al hacer clic fuera
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

console.log('🎵 AmorList v2.0 - Script cargado');
