// public/script.js

let fullLibraryData = [];
let currentMode = 'audio';
let favoriteIds = JSON.parse(localStorage.getItem('koteifyLikes')) || [];
let currentPlaylist = [];
let currentIndex = 0;
let isVideoPlaying = false;
let isDragging = false;

const audioEl = new Audio();
const videoEl = document.getElementById('hero-video');
const heroImg = document.getElementById('hero-img');
const heroBox = document.getElementById('hero-img-box');

// --- GESTOS (SWIPE) PARA MÓVIL ---
let touchStartX = 0;
let touchEndX = 0;

heroBox.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
}, {passive: true});

heroBox.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}, {passive: true});

function handleSwipe() {
    const threshold = 50;
    if (touchEndX < touchStartX - threshold) {
        nextTrack();
    }
    if (touchEndX > touchStartX + threshold) {
        prevTrack();
    }
}
// ------------------------------------

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
if(localStorage.getItem('koteifyTheme') === 'kawaii') {
    document.body.setAttribute('data-theme', 'kawaii');
}

async function loadLibrary() {
    try {
        const res = await fetch('/api/albums');
        fullLibraryData = await res.json();
        renderGrid();
    } catch (e) { console.error("Error:", e); }
}

function switchMode(mode) {
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
    showGrid();
    renderGrid();
}

function showGrid() {
    document.getElementById('grid-view').style.display = 'block';
    document.getElementById('playlist-view').style.display = 'none';
    heroBox.classList.remove('video-mode');
    videoEl.style.display = 'none';
    videoEl.pause();
    heroImg.style.display = 'block';
}

function renderGrid() {
    const container = document.getElementById('albums-container');
    container.innerHTML = '';
    let albumsToRender = [];
    if (currentMode === 'fav') {
        let allTracks = [];
        fullLibraryData.forEach(alb => allTracks.push(...alb.songs));
        const myFavs = allTracks.filter(t => favoriteIds.includes(t.id));
        if (myFavs.length === 0) {
            container.innerHTML = `<p style="color:var(--text-secondary); padding:20px;">No tienes favoritos aún.</p>`;
            return;
        }
        openAlbum({ name: "Mis Favoritos", cover: "https://placehold.co/600?text=Favoritos", songs: myFavs }, true);
        return;
    } else {
        albumsToRender = fullLibraryData.map(alb => {
            const filteredSongs = alb.songs.filter(s => currentMode === 'video' ? s.isVideo : !s.isVideo);
            return { ...alb, songs: filteredSongs };
        }).filter(alb => alb.songs.length > 0);
    }

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
    heroImg.src = album.cover;
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
            playTrack(album.songs, idx);
        };
        tr.innerHTML = `
            <td class="track-num">${idx + 1}</td>
            <td><div class="track-title">${song.title}</div></td>
            <td style="text-align:right;">
                <button class="btn-icon ${isLiked ? 'liked' : ''}" onclick="toggleLike('${song.id}', this)">
                    <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function playTrack(playlist, index) {
    currentPlaylist = playlist;
    currentIndex = index;
    const track = currentPlaylist[index];
    document.getElementById('player-img').src = track.cover;
    document.getElementById('player-title').innerText = track.title;
    document.getElementById('player-artist').innerText = track.artist;
    document.getElementById('play-icon').className = "fa-solid fa-pause";
    
    const slider = document.getElementById('seek-slider');
    slider.value = 0;
    slider.style.backgroundSize = "0% 100%";

    if(track.isVideo) {
        isVideoPlaying = true;
        audioEl.pause();
        heroImg.style.display = 'none';
        videoEl.style.display = 'block';
        heroBox.classList.add('video-mode');
        videoEl.src = track.src;
        videoEl.play();
        if(window.innerWidth < 768) window.scrollTo({top:0, behavior:'smooth'});
    } else {
        isVideoPlaying = false;
        videoEl.pause();
        heroBox.classList.remove('video-mode');
        heroImg.style.display = 'block';
        videoEl.style.display = 'none';
        audioEl.src = track.src;
        audioEl.play();
    }
}

function togglePlay() {
    const player = isVideoPlaying ? videoEl : audioEl;
    if(player.paused) {
        player.play();
        document.getElementById('play-icon').className = "fa-solid fa-pause";
    } else {
        player.pause();
        document.getElementById('play-icon').className = "fa-solid fa-play";
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
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0'+sec : sec}`;
}

[audioEl, videoEl].forEach(media => {
    media.addEventListener('timeupdate', updateProgress);
    media.addEventListener('ended', nextTrack);
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

function toggleLike(id, btn) {
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

window.onload = loadLibrary;
