const songs = [
    {
        title: "Canción Favorita 1",
        artist: "Su Grupo Favorito",
        src: "assets/music/cancion1.mp3", // Asegúrate de tener los archivos
        cover: "assets/img/foto1.jpg"
    },
    {
        title: "Esa canción que cantamos",
        artist: "Su Grupo Favorito",
        src: "assets/music/cancion2.mp3",
        cover: "assets/img/foto2.jpg"
    },
    // Agrega todas las que quieras
];

let currentSongIndex = 0;
const audio = document.getElementById('audio-player');
const playBtn = document.getElementById('play');
const title = document.getElementById('track-title');
const cover = document.getElementById('cover-art');

function loadSong(song) {
    title.innerText = song.title;
    audio.src = song.src;
    cover.src = song.cover;
}

function playSong() {
    audio.play();
    playBtn.innerText = "⏸️"; // Cambia a pausa
}

function pauseSong() {
    audio.pause();
    playBtn.innerText = "▶️";
}

playBtn.addEventListener('click', () => {
    const isPlaying = !audio.paused;
    if (isPlaying) {
        pauseSong();
    } else {
        playSong();
    }
});

// Cargar la primera al inicio
loadSong(songs[currentSongIndex]);

// Lógica para botones Next/Prev y barra de progreso...
// (Avísame si quieres que desarrolle esta parte completa)