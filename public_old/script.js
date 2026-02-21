import { state } from './state.js';
import { setupKeyboard } from './tv-input.js';

// ==================== INICIALIZACIÓN ====================
window.onload = async () => {
    console.log('🎵 AmorList (Modular) Iniciando...');
    
    // 1. Iniciar Subsistemas
    setupKeyboard(); // Motor de TV
    setGreeting();
    loadTheme();
    setupSearch();
    setupMediaSession();
    setupProgressSlider();
    setupServiceWorker();
    setupIntersectionObserver();
    
    // 2. Cargar Datos
    await loadLibrary();
    await loadPlaylists();
    await loadTopPlayed();
    
    // 3. Restaurar estado previo
    loadLastPosition();
    updateBadges();
    
    // 4. Auto-foco para TV (esperar renderizado)
    setTimeout(() => {
        const firstBtn = document.getElementById('btn-pc-audio');
        if (firstBtn) firstBtn.focus();
    }, 1000);
    
    console.log('✅ Sistema listo');
};

// ==================== REPRODUCTOR CORE ====================

function playTrack(playlist, index) {
    // Mobile Audio Context Fix
    if (state.audioContext && state.audioContext.state === 'suspended') state.audioContext.resume();

    state.currentPlaylist = playlist;
    state.currentIndex = index;
    const track = state.currentPlaylist[index];
    if (!track) return;

    // Actualizar UI Player
    document.getElementById('player-img').src = track.cover;
    document.getElementById('player-title').innerText = track.title;
    document.getElementById('player-artist').innerText = track.artist;
    document.getElementById('play-icon').className = "fa-solid fa-pause";
    
    updateLikeButton(track.id);
    updateAmbientColor(track.title);
    addToHistory(track);
    updateTrackListHighlight();

    // Lógica Video vs Audio
    if (track.isVideo) {
        state.isVideoPlaying = true;
        state.audioEl.pause();
        
        document.getElementById('hero-img').style.display = 'none';
        state.videoEl.style.display = 'block';
        if (state.heroImgBox) state.heroImgBox.classList.add('video-mode');
        
        state.videoEl.src = track.src;
        state.videoEl.play();
        
        document.getElementById('player-bar').style.display = 'none';
        if (window.innerWidth < 768) window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        state.isVideoPlaying = false;
        state.videoEl.pause();
        state.videoEl.style.display = 'none';
        
        if (state.heroImgBox) state.heroImgBox.classList.remove('video-mode');
        document.getElementById('hero-img').style.display = 'block';
        document.getElementById('player-bar').style.display = 'flex';
        
        state.audioEl.src = track.src;
        state.audioEl.play().catch(e => console.error("Play error:", e));
        
        if (state.isVisualizerActive) startVisualizer();
    }

    updateMediaSession(track);
    saveState();
}

function togglePlay() {
    const player = state.isVideoPlaying ? state.videoEl : state.audioEl;
    if (player.paused) {
        player.play();
        document.getElementById('play-icon').className = "fa-solid fa-pause";
    } else {
        player.pause();
        document.getElementById('play-icon').className = "fa-solid fa-play";
    }
}

function nextTrack() {
    // Revisar cola primero
    if (state.queueList.length > 0) {
        const nextSong = state.queueList.shift();
        playTrack([nextSong, ...state.currentPlaylist.slice(state.currentIndex + 1)], 0);
        updateQueueUI();
        showToast('▶️ Reproduciendo desde cola');
        return;
    }
    let next = (state.currentIndex + 1) % state.currentPlaylist.length;
    playTrack(state.currentPlaylist, next);
}

function prevTrack() {
    const player = state.isVideoPlaying ? state.videoEl : state.audioEl;
    if (player.currentTime > 3) {
        player.currentTime = 0;
        return;
    }
    let prev = (state.currentIndex - 1 + state.currentPlaylist.length) % state.currentPlaylist.length;
    playTrack(state.currentPlaylist, prev);
}

function changeVolume(delta) {
    let newVol = Math.max(0, Math.min(1, state.audioEl.volume + delta));
    state.audioEl.volume = newVol;
    state.videoEl.volume = newVol;
    
    const volSlider = document.getElementById('vol-slider');
    if (volSlider) volSlider.value = newVol;
    
    // Icono volumen
    const icon = document.querySelector('.player-right .fa-volume-high, .player-right .fa-volume-low, .player-right .fa-volume-xmark');
    if (icon) {
        if (newVol === 0) icon.className = 'fa-solid fa-volume-xmark';
        else if (newVol < 0.5) icon.className = 'fa-solid fa-volume-low';
        else icon.className = 'fa-solid fa-volume-high';
    }
    
    showToast(`🔊 Volumen ${(newVol * 100).toFixed(0)}%`);
}

function toggleMute() {
    const volSlider = document.getElementById('vol-slider');
    if (state.audioEl.volume > 0) {
        state.audioEl.dataset.prevVolume = state.audioEl.volume;
        state.audioEl.volume = 0;
        state.videoEl.volume = 0;
        if(volSlider) volSlider.value = 0;
        showToast('🔇 Mute');
    } else {
        const prev = parseFloat(state.audioEl.dataset.prevVolume) || 1;
        state.audioEl.volume = prev;
        state.videoEl.volume = prev;
        if(volSlider) volSlider.value = prev;
        showToast('🔊 Sonido activado');
    }
}

// ==================== VISTAS Y GRID ====================

function showGrid() {
    document.getElementById('grid-view').style.display = 'block';
    document.getElementById('playlist-view').style.display = 'none';
    document.getElementById('playlists-view').style.display = 'none';
    const qp = document.getElementById('queue-panel');
    if(qp) qp.style.display = 'none';
    
    if (state.heroImgBox) state.heroImgBox.classList.remove('video-mode');
    
    state.videoEl.style.display = 'none';
    state.videoEl.pause();
    
    const heroImg = document.getElementById('hero-img');
    if (heroImg) heroImg.style.display = 'block';
    
    document.getElementById('player-bar').style.display = 'flex';
}

function renderGrid() {
    const container = document.getElementById('albums-container');
    if (!container) return;
    container.innerHTML = '';
    
    // MODO FAVORITOS
    if (state.currentMode === 'fav') {
        let allTracks = [];
        state.fullLibraryData.forEach(alb => allTracks.push(...alb.songs));
        const myFavs = allTracks.filter(t => state.favoriteIds.includes(t.id));
        
        if (myFavs.length === 0) {
            showGrid();
            container.innerHTML = '<p style="opacity:0.6; padding:20px;">Sin favoritos.</p>';
            return;
        }
        document.getElementById('grid-view').style.display = 'none';
        document.getElementById('playlist-view').style.display = 'block';
        openAlbum({ name: "Favoritos ❤️", cover: "https://placehold.co/600?text=Favoritos", songs: myFavs }, true);
        return;
    }
    
    // MODO HISTORIAL
    if (state.currentMode === 'history') {
        if (state.historyList.length === 0) {
            showGrid();
            container.innerHTML = '<p style="opacity:0.6; padding:20px;">Historial vacío.</p>';
            return;
        }
        document.getElementById('grid-view').style.display = 'none';
        document.getElementById('playlist-view').style.display = 'block';
        openAlbum({ name: "Historial", cover: "https://placehold.co/600?text=Historial", songs: [...state.historyList].reverse() }, true);
        return;
    }
    
    // AUDIO / VIDEO NORMAL
    let albumsToRender = [];
    if (state.fullLibraryData) {
        albumsToRender = state.fullLibraryData.map(alb => {
            const filteredSongs = alb.songs.filter(s => 
                state.currentMode === 'video' ? s.isVideo : !s.isVideo
            );
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
        card.setAttribute('tabindex', '0'); // CRUCIAL TV
        
        card.onclick = () => openAlbum(album);
        
        card.innerHTML = `
            <img src="${album.cover}" loading="lazy" onerror="this.src='https://placehold.co/600'">
            <div class="album-title">${album.name}</div>
            <div class="album-desc">${album.songs.length} items</div>
        `;
        container.appendChild(card);
    });
}

function openAlbum(album, isDirect = false) {
    state.currentAlbumData = album;
    
    if (!isDirect) {
        document.getElementById('grid-view').style.display = 'none';
        document.getElementById('playlist-view').style.display = 'block';
        document.getElementById('playlists-view').style.display = 'none';
    }
    
    const heroImg = document.getElementById('hero-img');
    if (heroImg) heroImg.src = album.cover;
    
    document.getElementById('hero-title').innerText = album.name;
    document.getElementById('hero-meta').innerText = `Items: ${album.songs.length}`;

    const tbody = document.getElementById('track-table-body');
    tbody.innerHTML = '';

    album.songs.forEach((song, idx) => {
        const isLiked = state.favoriteIds.includes(song.id);
        const tr = document.createElement('tr');
        tr.className = 'track-row';
        tr.setAttribute('tabindex', '0'); // CRUCIAL TV
        
        tr.onclick = (e) => {
            if (e.target.closest('.btn-icon')) return;
            state.originalPlaylist = [...album.songs];
            playTrack(album.songs, idx);
        };
        
        // Botones internos: Usamos onclick con string que llama a window.function
        tr.innerHTML = `
            <td class="track-num">${idx + 1}</td>
            <td><div class="track-title">${song.title}</div></td>
            <td>
                <button class="btn-icon" tabindex="0" onclick="window.addToQueueFromList('${song.id}', event)">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </td>
            <td style="text-align:right;">
                <button class="btn-icon ${isLiked ? 'liked' : ''}" tabindex="0" onclick="window.toggleLike('${song.id}', this, event)">
                    <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    setTimeout(() => {
        const btn = document.querySelector('.hero-btn');
        if(btn) btn.focus();
    }, 100);
}

// ==================== CARGA DE DATOS ====================
async function loadLibrary() {
    showSkeletonLoader();
    try {
        const res = await fetch('/api/albums');
        state.fullLibraryData = await res.json();
        renderGrid();
    } catch (e) { console.error(e); }
    hideSkeletonLoader();
}

async function loadPlaylists() {
    try {
        const res = await fetch('/api/playlists');
        if (res.ok) state.customPlaylists = await res.json();
    } catch (e) {
        state.customPlaylists = JSON.parse(localStorage.getItem('koteifyPlaylists')) || [];
    }
}

async function loadTopPlayed() {
    try {
        const res = await fetch('/api/stats/top');
        if (res.ok) renderTopPlayed(await res.json());
    } catch (e) {}
}

function renderTopPlayed(songs) {
    const grid = document.getElementById('top-played-grid');
    const section = document.getElementById('top-played-section');
    if (!grid || !songs.length) return;
    
    section.style.display = 'block';
    grid.innerHTML = '';
    
    songs.slice(0, 6).forEach((song) => {
        const item = document.createElement('div');
        item.className = 'top-played-item';
        item.tabIndex = 0;
        
        item.onclick = () => {
            const album = state.fullLibraryData.find(a => a.songs.some(s => s.id === song.id));
            if (album) {
                openAlbum(album);
                setTimeout(() => {
                    const idx = album.songs.findIndex(s => s.id === song.id);
                    if (idx >= 0) playTrack(album.songs, idx);
                }, 300);
            }
        };
        
        item.innerHTML = `
            <img src="${song.cover}" alt="${song.title}">
            <div class="top-played-info">
                <div class="top-played-title">${song.title}</div>
                <div class="top-played-count">${song.playCount} reprod.</div>
            </div>
        `;
        grid.appendChild(item);
    });
}

// ==================== FUNCIONES FALTANTES (PLAYLIST MANAGER & REFRESH) ====================

async function refreshLibrary() {
    const icon = document.getElementById('refresh-icon');
    if (icon) icon.classList.add('fa-spin');
    
    showSkeletonLoader();
    try {
        const res = await fetch('/api/refresh');
        if (!res.ok) throw new Error('Error en refresh');
        state.fullLibraryData = await res.json();
        renderGrid();
        showToast('Biblioteca actualizada');
    } catch (e) {
        console.error(e);
        showToast('Error al actualizar');
    }
    
    if (icon) icon.classList.remove('fa-spin');
    hideSkeletonLoader();
}

function openPlaylistManager() {
    showPlaylistsView();
}

function showPlaylistsView() {
    document.getElementById('grid-view').style.display = 'none';
    document.getElementById('playlist-view').style.display = 'none';
    document.getElementById('playlists-view').style.display = 'block';
    document.getElementById('queue-panel').style.display = 'none';
    renderPlaylists();
}

function renderPlaylists() {
    const container = document.getElementById('playlists-container');
    if (!container) return;
    
    if (state.customPlaylists.length === 0) {
        container.innerHTML = '<p style="opacity:0.6; padding:20px;">No tienes playlists.</p>';
        return;
    }
    
    container.innerHTML = state.customPlaylists.map(pl => `
        <div class="playlist-card" onclick="window.openPlaylist('${pl.id}')">
            <div class="playlist-card-header">
                <div class="playlist-card-cover"><i class="fa-solid fa-music"></i></div>
                <div>
                    <div class="playlist-card-name">${pl.name}</div>
                    <div class="playlist-card-count">${pl.songs.length} canciones</div>
                </div>
            </div>
            <button class="hero-btn secondary" onclick="window.deletePlaylist('${pl.id}'); event.stopPropagation();">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function createNewPlaylist() {
    const modal = document.getElementById('playlist-modal');
    if(modal) {
        modal.style.display = 'flex';
        const input = document.getElementById('new-playlist-name');
        if(input) { input.value = ''; input.focus(); }
    }
}

async function saveNewPlaylist() {
    const input = document.getElementById('new-playlist-name');
    const name = input?.value?.trim();
    if (!name) return;
    
    const newPl = { id: `pl_${Date.now()}`, name: name, songs: [], createdAt: new Date().toISOString() };
    
    try {
        await fetch('/api/playlists', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(newPl)
        });
        state.customPlaylists.push(newPl);
    } catch (e) {
        state.customPlaylists.push(newPl);
        localStorage.setItem('koteifyPlaylists', JSON.stringify(state.customPlaylists));
    }
    
    document.getElementById('playlist-modal').style.display = 'none';
    renderPlaylists();
    showToast(`Playlist "${name}" creada`);
}

function openPlaylist(id) {
    const pl = state.customPlaylists.find(p => p.id === id);
    if (pl) openAlbum(pl, true);
}

async function deletePlaylist(id) {
    if (!confirm('¿Eliminar playlist?')) return;
    try {
        await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
    } catch(e) {}
    
    state.customPlaylists = state.customPlaylists.filter(p => p.id !== id);
    localStorage.setItem('koteifyPlaylists', JSON.stringify(state.customPlaylists));
    renderPlaylists();
    showToast('Playlist eliminada');
}

function closePlaylistModal() {
    const modal = document.getElementById('playlist-modal');
    if(modal) modal.style.display = 'none';
}

function closeStatsModal() {
    const modal = document.getElementById('stats-modal');
    if(modal) modal.style.display = 'none';
}

async function showStats() {
    const modal = document.getElementById('stats-modal');
    const container = document.getElementById('stats-container');
    if (!modal) return;
    modal.style.display = 'flex';
    container.innerHTML = '<p>Cargando...</p>';
    
    try {
        const [statsRes, topRes] = await Promise.all([
            fetch('/api/stats'),
            fetch('/api/stats/top')
        ]);
        const stats = await statsRes.json();
        const topSongs = await topRes.json();
        
        const totalPlays = Object.values(stats.plays || {}).reduce((a, b) => a + b, 0);
        
        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card"><div class="stat-value">${totalPlays}</div><div>Plays</div></div>
                <div class="stat-card"><div class="stat-value">${state.favoriteIds.length}</div><div>Favs</div></div>
            </div>
            <h4>🔥 Top 5</h4>
            <div class="top-songs-list">
                ${topSongs.slice(0, 5).map((s, i) => `
                    <div class="top-song-item"><span>#${i + 1}</span> ${s.title} (${s.playCount})</div>
                `).join('')}
            </div>
        `;
    } catch (e) {
        container.innerHTML = 'Error al cargar estadísticas';
    }
}

// ==================== FEATURES AUXILIARES ====================

function handleBackKey(e) {
    if (e) e.preventDefault();
    
    const modals = ['lyrics-modal', 'playlist-modal', 'stats-modal', 'queue-panel'];
    for(let id of modals) {
        const m = document.getElementById(id);
        if(m && m.style.display !== 'none') {
            m.style.display = 'none';
            return;
        }
    }
    
    const pv = document.getElementById('playlist-view');
    const plv = document.getElementById('playlists-view');
    if ((pv && pv.style.display !== 'none') || (plv && plv.style.display !== 'none')) {
        showGrid();
        setTimeout(() => {
            const card = document.querySelector('.album-card');
            if(card) {
                card.focus();
                card.scrollIntoView({block: 'center'});
            }
        }, 100);
    }
}

// ==================== EXPONER A WINDOW (CRUCIAL PARA TV Y HTML) ====================

window.togglePlay = togglePlay;
window.nextTrack = nextTrack;
window.prevTrack = prevTrack;
window.changeVolume = changeVolume;
window.toggleMute = toggleMute;
window.handleBackKey = handleBackKey;

// Funciones del Playlist Manager
window.openPlaylistManager = openPlaylistManager;
window.createNewPlaylist = createNewPlaylist;
window.saveNewPlaylist = saveNewPlaylist;
window.deletePlaylist = deletePlaylist;
window.openPlaylist = openPlaylist;
window.closePlaylistModal = closePlaylistModal;

// Funciones de Refresco y Stats
window.refreshLibrary = refreshLibrary;
window.showStats = showStats;
window.closeStatsModal = closeStatsModal;

window.switchMode = function(mode) {
    state.currentMode = mode;
    document.querySelectorAll('.nav-btn, .mob-btn').forEach(b => b.classList.remove('active'));
    
    const map = {
        'audio': ['btn-pc-audio', 'btn-mob-audio', 'Tu Música'],
        'video': ['btn-pc-video', 'btn-mob-video', 'Tus Videos'],
        'fav': ['btn-pc-fav', 'btn-mob-fav', 'Favoritos'],
        'history': ['btn-pc-history', 'btn-mob-history', 'Historial']
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
};

window.playAllAlbum = () => {
    if (state.currentAlbumData) {
        state.originalPlaylist = [...state.currentAlbumData.songs];
        playTrack(state.currentAlbumData.songs, 0);
    }
};

window.shuffleAllAlbum = () => {
    if (state.currentAlbumData) {
        const shuffled = [...state.currentAlbumData.songs].sort(() => Math.random() - 0.5);
        state.originalPlaylist = [...state.currentAlbumData.songs];
        playTrack(shuffled, 0);
        showToast('🔀 Modo aleatorio');
    }
};

window.toggleShuffle = function() {
    state.isShuffle = !state.isShuffle;
    document.getElementById('btn-shuffle').classList.toggle('is-active', state.isShuffle);
    if (state.isShuffle) {
        const current = state.currentPlaylist[state.currentIndex];
        let shuffled = [...state.currentPlaylist].sort(() => Math.random() - 0.5);
        shuffled = shuffled.filter(t => t.id !== current.id);
        shuffled.unshift(current);
        state.currentPlaylist = shuffled;
        state.currentIndex = 0;
        showToast('🔀 Aleatorio activado');
    } else if (state.originalPlaylist.length) {
        const id = state.currentPlaylist[state.currentIndex].id;
        state.currentPlaylist = [...state.originalPlaylist];
        state.currentIndex = state.currentPlaylist.findIndex(t => t.id === id);
        showToast('➡️ Orden original');
    }
};

window.toggleRepeat = function() {
    state.repeatMode = (state.repeatMode + 1) % 3;
    const btn = document.getElementById('btn-repeat');
    btn.className = 'ctrl-btn' + (state.repeatMode > 0 ? ' is-active' : '');
    
    if (state.repeatMode === 2) {
        btn.innerHTML = '<i class="fa-solid fa-repeat"></i><span style="font-size:10px;position:absolute;top:-2px;right:-2px;">1</span>';
        showToast('🔂 Repetir una');
    } else {
        btn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
        if (state.repeatMode === 1) showToast('🔁 Repetir todo');
        else showToast('➡️ Sin repetir');
    }
};

window.addToQueueFromList = function(id, e) {
    if(e) { e.stopPropagation(); e.preventDefault(); }
    if(state.currentAlbumData) {
        const s = state.currentAlbumData.songs.find(x => x.id === id);
        if(s) {
            state.queueList.push(s);
            updateQueueUI();
            showToast('Añadida a cola');
        }
    }
};

window.toggleLike = function(id, btn, e) {
    if(e) e.stopPropagation();
    if(state.favoriteIds.includes(id)) {
        state.favoriteIds = state.favoriteIds.filter(f => f !== id);
        if(btn) { btn.classList.remove('liked'); btn.innerHTML = '<i class="fa-regular fa-heart"></i>'; }
        showToast('Quitado de favoritos');
    } else {
        state.favoriteIds.push(id);
        if(btn) { btn.classList.add('liked'); btn.innerHTML = '<i class="fa-solid fa-heart"></i>'; }
        showToast('❤️ Favorito');
    }
    localStorage.setItem('koteifyLikes', JSON.stringify(state.favoriteIds));
    updateBadges();
    updateLikeButton(id);
};

window.toggleVisualizer = function() {
    state.isVisualizerActive = !state.isVisualizerActive;
    document.getElementById('btn-visualizer').classList.toggle('is-active', state.isVisualizerActive);
    const cvs = document.getElementById('visualizer-canvas');
    if(state.isVisualizerActive) {
        if(cvs) cvs.classList.add('active');
        startVisualizer();
        showToast('🌈 Visualizador ON');
    } else {
        if(cvs) cvs.classList.remove('active');
        showToast('Visualizador OFF');
    }
};

window.toggleCassetteMode = function() {
    state.isCassetteMode = !state.isCassetteMode;
    document.getElementById('btn-cassette').classList.toggle('is-active', state.isCassetteMode);
    if(state.heroImgBox) state.heroImgBox.classList.toggle('spinning', state.isCassetteMode);
};

window.toggleSleepTimer = function() {
    const btn = document.getElementById('btn-sleep');
    if (state.sleepTimer) {
        clearTimeout(state.sleepTimer);
        state.sleepTimer = null;
        btn.classList.remove('is-active');
        showToast('🌙 Timer cancelado');
    } else {
        const mins = prompt("⏰ Minutos:", "30");
        if (mins && !isNaN(mins) && parseInt(mins) > 0) {
            state.sleepTimer = setTimeout(() => {
                state.audioEl.pause();
                state.videoEl.pause();
                showToast('🌙 Buenas noches');
                btn.classList.remove('is-active');
            }, parseInt(mins) * 60000);
            btn.classList.add('is-active');
            showToast(`🌙 Apagando en ${mins} min`);
        }
    }
};

window.toggleLyrics = function() {
    const modal = document.getElementById('lyrics-modal');
    if(modal) {
        if(modal.style.display === 'none') {
            const track = state.currentPlaylist[state.currentIndex];
            if(!track) return;
            document.getElementById('lyrics-song-title').innerText = track.title;
            const container = document.getElementById('lyrics-text');
            container.innerHTML = 'Cargando...';
            modal.style.display = 'flex';
            
            fetch(`/api/lyrics?artist=${encodeURIComponent(track.artist || 'L Arc en Ciel')}&title=${encodeURIComponent(track.title)}`)
                .then(r => r.json())
                .then(d => {
                    container.innerHTML = d.lyrics ? `<pre style="white-space: pre-wrap;">${d.lyrics}</pre>` : 'No encontrada';
                });
        } else {
            modal.style.display = 'none';
        }
    }
};

window.openQueuePanel = function() {
    const p = document.getElementById('queue-panel');
    if(p) {
        p.style.display = p.style.display === 'none' ? 'block' : 'none';
        updateQueueUI();
    }
};

window.playQueueItem = function(i) {
    const s = state.queueList[i];
    state.queueList.splice(i, 1);
    playTrack([s], 0);
    updateQueueUI();
};

window.removeFromQueue = function(i) {
    state.queueList.splice(i, 1);
    updateQueueUI();
};

// ==================== HELPERS ====================

function showToast(msg) {
    const c = document.getElementById('toast-container');
    if(!c) return;
    const t = document.createElement('div');
    t.className = 'toast info';
    t.innerHTML = `<span class="toast-message">${msg}</span>`;
    c.appendChild(t);
    setTimeout(() => {
        t.classList.add('hiding');
        setTimeout(() => t.remove(), 300);
    }, 3000);
}

function updateQueueUI() {
    const badge = document.getElementById('queue-badge-pc');
    if(badge) {
        badge.style.display = state.queueList.length ? 'inline' : 'none';
        badge.textContent = state.queueList.length;
    }
    const list = document.getElementById('queue-list');
    if(list) {
        list.innerHTML = state.queueList.map((s, i) => `
            <div class="queue-item" onclick="window.playQueueItem(${i})">
                <div class="queue-item-title">${s.title}</div>
                <button onclick="window.removeFromQueue(${i}); event.stopPropagation()">x</button>
            </div>
        `).join('');
    }
}

function updateBadges() {
    const b = document.getElementById('fav-badge-pc');
    if(b) {
        b.style.display = state.favoriteIds.length ? 'inline' : 'none';
        b.innerText = state.favoriteIds.length;
    }
}

function updateLikeButton(id) {
    const btn = document.getElementById('btn-like-current');
    if (btn) {
        const isLiked = state.favoriteIds.includes(id);
        btn.innerHTML = `<i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>`;
        btn.className = `ctrl-btn ${isLiked ? 'is-active' : ''}`;
    }
}

function updateAmbientColor(str) {
    if (state.isVideoPlaying) return;
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    const hex = "#" + "00000".substring(0, 6 - c.length) + c;
    const bg = document.getElementById('dynamic-bg');
    if (bg) bg.style.background = `radial-gradient(circle at 50% -20%, ${hex}66, var(--bg-main))`;
}

function addToHistory(track) {
    if (state.historyList.length > 0 && state.historyList[state.historyList.length - 1].id === track.id) return;
    state.historyList.push(track);
    if (state.historyList.length > 50) state.historyList.shift();
    localStorage.setItem('koteifyHistory', JSON.stringify(state.historyList));
}

function saveState() {
    if(state.currentPlaylist[state.currentIndex]) {
        const p = state.isVideoPlaying ? state.videoEl : state.audioEl;
        localStorage.setItem('koteifyState', JSON.stringify({
            track: state.currentPlaylist[state.currentIndex],
            time: p.currentTime,
            playlist: state.currentPlaylist,
            index: state.currentIndex
        }));
    }
}

function loadLastPosition() {
    try {
        const s = JSON.parse(localStorage.getItem('koteifyState'));
        if(s && s.track) {
            state.currentPlaylist = s.playlist || [s.track];
            state.currentIndex = s.index || 0;
            document.getElementById('player-img').src = s.track.cover;
            document.getElementById('player-title').innerText = s.track.title;
            document.getElementById('player-artist').innerText = s.track.artist;
            if(!s.track.isVideo) {
                state.audioEl.src = s.track.src;
                state.audioEl.currentTime = s.time;
            }
        }
    } catch(e){}
}

function setupMediaSession() {
    if('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', togglePlay);
        navigator.mediaSession.setActionHandler('pause', togglePlay);
        navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
        navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
    }
}

function updateMediaSession(t) {
    if('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: t.title, artist: t.artist, artwork: [{src: t.cover}]
        });
    }
}

function setupProgressSlider() {
    const s = document.getElementById('seek-slider');
    const p = [state.audioEl, state.videoEl];
    
    if(s) {
        s.addEventListener('input', () => state.isDragging = true);
        s.addEventListener('change', (e) => {
            state.isDragging = false;
            (state.isVideoPlaying ? state.videoEl : state.audioEl).currentTime = e.target.value;
        });
    }
    
    p.forEach(el => {
        el.addEventListener('timeupdate', () => {
            if(state.isDragging || !s) return;
            s.max = el.duration || 0;
            s.value = el.currentTime;
            
            const cur = document.getElementById('curr-time');
            const tot = document.getElementById('total-time');
            if(cur) cur.innerText = fmtTime(el.currentTime);
            if(tot) tot.innerText = fmtTime(el.duration);
            
            const pct = (el.currentTime/el.duration)*100;
            s.style.background = `linear-gradient(to right, var(--accent) ${pct}%, var(--border) ${pct}%)`;
            
            if(Math.floor(el.currentTime)%10===0) saveState();
        });
        el.addEventListener('ended', () => {
            if(state.repeatMode === 2) { el.currentTime = 0; el.play(); }
            else nextTrack();
        });
    });
}

function fmtTime(s) {
    if(!s) return "0:00";
    const m = Math.floor(s/60);
    const sc = Math.floor(s%60);
    return `${m}:${sc<10?'0'+sc:sc}`;
}

function setGreeting() {
    const hour = new Date().getHours();
    const msgEl = document.getElementById('greeting-msg');
    let greeting = "Hola ❤️";
    if (hour >= 5 && hour < 12) greeting = "Buenos días ☀️";
    else if (hour >= 12 && hour < 20) greeting = "Buenas tardes 🌸";
    else greeting = "Buenas noches 🌙";
    if (msgEl) msgEl.innerText = greeting;
}

function loadTheme() {
    if (localStorage.getItem('koteifyTheme') === 'kawaii') {
        document.body.setAttribute('data-theme', 'kawaii');
    }
}

function setupSearch() {
    let searchTimeout;
    const input = document.getElementById('search-input');
    if (!input) return;
    input.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const term = e.target.value.toLowerCase().trim();
            const cards = document.querySelectorAll('.album-card');
            cards.forEach(card => {
                const title = card.querySelector('.album-title')?.innerText.toLowerCase() || '';
                card.style.display = title.includes(term) ? 'block' : 'none';
            });
        }, 200);
    });
}

// Visualizer
function startVisualizer() {
    if (!state.audioContext) {
        state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        state.analyser = state.audioContext.createAnalyser();
        state.analyser.fftSize = 256;
        state.source = state.audioContext.createMediaElementSource(state.audioEl);
        state.source.connect(state.analyser);
        state.analyser.connect(state.audioContext.destination);
    }
    if (state.audioContext.state === 'suspended') state.audioContext.resume();
    drawVisualizer();
}

function drawVisualizer() {
    if (!state.isVisualizerActive || !state.analyser) return;
    requestAnimationFrame(drawVisualizer);
    
    const bufferLength = state.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    state.analyser.getByteFrequencyData(dataArray);
    
    const canvas = document.getElementById('visualizer-canvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const barWidth = (canvas.width / bufferLength) * 2.5;
    let x = 0;
    
    for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.5;
        const hue = (i / bufferLength) * 360;
        ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.5)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
    }
}

// Loader
function showSkeletonLoader() {
    const s = document.getElementById('skeleton-container');
    const a = document.getElementById('albums-container');
    if(s) s.style.display = 'grid';
    if(a) a.innerHTML = '';
}
function hideSkeletonLoader() {
    const s = document.getElementById('skeleton-container');
    if(s) s.style.display = 'none';
}

function updateTrackListHighlight() {
    document.querySelectorAll('.track-row.playing').forEach(el => el.classList.remove('playing'));
    if (state.currentPlaylist[state.currentIndex]) {
        const currentId = state.currentPlaylist[state.currentIndex].id;
        document.querySelectorAll('.track-row').forEach(row => {
            const likeBtn = row.querySelector('.btn-icon');
            if (likeBtn && row.innerHTML.includes(currentId)) {
                row.classList.add('playing');
            }
        });
    }
}

// Service Worker
async function setupServiceWorker() {
    if ('serviceWorker' in navigator) {
        try { await navigator.serviceWorker.register('/sw.js'); } catch (e) {}
    }
}

function setupIntersectionObserver() {
    if (!('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
                observer.unobserve(img);
            }
        });
    });
}