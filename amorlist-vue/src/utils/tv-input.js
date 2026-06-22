import { playerStore } from '../store/playerStore.js';
import { device } from './device.js';

// Códigos de teclas de control remoto de Smart TVs
const TV_KEYS = {
  // Samsung Tizen
  BACK_SAMSUNG: 10009,
  // LG WebOS
  BACK_LG: 461,
  // Android TV / Google TV
  BACK_ANDROID: 4,
  DPAD_UP: 19,
  DPAD_DOWN: 20,
  DPAD_LEFT: 21,
  DPAD_RIGHT: 22,
  DPAD_CENTER: 23,
  MEDIA_PLAY: 85,
  MEDIA_PAUSE: 86,
  MEDIA_STOP: 86,
  // Flechas del teclado
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  ENTER: 'Enter',
};

let controlsInitialized = false;

/** Simula hover/focus al navegar con teclado */
function focusNearestElement(direction) {
  const active = document.activeElement;
  if (!active) return;
  
  const rect = active.getBoundingClientRect();
  const candidates = document.querySelectorAll(
    'button, [tabindex]:not([tabindex="-1"]), .grid > div, [role="button"]'
  );
  
  let nearest = null;
  let nearestDist = Infinity;

  candidates.forEach(el => {
    if (el === active || el.disabled) return;
    const r = el.getBoundingClientRect();
    let dist;
    const dirs = {
      up: r.bottom <= rect.top ? rect.top - r.bottom : Infinity,
      down: r.top >= rect.bottom ? r.top - rect.bottom : Infinity,
      left: r.right <= rect.left ? rect.left - r.right : Infinity,
      right: r.left >= rect.right ? r.left - rect.right : Infinity,
    };
    dist = dirs[direction];
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = el;
    }
  });

  if (nearest) {
    nearest.focus();
    nearest.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

export function setupTVControls() {
  if (controlsInitialized) return;
  controlsInitialized = true;

  // Si no es TV ni teclado, no registramos controles avanzados
  const isTVorDesktop = device.isTV || device.isDesktop;

  window.addEventListener('keydown', (e) => {
    const key = e.key;
    const keyCode = e.keyCode;

    // === TECLAS DE REPRODUCCIÓN ===
    if (key === 'MediaPlayPause' || key === ' ' || keyCode === TV_KEYS.MEDIA_PLAY) {
      e.preventDefault();
      playerStore.togglePlay();
      return;
    }
    if (key === 'MediaTrackNext' || key === 'n') {
      playerStore.nextTrack();
      return;
    }
    if (key === 'MediaTrackPrevious' || key === 'p') {
      playerStore.prevTrack();
      return;
    }

    // === NAVEGACIÓN CON DPAD (TV) O FLECHAS (teclado) ===
    if (isTVorDesktop) {
      const dirMap = {
        [TV_KEYS.ARROW_UP]: 'up',
        [TV_KEYS.ARROW_DOWN]: 'down',
        [TV_KEYS.ARROW_LEFT]: 'left',
        [TV_KEYS.ARROW_RIGHT]: 'right',
        [TV_KEYS.DPAD_UP]: 'up',
        [TV_KEYS.DPAD_DOWN]: 'down',
        [TV_KEYS.DPAD_LEFT]: 'left',
        [TV_KEYS.DPAD_RIGHT]: 'right',
      };
      const dir = dirMap[key] || dirMap[keyCode];
      if (dir) {
        e.preventDefault();
        focusNearestElement(dir);
        return;
      }
    }

    // === BOTÓN "VOLVER" / "ATRÁS" ===
    const isBackKey = key === 'Escape' || key === 'Backspace' ||
      keyCode === TV_KEYS.BACK_SAMSUNG || keyCode === TV_KEYS.BACK_LG || keyCode === TV_KEYS.BACK_ANDROID;

    if (isBackKey) {
      e.preventDefault();

      if (playerStore.isVideoPlaying) {
        playerStore.isVideoPlaying = false;
        playerStore.isPlaying = false;
      } else if (playerStore.isQueueOpen) {
        playerStore.isQueueOpen = false;
      } else if (playerStore.currentAlbumData) {
        playerStore.currentAlbumData = null;
        if (playerStore.currentMode === 'fav' || playerStore.currentMode === 'history') {
          playerStore.currentMode = 'audio';
        }
      }
      return;
    }

    // === ENTER / OK en TV ===
    if (key === TV_KEYS.ENTER || keyCode === TV_KEYS.DPAD_CENTER) {
      const active = document.activeElement;
      if (active && active.tagName === 'BUTTON') {
        active.click();
      }
    }
  });

  // Si es TV, hacer focus en el primer elemento al cargar
  if (device.isTV) {
    setTimeout(() => {
      const first = document.querySelector('button, [tabindex]:not([tabindex="-1"])');
      if (first) first.focus();
    }, 500);
    document.body.classList.add('tv-mode');
    console.log('📺 Modo Smart TV detectado — controles avanzados activados');
  } else if (device.isDesktop) {
    console.log('⌨️ Modo teclado — navegación por flechas activada');
  }
}
