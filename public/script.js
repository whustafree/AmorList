// Función mágica para convertir ID de Drive en Audio Reproducible
function getDriveLink(fileId) {
    return `https://docs.google.com/uc?export=open&id=${fileId}`;
}

const songs = [
    {
        title: "La canción de nuestro viaje", // Título que ella verá
        artist: "Su Artista Favorito",
        // Aquí solo pegas el ID que copiaste del enlace de Drive
        src: getDriveLink("1A-xB3_PEGAR_AQUI_EL_ID_DEL_ARCHIVO_MP3"), 
        cover: getDriveLink("1B-yC4_PEGAR_AQUI_EL_ID_DE_LA_FOTO_PORTADA") // ¡También sirve para fotos!
    },
    {
        title: "Nuestra favorita",
        artist: "Su Artista Favorito",
        src: getDriveLink("1C-zD5_OTRO_ID_DE_DRIVE"),
        cover: "assets/img/foto-local.jpg" // Puedes mezclar Drive y archivos locales
    }
];

// ... el resto del código del reproductor sigue igual ...
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