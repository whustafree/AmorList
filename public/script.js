// public/script.js

// --- VARIABLES GLOBALES ---
let fullLibraryData = [];
let currentMode = 'audio';
let favoriteIds = JSON.parse(localStorage.getItem('koteifyLikes')) || [];
let currentPlaylist = [];
let currentIndex = 0;
let isVideoPlaying = false;
let isDragging = false;

// Variables de reproducción avanzadas
let isShuffle = false;
let repeatMode = 0; // 0: no, 1: todo, 2: una
let originalPlaylist = []; 

// Elementos DOM
const audioEl = new Audio();
const videoEl = document.getElementById('hero-video');
const heroImgBox = document.getElementById('hero-img-box');

// --- INICIALIZACIÓN ---
window.onload = async () => {
    setGreeting();
    loadTheme();
    setupSearch();
    setupKeyboard();
    setupMediaSession();
    
    // Cargar datos al final
    await loadLibrary();
    loadLastPosition(); 
};

// --- BIENVENIDA ---
function setGreeting() {
    const hour = new Date().getHours();
    const msgEl = document.getElementById('greeting-msg');
    let greeting = "Hola ❤️";
    
    if (hour >= 5 && hour < 12) greeting = "Buenos días, mi amor ☀️";
    else if (hour >= 12 && hour < 20) greeting = "Buenas tardes, preciosa 🌸";
    else greeting = "Buenas noches, descansa 🌙";
    
    if(msgEl) msgEl.innerText = greeting;
}

// --- TEMA ---
function toggleTheme() {
    const body = document.body;
    if(body.getAttribute('data-theme') === 'kawaii') {
        body.removeAttribute('data-theme');
        localStorage.setItem('koteifyTheme', 'dark');
    } else {
        body.setAttribute('data-theme', 'kawaii');
        localStorage.setItem('koteifyTheme', 'kawaii');
    }
}

function loadTheme() {
    if(localStorage.getItem('koteifyTheme') === 'kawaii') {
        document.body.setAttribute('data-theme', 'kawaii');
    }
}

// --- BÚSQUEDA ---
function setupSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;
    
    input.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.album-card');
        
        cards.forEach(card => {
            const title = card.querySelector('.album-title').innerText.toLowerCase();
            if (title.includes(term)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    });
}

// --- CARGA DE BIBLIOTECA ---
async function loadLibrary() {
    try {
        const res = await fetch('/api/albums');
        if (!res.ok) throw new Error('Error al cargar datos');
        fullLibraryData = await res.json();
        
        // Renderizar inicial
        renderGrid();
        
    } catch (e) { 
        console.error("Error cargando biblioteca:", e);
        const container = document.getElementById('albums-container');
        if(container) container.innerHTML = '<p style="color:var(--text-secondary); padding:20px;">Cargando tu colección... (Si tarda mucho, dale al botón Actualizar)</p>';
    }
}

// --- NAVEGACIÓN (SWITCH MODE) ---
function switchMode(mode) {
    currentMode = mode;
    
    // Actualizar botones activos (PC y Móvil)
    const buttons = document.querySelectorAll('.nav-btn, .mob-btn');
    buttons.forEach(b => b.classList.remove('active'));
    
    // Mapeo de IDs para activar visualmente los botones
    const idsToActivate = [];
    if(mode === 'audio') {
        idsToActivate.push('btn-pc-audio', 'btn-mob-audio');
        document.getElementById('page-title').innerText = "Tu Música";
    } else if(mode === 'video') {
        idsToActivate.push('btn-pc-video', 'btn-mob-video');
        document.getElementById('page-title').innerText = "Tus Videos";
    } else {
        idsToActivate.push('btn-pc-fav', 'btn-mob-fav');
        document.getElementById('page-title').innerText = "Tus Favoritos ❤️";
    }
    
    idsToActivate.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('active');
    });

    // Si no es favoritos, forzamos mostrar el grid
    if (mode !== 'fav') {
        showGrid();
    }
    
    // Renderizar contenido nuevo
    renderGrid();
}

function showGrid() {
    const gridView = document.getElementById('grid-view');
    const playlistView = document.getElementById('playlist-view');
    const heroImg = document.getElementById('hero-img');
    
    if(gridView) gridView.style.display = 'block';
    if(playlistView) playlistView.style.display = 'none';
    
    // Resetear vista de video en el mini-player si es necesario
    if(heroImgBox) heroImgBox.classList.remove('video-mode');
    if(videoEl) {
        videoEl.style.display = 'none';
        videoEl.pause();
    }
    if(heroImg) heroImg.style.display = 'block';
}

// --- RENDERIZADO (GRID) ---
function renderGrid() {
    const container = document.getElementById('albums-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    // 1. MODO FAVORITOS
    if (currentMode === 'fav') {
        let allTracks = [];
        // Aplanar todas las canciones de todos los álbumes
        if(fullLibraryData && fullLibraryData.length > 0) {
            fullLibraryData.forEach(alb => allTracks.push(...alb.songs));
        }
        
        const myFavs = allTracks.filter(t => favoriteIds.includes(t.id));
        
        if (myFavs.length === 0) {
            showGrid(); // Asegurarnos de que se vea el contenedor vacío
            container.innerHTML = `<p style="color:var(--text-secondary); padding:20px;">No tienes favoritos aún. ¡Dale ❤️ a algo!</p>`;
            return;
        }
        
        // Cambiar a vista de lista automáticamente
        document.getElementById('grid-view').style.display = 'none';
        document.getElementById('playlist-view').style.display = 'block';
        openAlbum({ name: "Mis Favoritos", cover: "https://placehold.co/600?text=Favoritos", songs: myFavs }, true);
        return;
    } 
    
    // 2. MODO MÚSICA / VIDEO
    let albumsToRender = [];
    if(fullLibraryData && fullLibraryData.length > 0) {
        albumsToRender = fullLibraryData.map(alb => {
            // Filtrar canciones dentro del álbum según el modo
            const filteredSongs = alb.songs.filter(s => currentMode === 'video' ? s.isVideo : !s.isVideo);
            return { ...alb, songs: filteredSongs };
        }).filter(alb => alb.songs.length > 0); // Solo álbumes con canciones
    }

    if(albumsToRender.length === 0) {
        container.innerHTML = `<p style="color:var(--text-secondary);">No hay contenido disponible.</p>`;
        return;
    }

    // Crear tarjetas
    albumsToRender.forEach(album => {
        const card = document.createElement('div');
        card.className = 'album-card';
        card.onclick = () => openAlbum(album);
        
        // Título del álbum
        const titleDiv = document.createElement('div');
        titleDiv.className = 'album-title';
        titleDiv.innerText = album.name;
        
        // Descripción
        const descDiv = document.createElement('div');
        descDiv.className = 'album-desc';
        descDiv.innerText = `${album.songs.length} canciones`;
        
        // Imagen
        const img = document.createElement('img');
        img.src = album.cover;
        img.loading = 'lazy';
        
        card.appendChild(img);
        card.appendChild(titleDiv);
        card.appendChild(descDiv);
        
        container.appendChild(card);
    });
}

// --- VISTA DE LISTA (OPEN ALBUM) ---
function openAlbum(album, isDirect = false) {
    if(!isDirect) {
        document.getElementById('grid-view').style.display = 'none';
        document.getElementById('playlist-view').style.display = 'block';
    }
    
    // Actualizar Hero
    const heroImg = document.getElementById('hero-img');
    if(heroImg) heroImg.src = album.cover;
    
    document.getElementById('hero-title').innerText = album.name;
    document.getElementById('hero-meta').innerText = `Para ti ❤️ • ${album.songs.length} canciones`;
    
    // Llenar tabla
    const tbody = document.getElementById('track-table-body');
    tbody.innerHTML = '';

    album.songs.forEach((song, idx) => {
        const isLiked = favoriteIds.includes(song.id);
        const tr = document.createElement('tr');
        tr.className = 'track-row';
        
        // Clic en fila -> Reproducir
        tr.onclick = (e) => {
            if(e.target.closest('.btn-icon')) return; // Ignorar si clic en botón
            originalPlaylist = [...album.songs]; // Guardar contexto para shuffle
            playTrack(album.songs, idx);
        };
        
        tr.innerHTML = `
            <td class="track-num">${idx + 1}</td>
            <td><div class="track-title">${song.title}</div></td>
            <td style="text-align:right;">
                <button class="btn-icon ${isLiked ? 'liked' : ''}" onclick="toggleLike('${song.id}', this, event)">
                    <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- REPRODUCTOR ---
function playTrack(playlist, index) {
    currentPlaylist = playlist;
    currentIndex = index;
    const track = currentPlaylist[index];

    // UI Player
    document.getElementById('player-img').src = track.cover;
    document.getElementById('player-title').innerText = track.title;
    document.getElementById('player-artist').innerText = track.artist;
    
    // Botón Play/Pause
    const playIcon = document.getElementById('play-icon');
    playIcon.className = "fa-solid fa-pause";
    
    // Animación
    if(heroImgBox) heroImgBox.classList.add('playing-anim');

    // Resetear barra
    const slider = document.getElementById('seek-slider');
    slider.value = 0;
    slider.style.backgroundSize = "0% 100%";

    // Lógica Audio vs Video
    if(track.isVideo) {
        isVideoPlaying = true;
        audioEl.pause();
        
        // Mostrar video
        document.getElementById('hero-img').style.display = 'none';
        videoEl.style.display = 'block';
        if(heroImgBox) heroImgBox.classList.add('video-mode');
        
        videoEl.src = track.src;
        videoEl.play();
        
        // Scroll arriba en móvil
        if(window.innerWidth < 768) window.scrollTo({top:0, behavior:'smooth'});
        
    } else {
        isVideoPlaying = false;
        videoEl.pause();
        
        // Mostrar imagen
        if(heroImgBox) heroImgBox.classList.remove('video-mode');
        document.getElementById('hero-img').style.display = 'block';
        videoEl.style.display = 'none';
        
        audioEl.src = track.src;
        audioEl.play();
    }

    updateMediaSession(track);
    saveState();
}

function togglePlay() {
    const player = isVideoPlaying ? videoEl : audioEl;
    const playIcon = document.getElementById('play-icon');
    
    if(player.paused) {
        player.play();
        playIcon.className = "fa-solid fa-pause";
        if(heroImgBox) heroImgBox.classList.add('playing-anim');
    } else {
        player.pause();
        playIcon.className = "fa-solid fa-play";
        if(heroImgBox) heroImgBox.classList.remove('playing-anim');
    }
}

function nextTrack() {
    let next = (currentIndex + 1) % currentPlaylist.length;
    playTrack(currentPlaylist, next);
}

function prevTrack() {
    let prev = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    playTrack(currentPlaylist, prev);
}

// --- CONTROLES EXTRA ---
function toggleShuffle() {
    isShuffle = !isShuffle;
    const btn = document.getElementById('btn-shuffle');
    btn.classList.toggle('is-active', isShuffle);

    if (isShuffle) {
        // Mezclar
        const currentTrack = currentPlaylist[currentIndex];
        let shuffled = [...currentPlaylist].sort(() => Math.random() - 0.5);
        // Mover actual al inicio
        shuffled = shuffled.filter(t => t.id !== currentTrack.id);
        shuffled.unshift(currentTrack);
        
        currentPlaylist = shuffled;
        currentIndex = 0;
    } else {
        // Restaurar
        if(originalPlaylist.length > 0) {
            const currentId = currentPlaylist[currentIndex].id;
            currentPlaylist = [...originalPlaylist];
            currentIndex = currentPlaylist.findIndex(t => t.id === currentId);
        }
    }
}

function toggleRepeat() {
    repeatMode = (repeatMode + 1) % 3;
    const btn = document.getElementById('btn-repeat');
    
    btn.classList.remove('is-active');
    btn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
    
    if (repeatMode === 1) {
        btn.classList.add('is-active');
    } else if (repeatMode === 2) {
        btn.classList.add('is-active');
        btn.innerHTML = '<i class="fa-solid fa-repeat-1"></i>';
    }
}

function onTrackEnded() {
    if (repeatMode === 2) {
        const player = isVideoPlaying ? videoEl : audioEl;
        player.currentTime = 0;
        player.play();
    } else {
        nextTrack();
    }
}

// --- PROGRESO ---
function updateProgress(e) {
    if(isDragging) return;
    const { duration, currentTime } = e.srcElement;
    if(!duration) return;
    
    const slider = document.getElementById('seek-slider');
    slider.max = duration;
    slider.value = currentTime;
    
    const percent = (currentTime / duration) * 100;
    slider.style.backgroundSize = `${percent}% 100%`;

    document.getElementById('curr-time').innerText = formatTime(currentTime);
    document.getElementById('total-time').innerText = formatTime(duration);
    
    if (Math.floor(currentTime) % 5 === 0) saveState();
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' + sec : sec}`;
}

// Event Listeners para Audio/Video
[audioEl, videoEl].forEach(media => {
    media.addEventListener('timeupdate', updateProgress);
    media.addEventListener('ended', onTrackEnded);
});

// Slider Seek
const seekSlider = document.getElementById('seek-slider');
if(seekSlider) {
    seekSlider.addEventListener('input', (e) => {
        isDragging = true;
        const val = e.target.value;
        const max = e.target.max;
        const percent = (val / max) * 100;
        e.target.style.backgroundSize = `${percent}% 100%`;
    });
    seekSlider.addEventListener('change', (e) => {
        isDragging = false;
        const player = isVideoPlaying ? videoEl : audioEl;
        player.currentTime = e.target.value;
    });
}

// Slider Volumen
const volSlider = document.getElementById('vol-slider');
if(volSlider) {
    volSlider.addEventListener('input', (e) => {
        audioEl.volume = e.target.value;
        videoEl.volume = e.target.value;
    });
}

// --- UTILS ---
function toggleLike(id, btn, event) {
    if(event) event.stopPropagation();
    
    if (favoriteIds.includes(id)) {
        favoriteIds = favoriteIds.filter(f => f !== id);
        btn.classList.remove('liked');
        btn.innerHTML = '<i class="fa-regular fa-heart"></i>';
    } else {
        favoriteIds.push(id);
        btn.classList.add('liked');
        btn.innerHTML = '<i class="fa-solid fa-heart"></i>';
    }
    localStorage.setItem('koteifyLikes', JSON.stringify(favoriteIds));
    
    if(currentMode === 'fav') renderGrid();
}

function showDedication() {
    const messages = [
        "Eres mi melodía favorita ❤️",
        "Gracias por existir ✨",
        "Te amo más cada día 💖",
        "Mi lugar feliz eres tú 🏡",
        "Esta canción es para ti 🌹"
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];
    alert("💌 Mensaje para ti:\n\n" + msg);
}

async function refreshLibrary() {
    const btn = document.getElementById('refresh-icon');
    if(btn) btn.classList.add('fa-spin');
    try {
        await loadLibrary(); // Reusa la función principal
        alert("¡Actualizado!");
    } catch(e) { alert("Error al actualizar"); }
    if(btn) btn.classList.remove('fa-spin');
}

// --- MEDIA SESSION ---
function setupMediaSession() {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', togglePlay);
        navigator.mediaSession.setActionHandler('pause', togglePlay);
        navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
        navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
    }
}

function updateMediaSession(track) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: track.title,
            artist: track.artist,
            album: track.album,
            artwork: [{ src: track.cover, sizes: '512x512', type: 'image/png' }]
        });
    }
}

// --- TECLADO ---
function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            togglePlay();
        } else if (e.code === 'ArrowRight') nextTrack();
        else if (e.code === 'ArrowLeft') prevTrack();
    });
}

// --- ESTADO ---
function saveState() {
    if(!currentPlaylist[currentIndex]) return;
    const player = isVideoPlaying ? videoEl : audioEl;
    const state = {
        track: currentPlaylist[currentIndex],
        time: player.currentTime,
        playlist: currentPlaylist, 
        index: currentIndex
    };
    localStorage.setItem('koteifyState', JSON.stringify(state));
}

function loadLastPosition() {
    const saved = localStorage.getItem('koteifyState');
    if (saved) {
        try {
            const state = JSON.parse(saved);
            if(state.track) {
                currentPlaylist = state.playlist || [state.track];
                currentIndex = state.index || 0;
                
                // Actualizar visualmente sin reproducir
                document.getElementById('player-img').src = state.track.cover;
                document.getElementById('player-title').innerText = state.track.title;
                document.getElementById('player-artist').innerText = state.track.artist;
                
                if(state.track.isVideo) {
                    videoEl.src = state.track.src;
                    videoEl.currentTime = state.time;
                } else {
                    audioEl.src = state.track.src;
                    audioEl.currentTime = state.time;
                }
            }
        } catch(e) { console.log("Error cargando estado"); }
    }
}
