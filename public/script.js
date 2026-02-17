/**
 * AmorList v3.1 - TV Navigation Engine (Full Complete)
 * Motor de navegación espacial real para PC y Smart TV
 * Incluye todas las funcionalidades sin recortes.
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

// Referencia al álbum actual
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
    console.log('📺 AmorList TV Engine (Full) Iniciando...');
    
    setGreeting();
    loadTheme();
    setupSearch();
    setupKeyboard(); // Teclado con navegación espacial
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
    
    // Enfocar el primer elemento para empezar a navegar
    setTimeout(() => {
        const firstBtn = document.getElementById('btn-pc-audio');
        if (firstBtn) firstBtn.focus();
    }, 1000);
    
    console.log('✅ Listo!');
};

// ==================== MOTOR DE NAVEGACIÓN ESPACIAL (TV/PC) ====================
function getFocusableElements() {
    // Seleccionar todos los elementos interactivos visibles
    const selector = 'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(document.querySelectorAll(selector)).filter(el => {
        return el.offsetParent !== null && !el.disabled && el.style.display !== 'none';
    });
}

function navMove(direction) {
    const activeEl = document.activeElement;
    
    // Si el foco se pierde o está en el body, volver al menú lateral
    if (!activeEl || activeEl === document.body) {
        const first = document.querySelector('.nav-btn');
        if (first) first.focus();
        return;
    }

    const rect = activeEl.getBoundingClientRect();
    const activeCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };

    const candidates = getFocusableElements().filter(el => el !== activeEl);
    let bestCandidate = null;
    let minDistance = Infinity;

    candidates.forEach(el => {
        const elRect = el.getBoundingClientRect();
        const elCenter = {
            x: elRect.left + elRect.width / 2,
            y: elRect.top + elRect.height / 2
        };

        // Filtrar por dirección
        let isValid = false;
        const deltaX = elCenter.x - activeCenter.x;
        const deltaY = elCenter.y - activeCenter.y;
        
        // Umbrales para mejorar la detección en grillas
        const threshold = 50; 

        switch (direction) {
            case 'UP':
                isValid = deltaY < -10 && Math.abs(deltaX) < (Math.abs(deltaY) * 2 + threshold);
                break;
            case 'DOWN':
                isValid = deltaY > 10 && Math.abs(deltaX) < (Math.abs(deltaY) * 2 + threshold);
                break;
            case 'LEFT':
                isValid = deltaX < -10 && Math.abs(deltaY) < (Math.abs(deltaX) * 0.8 + threshold);
                break;
            case 'RIGHT':
                isValid = deltaX > 10 && Math.abs(deltaY) < (Math.abs(deltaX) * 0.8 + threshold);
                break;
        }

        if (isValid) {
            const dist = Math.sqrt(Math.pow(elCenter.x - activeCenter.x, 2) + Math.pow(elCenter.y - activeCenter.y, 2));
            if (dist < minDistance) {
                minDistance = dist;
                bestCandidate = el;
            }
        }
    });

    if (bestCandidate) {
        bestCandidate.focus();
        bestCandidate.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        // Fallbacks inteligentes si no encuentra candidato directo
        if (direction === 'RIGHT' && activeEl.classList.contains('nav-btn')) {
            // Del menú lateral saltar al contenido principal
            const firstCard = document.querySelector('.album-card, .top-played-item');
            if (firstCard) firstCard.focus();
        } else if (direction === 'LEFT' && (activeEl.classList.contains('album-card') || activeEl.classList.contains('top-played-item'))) {
            // Del contenido volver al menú lateral
            const navBtn = document.getElementById('btn-pc-audio');
            if (navBtn) navBtn.focus();
        }
    }
}

// ==================== TECLADO Y CONTROL REMOTO ====================
function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
        // Permitir escribir en buscador
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.code) {
            case 'ArrowUp':
                e.preventDefault();
                navMove('UP');
                break;
            case 'ArrowDown':
                e.preventDefault();
                navMove('DOWN');
                break;
            case 'ArrowLeft':
                e.preventDefault();
                if (e.ctrlKey) {
                    prevTrack(); // Ctrl + Izquierda para retroceder canción
                } else {
                    navMove('LEFT');
                }
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (e.ctrlKey) {
                    nextTrack(); // Ctrl + Derecha para avanzar canción
                } else {
                    navMove('RIGHT');
                }
                break;
            case 'Enter':
            case 'NumpadEnter':
                // Simular click visualmente
                if (document.activeElement) {
                    document.activeElement.click();
                    document.activeElement.classList.add('active-press');
                    setTimeout(() => document.activeElement.classList.remove('active-press'), 150);
                }
                break;
            case 'Space':
                e.preventDefault();
                togglePlay();
                break;
            // Teclas para volumen
            case 'Equal': // Tecla +
            case 'NumpadAdd':
                changeVolume(0.1);
                break;
            case 'Minus': // Tecla -
            case 'NumpadSubtract':
                changeVolume(-0.1);
                break;
            case 'KeyM':
                toggleMute();
                break;
            case 'KeyQ':
                openQueuePanel();
                break;
            case 'Backspace':
            case 'Escape':
                handleBackKey(e);
                break;
        }
    });
}

function handleBackKey(e) {
    const pv = document.getElementById('playlist-view');
    const plv = document.getElementById('playlists-view');
    const qp = document.getElementById('queue-panel');
    const lyrics = document.getElementById('lyrics-modal');
    const playlistModal = document.getElementById('playlist-modal');
    const statsModal = document.getElementById('stats-modal');

    // Cerrar modales por prioridad
    if (lyrics && lyrics.style.display !== 'none') {
        lyrics.style.display = 'none'; return;
    }
    if (playlistModal && playlistModal.style.display !== 'none') {
        playlistModal.style.display = 'none'; return;
    }
    if (statsModal && statsModal.style.display !== 'none') {
        statsModal.style.display = 'none'; return;
    }
    if (qp && qp.style.display !== 'none') {
        qp.style.display = 'none'; return;
    }
    
    // Volver al Grid
    if ((pv && pv.style.display !== 'none') || (plv && plv.style.display !== 'none')) {
        if (e) e.preventDefault();
        showGrid();
        setTimeout(() => {
            const firstAlbum = document.querySelector('.album-card');
            if (firstAlbum) {
                firstAlbum.focus();
                firstAlbum.scrollIntoView({ block: 'center' });
            }
        }, 100);
    }
}

function setupRemoteControl() {
    // Soporte específico para códigos de teclas de TV (Tizen/WebOS)
    document.addEventListener('keydown', (e) => {
        if (e.keyCode === 10009 || e.key === 'GoBack') { // Samsung/LG Back
            handleBackKey(e);
        }
        if (e.keyCode === 415) togglePlay(); // Play
        if (e.keyCode === 19) togglePlay(); // Pause
        if (e.keyCode === 412) prevTrack(); // Rewind
        if (e.keyCode === 417) nextTrack(); // Fast Fwd
    });
}

function changeVolume(delta) {
    let newVol = Math.max(0, Math.min(1, audioEl.volume + delta));
    audioEl.volume = newVol;
    videoEl.volume = newVol;
    const volSlider = document.getElementById('vol-slider');
    if (volSlider) volSlider.value = newVol;
    
    // Actualizar icono
    const icon = document.querySelector('.player-right .fa-volume-high, .player-right .fa-volume-low, .player-right .fa-volume-xmark');
    if (icon) {
        if (newVol === 0) icon.className = 'fa-solid fa-volume-xmark';
        else if (newVol < 0.5) icon.className = 'fa-solid fa-volume-low';
        else icon.className = 'fa-solid fa-volume-high';
    }
    
    showToast(`🔊 Volumen ${(newVol * 100).toFixed(0)}%`, 'info');
}

function toggleMute() {
    const volSlider = document.getElementById('vol-slider');
    if (audioEl.volume > 0) {
        audioEl.dataset.prevVolume = audioEl.volume;
        audioEl.volume = 0;
        videoEl.volume = 0;
        if(volSlider) volSlider.value = 0;
        showToast('🔇 Mute', 'info');
    } else {
        const prev = parseFloat(audioEl.dataset.prevVolume) || 1;
        audioEl.volume = prev;
        videoEl.volume = prev;
        if(volSlider) volSlider.value = prev;
        showToast('🔊 Sonido activado', 'info');
    }
}

// ==================== SERVICE WORKER ====================
async function setupServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('/sw.js');
        } catch (e) { console.log('SW no registrado'); }
    }
}

// ==================== INTERSECTION OBSERVER ====================
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
    `;
    
    container.appendChild(toast);
    
    // Auto-remove
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ==================== REFRESCAR BIBLIOTECA ====================
async function refreshLibrary() {
    const icon = document.getElementById('refresh-icon');
    if (icon) icon.classList.add('fa-spin');
    
    showSkeletonLoader();
    
    try {
        console.log("🔄 Actualizando...");
        const res = await fetch('/api/refresh');
        if (!res.ok) throw new Error('Error en actualización');
        fullLibraryData = await res.json();
        renderGrid();
        showToast('¡Biblioteca actualizada!', 'success');
    } catch (e) {
        console.error("Error:", e);
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
    if (hour >= 5 && hour < 12) greeting = "Buenos días ☀️";
    else if (hour >= 12 && hour < 20) greeting = "Buenas tardes 🌸";
    else greeting = "Buenas noches 🌙";
    
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

// ==================== BÚSQUEDA ====================
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
    } catch (e) {}
}

function renderTopPlayed(songs) {
    if (!songs || songs.length === 0) return;
    const section = document.getElementById('top-played-section');
    const grid = document.getElementById('top-played-grid');
    if (!section || !grid) return;
    
    section.style.display = 'block';
    grid.innerHTML = '';
    
    songs.slice(0, 6).forEach((song) => {
        const item = document.createElement('div');
        item.className = 'top-played-item';
        item.setAttribute('tabindex', '0'); // Habilitar foco en TV
        
        const action = () => {
            const album = fullLibraryData.find(a => a.songs.some(s => s.id === song.id));
            if (album) {
                openAlbum(album);
                setTimeout(() => {
                    const songIndex = album.songs.findIndex(s => s.id === song.id);
                    if (songIndex >= 0) playTrack(album.songs, songIndex);
                }, 300);
            }
        };
        item.onclick = action;
        // Enter manejado globalmente por setupKeyboard
        
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

// ==================== VISTAS Y GRID ====================
function switchMode(mode) {
    currentMode = mode;
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
    
    // Auto-foco para TV
    setTimeout(() => {
        const first = document.querySelector('.album-card, .top-played-item');
        if(first) first.focus();
    }, 100);
}

function showGrid() {
    const gridView = document.getElementById('grid-view');
    const playlistView = document.getElementById('playlist-view');
    const playlistsView = document.getElementById('playlists-view');
    const heroImg = document.getElementById('hero-img');
    const queuePanel = document.getElementById('queue-panel');
    
    if (gridView) {
        gridView.style.display = 'block';
        gridView.classList.add('fade-in');
    }
    if (playlistView) playlistView.style.display = 'none';
    if (playlistsView) playlistsView.style.display = 'none';
    if (queuePanel) queuePanel.style.display = 'none';
    
    if (heroImgBox) heroImgBox.classList.remove('video-mode');
    if (videoEl) {
        videoEl.style.display = 'none';
        videoEl.pause();
    }
    if (heroImg) heroImg.style.display = 'block';
    
    const pb = document.getElementById('player-bar');
    if (pb) pb.style.display = 'flex';
}

function renderGrid() {
    const container = document.getElementById('albums-container');
    if (!container) return;
    container.innerHTML = '';
    
    // Lógica Favoritos
    if (currentMode === 'fav') {
        let allTracks = [];
        if (fullLibraryData) fullLibraryData.forEach(alb => allTracks.push(...alb.songs));
        const myFavs = allTracks.filter(t => favoriteIds.includes(t.id));
        
        if (myFavs.length === 0) {
            showGrid();
            container.innerHTML = '<p style="opacity:0.6; padding:20px;">Sin favoritos aún.</p>';
            return;
        }
        document.getElementById('grid-view').style.display = 'none';
        document.getElementById('playlist-view').style.display = 'block';
        openAlbum({ name: "Favoritos ❤️", cover: "https://placehold.co/600?text=Favoritos", songs: myFavs }, true);
        return;
    }
    
    // Lógica Historial
    if (currentMode === 'history') {
        if (historyList.length === 0) {
            showGrid();
            container.innerHTML = '<p style="opacity:0.6; padding:20px;">Historial vacío.</p>';
            return;
        }
        document.getElementById('grid-view').style.display = 'none';
        document.getElementById('playlist-view').style.display = 'block';
        openAlbum({ name: "Historial", cover: "https://placehold.co/600?text=Historial", songs: [...historyList].reverse() }, true);
        return;
    }
    
    // Audio / Video
    let albumsToRender = [];
    if (fullLibraryData) {
        albumsToRender = fullLibraryData.map(alb => {
            const filteredSongs = alb.songs.filter(s => currentMode === 'video' ? s.isVideo : !s.isVideo);
            return { ...alb, songs: filteredSongs };
        }).filter(alb => alb.songs.length > 0);
    }

    if (albumsToRender.length === 0) {
        container.innerHTML = '<p style="opacity:0.6; padding:20px;">Sin contenido.</p>';
        return;
    }

    albumsToRender.forEach((album, index) => {
        const card = document.createElement('div');
        card.className = 'album-card';
        card.setAttribute('tabindex', '0'); // Foco TV
        card.onclick = () => openAlbum(album);
        // Enter manejado globalmente
        
        card.innerHTML = `
            <img src="${album.cover}" loading="lazy" onerror="this.src='https://placehold.co/600'">
            <div class="album-title">${album.name}</div>
            <div class="album-desc">${album.songs.length} canciones</div>
        `;
        container.appendChild(card);
    });
}

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
        tr.setAttribute('tabindex', '0'); // Foco TV
        
        const action = () => {
            originalPlaylist = [...album.songs];
            playTrack(album.songs, idx);
        };
        tr.onclick = (e) => {
            if (e.target.closest('.btn-icon')) return;
            action();
        };
        
        tr.innerHTML = `
            <td class="track-num">${idx + 1}</td>
            <td><div class="track-title">${song.title}</div></td>
            <td>
                <button class="btn-icon btn-queue" tabindex="0"
                    onclick="addToQueueFromList('${song.id}', event)">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </td>
            <td style="text-align:right;">
                <button class="btn-icon ${isLiked ? 'liked' : ''}" tabindex="0"
                    onclick="toggleLike('${song.id}', this, event)">
                    <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Foco en Play
    setTimeout(() => {
        const playBtn = document.querySelector('.hero-btn');
        if (playBtn) playBtn.focus();
    }, 100);
}

// ==================== REPRODUCTOR CORE ====================
function playTrack(playlist, index) {
    if (audioContext && audioContext.state === 'suspended') audioContext.resume();

    currentPlaylist = playlist;
    currentIndex = index;
    const track = currentPlaylist[index];
    if (!track) return;

    // UI
    document.getElementById('player-img').src = track.cover;
    document.getElementById('player-title').innerText = track.title;
    document.getElementById('player-artist').innerText = track.artist;
    document.getElementById('play-icon').className = "fa-solid fa-pause";
    
    updateLikeButton(track.id);
    updateAmbientColor(track.title);
    addToHistory(track);
    updateTrackListHighlight();

    if (track.isVideo) {
        isVideoPlaying = true;
        audioEl.pause();
        document.getElementById('hero-img').style.display = 'none';
        videoEl.style.display = 'block';
        if (heroImgBox) heroImgBox.classList.add('video-mode');
        videoEl.src = track.src;
        videoEl.play();
        document.getElementById('player-bar').style.display = 'none';
        if (window.innerWidth < 768) window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        isVideoPlaying = false;
        videoEl.pause();
        videoEl.style.display = 'none';
        if (heroImgBox) heroImgBox.classList.remove('video-mode');
        document.getElementById('hero-img').style.display = 'block';
        document.getElementById('player-bar').style.display = 'flex';
        audioEl.src = track.src;
        audioEl.play().catch(console.error);
        if (isVisualizerActive) startVisualizer();
    }

    updateMediaSession(track);
    saveState();
}

function updateTrackListHighlight() {
    document.querySelectorAll('.track-row.playing').forEach(el => el.classList.remove('playing'));
    if (currentPlaylist[currentIndex]) {
        const currentId = currentPlaylist[currentIndex].id;
        document.querySelectorAll('.track-row').forEach(row => {
            const likeBtn = row.querySelector('.btn-icon[onclick*="toggleLike"]');
            if (likeBtn && likeBtn.getAttribute('onclick').includes(currentId)) {
                row.classList.add('playing');
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
    if (queueList.length > 0) {
        playTrack([queueList.shift(), ...currentPlaylist.slice(currentIndex + 1)], 0);
        updateQueueUI();
        showToast('▶️ Reproduciendo desde cola');
        return;
    }
    let next = (currentIndex + 1) % currentPlaylist.length;
    playTrack(currentPlaylist, next);
}

function prevTrack() {
    const currentTime = isVideoPlaying ? videoEl.currentTime : audioEl.currentTime;
    if (currentTime > 3) {
        if (isVideoPlaying) videoEl.currentTime = 0;
        else audioEl.currentTime = 0;
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
        showToast('🔀 Modo aleatorio');
    }
}

function addToQueueAll() {
    if (currentAlbumData) {
        currentAlbumData.songs.forEach(song => {
            if (!queueList.find(s => s.id === song.id)) queueList.push(song);
        });
        updateQueueUI();
        showToast('Añadidas a la cola', 'success');
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
        showToast('🔀 Aleatorio activado');
    } else if (originalPlaylist.length) {
        const id = currentPlaylist[currentIndex].id;
        currentPlaylist = [...originalPlaylist];
        currentIndex = currentPlaylist.findIndex(t => t.id === id);
        showToast('➡️ Orden original');
    }
}

function toggleRepeat() {
    repeatMode = (repeatMode + 1) % 3;
    const btn = document.getElementById('btn-repeat');
    btn.className = 'ctrl-btn' + (repeatMode > 0 ? ' is-active' : '');
    
    if (repeatMode === 2) {
        btn.innerHTML = '<i class="fa-solid fa-repeat"></i><span style="font-size:10px;position:absolute;top:-2px;right:-2px;">1</span>';
        showToast('🔂 Repetir una');
    } else {
        btn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
        if (repeatMode === 1) showToast('🔁 Repetir todo');
        else showToast('➡️ Sin repetir');
    }
}

// ==================== COLA Y PLAYLISTS ====================
function addToQueue(track) {
    if (queueList.find(t => t.id === track.id)) {
        showToast('Ya está en la cola', 'warning'); return;
    }
    queueList.push(track);
    updateQueueUI();
    showToast('Añadida a cola', 'success');
}

function addToQueueFromList(songId, event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    if (currentAlbumData) {
        const song = currentAlbumData.songs.find(s => s.id === songId);
        if (song) addToQueue(song);
    }
    return false;
}

function removeFromQueue(index) {
    queueList.splice(index, 1);
    updateQueueUI();
}

function updateQueueUI() {
    const list = document.getElementById('queue-list');
    if (!list) return;
    
    if (queueList.length === 0) {
        list.innerHTML = '<p class="empty-queue">Cola vacía</p>';
    } else {
        list.innerHTML = queueList.map((song, index) => `
            <div class="queue-item" onclick="playQueueItem(${index})">
                <div class="queue-item-title">${song.title}</div>
                <button class="queue-item-remove" onclick="removeFromQueue(${index}); event.stopPropagation();">x</button>
            </div>
        `).join('');
    }
    
    const badges = ['queue-badge-pc', 'queue-badge-top'];
    badges.forEach(id => {
        const badge = document.getElementById(id);
        if (badge) {
            badge.style.display = queueList.length ? 'inline' : 'none';
            badge.textContent = queueList.length;
        }
    });
}

function playQueueItem(index) {
    const song = queueList[index];
    queueList.splice(index, 1);
    playTrack([song], 0);
    updateQueueUI();
}

function openQueuePanel() {
    const panel = document.getElementById('queue-panel');
    if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        updateQueueUI();
    }
}

// ==================== VISUALIZER ====================
function toggleVisualizer() {
    isVisualizerActive = !isVisualizerActive;
    document.getElementById('btn-visualizer').classList.toggle('is-active', isVisualizerActive);
    if (isVisualizerActive) {
        visualizerCanvas.classList.add('active');
        startVisualizer();
        showToast('🌈 Visualizador activado');
    } else {
        visualizerCanvas.classList.remove('active');
        stopVisualizer();
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
    if (audioContext.state === 'suspended') audioContext.resume();
    drawVisualizer();
}

function stopVisualizer() {
    if (ctx) ctx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
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

function resizeCanvas() {
    visualizerCanvas.width = window.innerWidth;
    visualizerCanvas.height = window.innerHeight;
}

// ==================== EXTRAS ====================
function toggleCassetteMode() {
    isCassetteMode = !isCassetteMode;
    document.getElementById('btn-cassette').classList.toggle('is-active', isCassetteMode);
    if (heroImgBox) heroImgBox.classList.toggle('spinning', isCassetteMode);
    if (isCassetteMode) showToast('💿 Modo cassette');
}

function toggleSleepTimer() {
    const btn = document.getElementById('btn-sleep');
    if (sleepTimer) {
        clearTimeout(sleepTimer);
        sleepTimer = null;
        btn.classList.remove('is-active');
        showToast('🌙 Timer cancelado');
    } else {
        const mins = prompt("⏰ Minutos:", "30");
        if (mins && !isNaN(mins) && parseInt(mins) > 0) {
            sleepTimer = setTimeout(() => {
                audioEl.pause();
                videoEl.pause();
                showToast('🌙 Buenas noches');
                btn.classList.remove('is-active');
            }, parseInt(mins) * 60000);
            btn.classList.add('is-active');
            showToast(`🌙 Apagando en ${mins} min`);
        }
    }
}

// ==================== LETRAS ====================
function toggleLyrics() {
    const modal = document.getElementById('lyrics-modal');
    if (modal) {
        if (modal.style.display === 'none' || !modal.style.display) openLyricsModal();
        else modal.style.display = 'none';
    }
}

async function openLyricsModal() {
    const modal = document.getElementById('lyrics-modal');
    const title = document.getElementById('lyrics-song-title');
    const container = document.getElementById('lyrics-text');
    if (!modal || !currentPlaylist[currentIndex]) return;
    const track = currentPlaylist[currentIndex];
    title.innerText = track.title;
    container.innerHTML = '<p class="lyrics-loading">🔍 Buscando...</p>';
    modal.style.display = 'flex';
    try {
        const res = await fetch(`/api/lyrics?artist=${encodeURIComponent(track.artist||'L Arc en Ciel')}&title=${encodeURIComponent(track.title)}`);
        const data = await res.json();
        if (data.found && data.lyrics) container.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit;">${data.lyrics}</pre>`;
        else container.innerHTML = '<p>❌ No encontrada</p>';
    } catch (e) { container.innerHTML = '<p>❌ Error</p>'; }
}

// ==================== FAVORITOS ====================
function toggleLike(id, btn, event) {
    if (event) event.stopPropagation();
    if (favoriteIds.includes(id)) {
        favoriteIds = favoriteIds.filter(f => f !== id);
        if (btn) { btn.classList.remove('liked'); btn.innerHTML = '<i class="fa-regular fa-heart"></i>'; }
        showToast('Quitado de favoritos');
    } else {
        favoriteIds.push(id);
        if (btn) { btn.classList.add('liked'); btn.innerHTML = '<i class="fa-solid fa-heart"></i>'; }
        showToast('❤️ Favorito');
    }
    localStorage.setItem('koteifyLikes', JSON.stringify(favoriteIds));
    updateBadges();
    updateLikeButton(id);
}

function toggleLikeCurrent() {
    if (currentPlaylist[currentIndex]) toggleLike(currentPlaylist[currentIndex].id, null, null);
}

// ==================== HISTORIAL ====================
function addToHistory(track) {
    if (historyList.length > 0 && historyList[historyList.length - 1].id === track.id) return;
    historyList.push(track);
    if (historyList.length > 50) historyList.shift();
    localStorage.setItem('koteifyHistory', JSON.stringify(historyList));
}

// ==================== PLAYLIST MANAGER ====================
function openPlaylistManager() { showPlaylistsView(); }
function showPlaylistsView() {
    document.getElementById('grid-view').style.display = 'none';
    document.getElementById('playlist-view').style.display = 'none';
    document.getElementById('playlists-view').style.display = 'block';
    renderPlaylistsUI();
}
function renderPlaylistsUI() {
    const container = document.getElementById('playlists-container');
    if (!container) return;
    if (customPlaylists.length === 0) {
        container.innerHTML = '<p style="padding:20px;">No hay playlists.</p>';
        return;
    }
    container.innerHTML = customPlaylists.map(pl => `
        <div class="playlist-card" onclick="openPlaylist('${pl.id}')">
            <div class="playlist-card-name">${pl.name}</div>
            <div class="playlist-card-count">${pl.songs.length} canciones</div>
            <button onclick="deletePlaylist('${pl.id}');event.stopPropagation()">Borrar</button>
        </div>
    `).join('');
}
function createNewPlaylist() {
    const m = document.getElementById('playlist-modal');
    if(m) m.style.display = 'flex';
}
async function saveNewPlaylist() {
    const input = document.getElementById('new-playlist-name');
    const name = input?.value?.trim();
    if (!name) return;
    const newPl = { id: `pl_${Date.now()}`, name: name, songs: [], createdAt: new Date().toISOString() };
    try {
        await fetch('/api/playlists', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(newPl) });
        customPlaylists.push(