// public/tv-input.js
import { state } from './state.js';

// Importamos funciones necesarias del script principal (las definiremos luego)
import { 
    nextTrack, prevTrack, togglePlay, changeVolume, toggleMute, 
    openQueuePanel, showGrid, handleBackKey 
} from './script.js';

export function setupKeyboard() {
    console.log('🎮 Cargando motor de TV...');
    
    document.addEventListener('keydown', (e) => {
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
                if (e.ctrlKey) prevTrack();
                else navMove('LEFT');
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (e.ctrlKey) nextTrack();
                else navMove('RIGHT');
                break;
            case 'Enter':
            case 'NumpadEnter':
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
            case 'Equal': case 'NumpadAdd':
                changeVolume(0.1);
                break;
            case 'Minus': case 'NumpadSubtract':
                changeVolume(-0.1);
                break;
            case 'KeyM': toggleMute(); break;
            case 'KeyQ': openQueuePanel(); break;
            case 'Backspace': case 'Escape':
                handleBackKey(e);
                break;
        }
    });

    // Soporte para control remoto físico
    document.addEventListener('keydown', (e) => {
        if (e.keyCode === 10009 || e.key === 'GoBack') handleBackKey(e);
        if (e.keyCode === 415) togglePlay();
        if (e.keyCode === 19) togglePlay();
        if (e.keyCode === 412) prevTrack();
        if (e.keyCode === 417) nextTrack();
    });
}

// Lógica matemática de navegación (El motor espacial)
function navMove(direction) {
    const activeEl = document.activeElement;
    
    if (!activeEl || activeEl === document.body) {
        const first = document.querySelector('.nav-btn');
        if (first) first.focus();
        return;
    }

    const rect = activeEl.getBoundingClientRect();
    const activeCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

    const selector = 'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const candidates = Array.from(document.querySelectorAll(selector)).filter(el => {
        return el !== activeEl && el.offsetParent !== null && !el.disabled && el.style.display !== 'none';
    });

    let bestCandidate = null;
    let minDistance = Infinity;
    const threshold = 50; 

    candidates.forEach(el => {
        const elRect = el.getBoundingClientRect();
        const elCenter = { x: elRect.left + elRect.width / 2, y: elRect.top + elRect.height / 2 };
        
        const deltaX = elCenter.x - activeCenter.x;
        const deltaY = elCenter.y - activeCenter.y;
        let isValid = false;

        switch (direction) {
            case 'UP': isValid = deltaY < -10 && Math.abs(deltaX) < (Math.abs(deltaY) * 2 + threshold); break;
            case 'DOWN': isValid = deltaY > 10 && Math.abs(deltaX) < (Math.abs(deltaY) * 2 + threshold); break;
            case 'LEFT': isValid = deltaX < -10 && Math.abs(deltaY) < (Math.abs(deltaX) * 0.8 + threshold); break;
            case 'RIGHT': isValid = deltaX > 10 && Math.abs(deltaY) < (Math.abs(deltaX) * 0.8 + threshold); break;
        }

        if (isValid) {
            const dist = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
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
        // Fallbacks
        if (direction === 'RIGHT' && activeEl.classList.contains('nav-btn')) {
            const firstCard = document.querySelector('.album-card, .top-played-item');
            if (firstCard) firstCard.focus();
        } else if (direction === 'LEFT' && (activeEl.classList.contains('album-card') || activeEl.classList.contains('top-played-item'))) {
            const navBtn = document.getElementById('btn-pc-audio');
            if (navBtn) navBtn.focus();
        }
    }
}