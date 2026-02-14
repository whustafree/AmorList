// public/script.js

let fullLibraryData = [];
let currentMode = 'audio';
let favoriteIds = JSON.parse(localStorage.getItem('koteifyLikes')) || [];
let currentPlaylist = [];
let currentIndex = 0;
let isVideoPlaying = false;
let isDragging = false;

// Variables nuevas
let isShuffle = false;
let repeatMode = 0; // 0: no, 1: todo, 2: una
let originalPlaylist = []; // Para guardar el orden antes del shuffle

const audioEl = new Audio();
const videoEl = document.getElementById('hero-video');
const heroImgBox = document.getElementById('hero-img-box'); // Para el gesto y animación

// --- INICIO ---
window.onload = async () => {
    setGreeting();
    loadTheme();
    await loadLibrary();
    loadLastPosition(); // Recuperar memoria
    setupSearch();
    setupKeyboard();
    setupMediaSession();
};

// --- GREETING (Bienvenida) ---
function setGreeting() {
    const hour = new Date().getHours();
    const msgEl = document.getElementById('greeting-msg');
    let greeting = "Hola ❤️";
    
    if (hour >= 5 && hour < 12) greeting = "Buenos días, mi amor ☀️";
    else if (hour >= 12 && hour < 20) greeting = "Buenas tardes, preciosa 🌸";
    else greeting = "Buenas noches, descansa 🌙";
    
    if(msgEl) msgEl.innerText = greeting;
}

// --- SEARCH (Buscador) ---
function setupSearch() {
    const input = document.getElementById('search-input');
    input.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        // Filtramos solo si estamos en vista Grid
        const cards = document.querySelectorAll('.album-card');
        let hasResults = false;
        
        cards.forEach(card => {
            const title = card.querySelector('.album-title').innerText.toLowerCase();
            if (title.includes(term)) {
                card.style.display = 'block';
                hasResults = true;
            } else {
                card.style.display = 'none';
            }
        });
        
        // Si no hay resultados podríamos mostrar un mensaje, pero por ahora simple
    });
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

// --- CARGA DATOS ---
async function loadLibrary() {
    try {
        const res = await fetch('/api/albums');
        fullLibraryData = await res.json();
        renderGrid();
    } catch (e) { console.error("Error:", e); }
}

// --- RENDER ---
function renderGrid() {
    const container = document.getElementById('albums-container');
    container.innerHTML = '';
    
    let albumsToRender = [];

    if (currentMode === 'fav') {
        let allTracks = [];
        fullLibraryData.forEach(alb => allTracks.push(...alb.songs));
        const myFavs = allTracks.filter(t => favoriteIds.includes(t.id));
        
        if (myFavs.length === 0) {
            showGrid();
            container.innerHTML = `<p style="color:var(--text-secondary); padding:20px;">No tienes favoritos aún.</p>`;
            return;
        }
        
        document.getElementById('grid-view').style.display = 'none';
        document.getElementById('playlist-view').style.display = 'block';
        openAlbum({ name: "Mis Favoritos", cover: "https://placehold.co/600?text=Favoritos", songs: myFavs }, true);
        return;
    } 
    
    albumsToRender = fullLibraryData.map(alb => {
        const filteredSongs = alb.songs.filter(s => currentMode === 'video' ? s.isVideo : !s.isVideo);
        return { ...alb, songs: filteredSongs };
    }).filter(alb => alb.songs.length > 0);

    if(albumsToRender.length === 0) {
        container.innerHTML = `<p style="color:var(--text-secondary);">No hay contenido.</p>`;
        return;
    }

    albumsToRender.forEach(album => {
        const card = document.createElement('div');
        card.className = 'album-card';
        card.onclick = () => openAlbum(album);
        card.innerHTML = `
            <img src="${album.cover}" loading="lazy">
            <div class="album-title">${album.name}</div>
            <div class="album-desc">${album.songs.length} canciones</div>
        `;
        container.appendChild(card);
    });
}

function openAlbum(album, isDirect = false) {
    if(!isDirect) {
        document.getElementById('grid-view').style.display = 'none';
        document.getElementById('playlist-view').style.display = 'block';
    }
    document.getElementById('hero-img').src = album.cover;
    document.getElementById('hero-title').innerText = album.name;
    document.getElementById('hero-meta').innerText = `Para ti ❤️ • ${album.songs.length} items`;
    
    const tbody = document.getElementById('track-table-body');
    tbody.innerHTML = '';

    album.songs.forEach((song, idx) => {
        const isLiked = favoriteIds.includes(song.id);
        const tr = document.createElement('tr');
        tr.className = 'track-row';
        tr.onclick = (e) => {
            if(e.target.closest('.btn-icon')) return;
            // Guardamos original para shuffle
            originalPlaylist = [...album.songs];
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

// --- REPRODUCTOR CORE ---
function playTrack(playlist, index) {
    currentPlaylist = playlist;
    currentIndex = index;
    const track = currentPlaylist[index];

    // UI Updates
    document.getElementById('player-img').src = track.cover;
    document.getElementById('player-title').innerText = track.title;
    document.getElementById('player-artist').innerText = track.artist;
    document.getElementById('play-icon').className = "fa-solid fa-pause";
    
    // Animación pulso
    heroImgBox.classList.add('playing-anim');

    const slider = document.getElementById('seek-slider');
    slider.value = 0;
    slider.style.backgroundSize = "0% 100%";

    if(track.isVideo) {
        isVideoPlaying = true;
        audioEl.pause();
        document.getElementById('hero-img').style.display = 'none';
        videoEl.style.display = 'block';
        heroImgBox.classList.add('video-mode');
        videoEl.src = track.src;
        videoEl.play();
        if(window.innerWidth < 768) window.scrollTo({top:0, behavior:'smooth'});
    } else {
        isVideoPlaying = false;
        videoEl.pause();
        heroImgBox.classList.remove('video-mode');
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
    if(player.paused) {
        player.play();
        document.getElementById('play-icon').className = "fa-solid fa-pause";
        heroImgBox.classList.add('playing-anim');
    } else {
        player.pause();
        document.getElementById('play-icon').className = "fa-solid fa-play";
        heroImgBox.classList.remove('playing-anim');
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

// --- SHUFFLE & REPEAT ---
function toggleShuffle() {
    isShuffle = !isShuffle;
    const btn = document.getElementById('btn-shuffle');
    btn.classList.toggle('is-active', isShuffle);

    if (isShuffle) {
        // Mezclar
        let currentTrack = currentPlaylist[currentIndex];
        // Algoritmo Fisher-Yates simplificado
        let shuffled = [...currentPlaylist].sort(() => Math.random() - 0.5);
        // Poner la actual primero
        shuffled = shuffled.filter(t => t.id !== currentTrack.id);
        shuffled.unshift(currentTrack);
        currentPlaylist = shuffled;
        currentIndex = 0;
    } else {
        // Restaurar orden (si tenemos la original guardada)
        if(originalPlaylist.length > 0) {
            let currentTrackId = currentPlaylist[currentIndex].id;
            currentPlaylist = [...originalPlaylist];
            currentIndex = currentPlaylist.findIndex(t => t.id === currentTrackId);
        }
    }
}

function toggleRepeat() {
    // 0 -> 1 (All) -> 2 (One) -> 0
    repeatMode = (repeatMode + 1) % 3;
    const btn = document.getElementById('btn-repeat');
    
    if (repeatMode === 0) {
        btn.classList.remove('is-active');
        btn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
    } else if (repeatMode === 1) {
        btn.classList.add('is-active');
        btn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
    } else {
        btn.classList.add('is-active');
        btn.innerHTML = '<i class="fa-solid fa-repeat-1"></i>'; // Icono con el 1
    }
}

// Controlar fin de canción
function onTrackEnded() {
    if (repeatMode === 2) {
        // Repetir una
        const player = isVideoPlaying ? videoEl : audioEl;
        player.currentTime = 0;
        player.play();
    } else {
        nextTrack();
    }
}

// --- PROGRESS ---
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
    
    // Guardar cada 5 segundos para no saturar
    if (Math.floor(currentTime) % 5 === 0) saveState();
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0'+sec : sec}`;
}

[audioEl, videoEl].forEach(media => {
    media.addEventListener('timeupdate', updateProgress);
    media.addEventListener('ended', onTrackEnded);
});

const seekSlider = document.getElementById('seek-slider');
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

document.getElementById('vol-slider').addEventListener('input', (e) => {
    audioEl.volume = e.target.value;
    videoEl.volume = e.target.value;
});

// --- MEDIA SESSION (PANTALLA DE BLOQUEO) ---
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
            artwork: [
                { src: track.cover, sizes: '512x512', type: 'image/png' }
            ]
        });
    }
}

// --- TECLADO ---
function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault(); // Evita scroll
            togglePlay();
        } else if (e.code === 'ArrowRight') {
            nextTrack();
        } else if (e.code === 'ArrowLeft') {
            prevTrack();
        }
    });
}

// --- MEMORIA (Save State) ---
function saveState() {
    const player = isVideoPlaying ? videoEl : audioEl;
    const state = {
        track: currentPlaylist[currentIndex],
        time: player.currentTime,
        playlist: currentPlaylist, // Opcional: guardar toda la lista
        index: currentIndex
    };
    localStorage.setItem('koteifyState', JSON.stringify(state));
}

function loadLastPosition() {
    const saved = localStorage.getItem('koteifyState');
    if (saved) {
        const state = JSON.parse(saved);
        if(state.track) {
            // Cargar datos visuales pero NO reproducir
            currentPlaylist = state.playlist || [state.track];
            currentIndex = state.index || 0;
            
            document.getElementById('player-img').src = state.track.cover;
            document.getElementById('player-title').innerText = state.track.title;
            document.getElementById('player-artist').innerText = state.track.artist;
            
            // Establecer fuente y tiempo
            if(state.track.isVideo) {
                videoEl.src = state.track.src;
                videoEl.currentTime = state.time;
            } else {
                audioEl.src = state.track.src;
                audioEl.currentTime = state.time;
            }
        }
    }
}

// --- EXTRAS ---
function showDedication() {
    const messages = [
        "Eres mi melodía favorita ❤️",
        "Cada canción me recuerda a ti 🌹",
        "Gracias por estar en mi vida, Kote ✨",
        "Te amo más que ayer, menos que mañana 💖",
        "Mi lugar feliz es contigo 🏡"
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];
    alert("💌 Para ti: \n\n" + msg);
}

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

async function refreshLibrary() {
    const btn = document.getElementById('refresh-icon');
    if(btn) btn.classList.add('fa-spin');
    try {
        await fetch('/api/refresh');
        await loadLibrary();
        alert("¡Biblioteca actualizada!");
    } catch(e) { alert("Error al actualizar"); }
    if(btn) btn.classList.remove('fa-spin');
}

// OTROS (Navigation)
function switchMode(mode) { /* Ya estaba arriba */ 
    currentMode = mode;
    document.querySelectorAll('.nav-btn, .mob-btn').forEach(b => b.classList.remove('active'));
    if(mode === 'audio') {
        if(document.getElementById('btn-pc-audio')) document.getElementById('btn-pc-audio').classList.add('active');
        if(document.getElementById('btn-mob-audio')) document.getElementById('btn-mob-audio').classList.add('active');
        document.getElementById('page-title').innerText = "Tu Música";
    } else if(mode === 'video') {
        if(document.getElementById('btn-pc-video')) document.getElementById('btn-pc-video').classList.add('active');
        if(document.getElementById('btn-mob-video')) document.getElementById('btn-mob-video').classList.add('active');
        document.getElementById('page-title').innerText = "Tus Videos";
    } else {
        if(document.getElementById('btn-pc-fav')) document.getElementById('btn-pc-fav').classList.add('active');
        if(document.getElementById('btn-mob-fav')) document.getElementById('btn-mob-fav').classList.add('active');
        document.getElementById('page-title').innerText = "Tus Favoritos ❤️";
    }
    if (mode !== 'fav') showGrid();
    renderGrid();
}
function showGrid() {
    document.getElementById('grid-view').style.display = 'block';
    document.getElementById('playlist-view').style.display = 'none';
    heroBox.classList.remove('video-mode');
    videoEl.style.display = 'none';
    videoEl.pause();
    document.getElementById('hero-img').style.display = 'block';
}
