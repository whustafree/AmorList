import { playerStore } from '../store/playerStore.js';

export function setupTVControls() {
  window.addEventListener('keydown', (e) => {
    // Obtenemos la tecla presionada (por nombre o por número de código de la TV)
    const key = e.key || e.keyCode;

    // 1. TECLAS DE REPRODUCCIÓN (Botones multimedia del control o Espacio en teclado)
    if (key === 'MediaPlayPause' || key === ' ' || key === 'Spacebar') {
      e.preventDefault(); // Evitamos que la pantalla salte si presionamos espacio
      playerStore.togglePlay();
    } 
    else if (key === 'MediaTrackNext' || key === 'MediaFastForward' || key === 'n') {
      playerStore.nextTrack();
    } 
    else if (key === 'MediaTrackPrevious' || key === 'MediaRewind' || key === 'p') {
      playerStore.prevTrack();
    }

    // 2. BOTÓN "VOLVER" O "ATRÁS" (Escape, Retroceso, o botones físicos de Samsung/LG)
    // 10009 = Código de botón Atrás en Samsung Tizen
    // 461 = Código de botón Atrás en LG WebOS
    if (key === 'Escape' || key === 'Backspace' || e.keyCode === 10009 || e.keyCode === 461) {
      e.preventDefault();
      
      // Lógica de "escape" inteligente:
      // Primero intenta cerrar un video si está abierto
      if (playerStore.isVideoPlaying) {
        playerStore.isVideoPlaying = false;
        playerStore.isPlaying = false;
      } 
      // Si no hay video, intenta cerrar el panel de la cola si está abierto
      else if (playerStore.isQueueOpen) {
        playerStore.isQueueOpen = false;
      } 
      // Si no hay paneles abiertos, cierra el disco y vuelve a la grilla principal
      else if (playerStore.currentAlbumData) {
        playerStore.currentAlbumData = null;
        if (playerStore.currentMode === 'fav' || playerStore.currentMode === 'history') {
          playerStore.currentMode = 'audio';
        }
      }
    }
  });

  console.log("📺 Controles de Smart TV inicializados");
}