// public/script.js

// --- VARIABLES GLOBALES ---
let fullLibraryData = [];
let currentMode = 'audio';
let favoriteIds = JSON.parse(localStorage.getItem('koteifyLikes')) || [];
let historyList = JSON.parse(localStorage.getItem('koteifyHistory')) || [];
let currentPlaylist = [];
let currentIndex = 0;
let isVideoPlaying = false;
let isDragging = false;

// Variables avanzadas
let isShuffle = false;
let repeatMode = 0; 
let originalPlaylist = [];
let sleepTimer = null;
let isCassetteMode = false;

// Elementos DOM
const audioEl = new Audio();
// IMPORTANTE: Permitir que el audio se lea para el visualizador
audioEl.crossOrigin = "anonymous"; 

const videoEl = document.getElementById('hero-video');
const heroImgBox = document.getElementById('hero-img-box');

// Visualizador
let audioContext;
let analyser;
let source;
let isVisualizerSetup = false;

// --- INICIALIZACIÓN ---
window.onload = async () => {
    setGreeting();
    loadTheme();
    setupSearch();
    setupKeyboard();
    setupMediaSession();
    
    await loadLibrary();
    loadLastPosition(); 
};

// --- VISUALIZADOR DE AUDIO ---
function setupVisualizer() {
    if (isVisualizerSetup) return;
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        source = audioContext.createMediaElementSource(audioEl);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        analyser.fftSize = 64;
        isVisualizerSetup = true;
        drawVisualizer();
    } catch(e) { console.log("Visualizador no soportado o bloqueado", e); }
}

function drawVisualizer() {
    const canvas = document.getElementById('visualizer');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    function animate() {
        if(!isVideoPlaying && !audioEl.paused) {
            requestAnimationFrame(animate);
            analyser.getByteFrequencyData(dataArray);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const barWidth = (canvas.width / bufferLength) * 2.5;
            let barHeight;
            let x = 0;

            for(let i = 0; i < bufferLength; i++) {
                barHeight = dataArray[i] / 2;
                ctx.fillStyle = `rgba(255, 255, 255, ${barHeight/255})`;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        }
    }
    animate();
}

// --- COLOR CAMALEÓN (Simulado) ---
function updateAmbientColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    const hex = "#" + "00000".substring(0, 6 - c.length) + c;
    
    const bg = document.getElementById('dynamic-bg');
    if(bg) bg.style.background = `radial-gradient(circle at 50% -20%, ${hex}66, var(--bg-main))`;
}

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
            card.style.display = title.includes(term) ? 'block' : 'none';
        });
    });
}

// --- CARGA ---
async function loadLibrary() {
    try {
        const res = await fetch('/api/albums');
        if (!res.ok) throw new Error('Error');
        fullLibraryData = await res.json();
        renderGrid();
    } catch (e) { 
        const container = document.getElementById('albums-container');
        if(container) container.innerHTML = '<p style="padding:20px;">Cargando... (Si tarda, actualiza la página)</p>';
    }
}

// --- NAVEGACIÓN ---
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
    
    if(map[mode]) {
        map[mode].slice(0, 2).forEach(id => {
            const el = document.getElementById(id);
            if(el) el.classList.add('active');
        });
        document.getElementById('page-title').innerText = map[mode][2];
    }

    if (mode !== 'fav' && mode !== 'history') showGrid();
    renderGrid();
}

function showGrid() {
    const gridView = document.getElementById('grid-view');
    const playlistView = document.getElementById('playlist-view');
    const heroImg = document.getElementById('hero-img');
    const monthly = document.getElementById('monthly-featured');
    
    if(gridView) gridView.style.display = 'block';
    if(playlistView) playlistView.style.display = 'none';
    if(monthly) monthly.style.display = currentMode === 'audio' ? 'block' : 'none';
    
    if(heroImgBox) heroImgBox.classList.remove('video-mode');
    if(videoEl) { videoEl.style.display = 'none'; videoEl.pause(); }
    if(heroImg) heroImg.style.display = 'block';
}

// --- RENDER ---
function renderGrid() {
    const container = document.getElementById('albums-container');
    if (!container) return;
    container.innerHTML = '';
    
    if (currentMode === 'fav') {
        let allTracks = [];
        if(fullLibraryData) fullLibraryData.forEach(alb => allTracks.push(...alb.songs));
        const myFavs = allTracks.filter(t => favoriteIds.includes(t.id));
        
        if (myFavs.length === 0) {
            showGrid();
            container.innerHTML = `<p style="opacity:0.6; padding:20px;">No tienes favoritos aún.</p>`;
            return;
        }
        document.getElementById('grid-view').style.display = 'none';
        document.getElementById('playlist-view').style.display = 'block';
        openAlbum({ name: "Mis Favoritos", cover: "https://placehold.co/600?text=Favoritos", songs: myFavs }, true);
        return;
    } 

    if (currentMode === 'history') {
        if (historyList.length === 0) {
            showGrid();
            container.innerHTML = `<p style="opacity:0.6; padding:20px;">Aún no has escuchado nada.</p>`;
            return;
        }
        document.getElementById('grid-view').style.display = 'none';
        document.getElementById('playlist-view').style.display = 'block';
        openAlbum({ name: "Historial", cover: "https://placehold.co/600?text=Historial", songs: [...historyList].reverse() }, true);
        return;
    }
    
    let albumsToRender = [];
    if(fullLibraryData) {
        albumsToRender = fullLibraryData.map(alb => {
            const filteredSongs = alb.songs.filter(s => currentMode === 'video' ? s.isVideo : !s.isVideo);
            return { ...alb, songs: filteredSongs };
        }).filter(alb => alb.songs.length > 0);
    }

    if(albumsToRender.length === 0) {
        container.innerHTML = `<p style="opacity:0.6;">No hay contenido disponible.</p>`;
        return;
    }

    albumsToRender.forEach(album => {
        const card = document.createElement('div');
        card.className = 'album-card';
        card.onclick = () => openAlbum(album);
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'album-title';
        titleDiv.innerText = album.name;
        
        const descDiv = document.createElement('div');
        descDiv.className = 'album-desc';
        descDiv.innerText = `${album.songs.length} canciones`;
        
        const img = document.createElement('img');
        img.src = album.cover;
        img.loading = 'lazy';
        
        card.appendChild(img);
        card.appendChild(titleDiv);
        card.appendChild(descDiv);
        container.appendChild(card);
    });
}

function openAlbum(album, isDirect = false) {
    if(!isDirect) {
        document.getElementById('grid-view').style.display = 'none';
        document.getElementById('playlist-view').style.display = 'block';
    }
    const heroImg = document.getElementById('hero-img');
    if(heroImg) heroImg.src = album.cover;
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

// --- CORE REPRODUCTOR ---
function playTrack(playlist, index) {
    currentPlaylist = playlist;
    currentIndex = index;
    const track = currentPlaylist[index];

    document.getElementById('player-img').src = track.cover;
    document.getElementById('player-title').innerText = track.title;
    document.getElementById('player-artist').innerText = track.artist;
    document.getElementById('play-icon').className = "fa-solid fa-pause";
    
    updateAmbientColor(track.title);
    addToHistory(track);

    if(track.isVideo) {
        isVideoPlaying = true;
        audioEl.pause();
        document.getElementById('hero-img').style.display = 'none';
        videoEl.style.display = 'block';
        if(heroImgBox) heroImgBox.classList.add('video-mode');
        videoEl.src = track.src;
        videoEl.play();
        if(window.innerWidth < 768) window.scrollTo({top:0, behavior:'smooth'});
    } else {
        isVideoPlaying = false;
        videoEl.pause();
        if(heroImgBox) heroImgBox.classList.remove('video-mode');
        document.getElementById('hero-img').style.display = 'block';
        videoEl.style.display = 'none';
        
        audioEl.src = track.src;
        audioEl.play().then(() => {
            if(!isVisualizerSetup) setupVisualizer();
        }).catch(e => console.log("Play error:", e));
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
        if(!isVideoPlaying) setupVisualizer();
    } else {
        player.pause();
        playIcon.className = "fa-solid fa-play";
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

// --- FEATURES EXTRA ---
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
    } else if(originalPlaylist.length) {
        const id = currentPlaylist[currentIndex].id;
        currentPlaylist = [...originalPlaylist];
        currentIndex = currentPlaylist.findIndex(t => t.id === id);
    }
}

function toggleRepeat() {
    repeatMode = (repeatMode + 1) % 3;
    const btn = document.getElementById('btn-repeat');
    btn.className = 'ctrl-btn' + (repeatMode > 0 ? ' is-active' : '');
    btn.innerHTML = repeatMode === 2 ? '<i class="fa-solid fa-repeat">1</i>' : '<i class="fa-solid fa-repeat"></i>';
}

function toggleCassetteMode() {
    isCassetteMode = !isCassetteMode;
    document.getElementById('btn-cassette').classList.toggle('is-active', isCassetteMode);
    if(heroImgBox) heroImgBox.classList.toggle('spinning', isCassetteMode);
}

function toggleSleepTimer() {
    const btn = document.getElementById('btn-sleep');
    if(sleepTimer) {
        clearTimeout(sleepTimer);
        sleepTimer = null;
        btn.classList.remove('is-active');
        alert("🌙 Temporizador cancelado.");
    } else {
        const mins = prompt("¿En cuántos minutos apago la música?", "30");
        if(mins && !isNaN(mins)) {
            sleepTimer = setTimeout(() => {
                audioEl.pause();
                videoEl.pause();
                alert("💤 Buenas noches...");
            }, mins * 60000);
            btn.classList.add('is-active');
            alert(`🌙 Temporizador configurado para ${mins} minutos.`);
        }
    }
}

function toggleLyrics() {
    const lyricsBox = document.getElementById('lyrics-container');
    if(lyricsBox.style.display === 'none') {
        lyricsBox.style.display = 'block';
    } else {
        lyricsBox.style.display = 'none';
    }
}

// --- HISTORIAL ---
function addToHistory(track) {
    if(historyList.length > 0 && historyList[historyList.length-1].id === track.id) return;
    historyList.push(track);
    if(historyList.length > 20) historyList.shift();
    localStorage.setItem('koteifyHistory', JSON.stringify(historyList));
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

function updateProgress(e) {
    if(isDragging) return;
    const { duration, currentTime } = e.srcElement;
    if(!duration) return;
    const slider = document.getElementById('seek-slider');
    slider.max = duration;
    slider.value = currentTime;
    const p = (currentTime / duration) * 100;
    slider.style.backgroundSize = `${p}% 100%`;
    document.getElementById('curr-time').innerText = formatTime(currentTime);
    document.getElementById('total-time').innerText = formatTime(duration);
    if (Math.floor(currentTime) % 5 === 0) saveState();
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0'+sec : sec}`;
}

// --- EVENTOS ---
[audioEl, videoEl].forEach(media => {
    media.addEventListener('timeupdate', updateProgress);
    media.addEventListener('ended', () => {
        if (repeatMode === 2) {
            media.currentTime = 0; media.play();
        } else { nextTrack(); }
    });
});

const seek = document.getElementById('seek-slider');
seek.addEventListener('input', (e) => { isDragging=true; e.target.style.backgroundSize = `${(e.target.value/e.target.max)*100}% 100%`; });
seek.addEventListener('change', (e) => { isDragging=false; (isVideoPlaying?videoEl:audioEl).currentTime = e.target.value; });

document.getElementById('vol-slider').addEventListener('input', (e) => { audioEl.volume = e.target.value; videoEl.volume = e.target.value; });

// Media Session y Teclado
function setupMediaSession() {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', togglePlay);
        navigator.mediaSession.setActionHandler('pause', togglePlay);
        navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
        navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
    }
}
function updateMediaSession(t) {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, artwork: [{ src: t.cover }] });
    }
}
function setupKeyboard() {
    document.addEventListener('keydown', (e) => {
        if(e.code==='Space') { e.preventDefault(); togglePlay(); }
        else if(e.code==='ArrowRight') nextTrack();
        else if(e.code==='ArrowLeft') prevTrack();
    });
}

function saveState() {
    if(!currentPlaylist[currentIndex]) return;
    const s = { track: currentPlaylist[currentIndex], time: (isVideoPlaying?videoEl:audioEl).currentTime, playlist: currentPlaylist, index: currentIndex };
    localStorage.setItem('koteifyState', JSON.stringify(s));
}
function loadLastPosition() {
    try {
        const s = JSON.parse(localStorage.getItem('koteifyState'));
        if(s && s.track) {
            currentPlaylist = s.playlist || [s.track];
            currentIndex = s.index || 0;
            document.getElementById('player-img').src = s.track.cover;
            document.getElementById('player-title').innerText = s.track.title;
            document.getElementById('player-artist').innerText = s.track.artist;
            if(s.track.isVideo) { videoEl.src = s.track.src; videoEl.currentTime = s.time; }
            else { audioEl.src = s.track.src; audioEl.currentTime = s.time; }
        }
    } catch(e){}
}

// FUNCIÓN MEJORADA: Reproducir Historial
function playMonthlyTop() {
    if(historyList.length > 0) {
        // Reproducir historial como si fuera el "top"
        openAlbum({ name: "Top Reciente", cover: "https://placehold.co/600?text=Top+Mes", songs: [...historyList].reverse() }, false);
        // Reproducir la primera
        setTimeout(() => playTrack([...historyList].reverse(), 0), 500);
    } else {
        alert("¡Escucha más música para generar tu Top del Mes!");
    }
}
