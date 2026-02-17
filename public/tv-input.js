import { state } from './state.js';

// NOTA: No importamos nada de script.js para evitar errores de referencia circular.
// Usaremos las funciones globales window.togglePlay, window.nextTrack, etc.

export function setupKeyboard() {
    console.log('🎮 Motor de TV cargado y escuchando...');
    
    document.addEventListener('keydown', (e) => {
        // Ignorar si el usuario escribe en un input
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
                if (e.ctrlKey) window.prevTrack(); // Usamos window.
                else navMove('LEFT');
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (e.ctrlKey) window.nextTrack(); // Usamos window.
                else navMove('RIGHT');
                break;
            case 'Enter':
            case 'NumpadEnter':
                // Simular click visualmente
                if (document.activeElement) {
                    document.activeElement.click();
                    document.activeElement.classList.add('active-press');
                    setTimeout(() => document.activeElement.classList.remove('active-press'), 150);
                }
                break;
            case 'Space':
                e.preventDefault();
                window.togglePlay(); // Usamos window.
                break;
            // Teclas para volumen
            case 'Equal': // Tecla +
            case 'NumpadAdd':
                window.changeVolume(0.1); // Asumiendo que expusiste esto o lo manejas aquí
                break;
            case 'Minus': // Tecla -
            case 'NumpadSubtract':
                window.changeVolume(-0.1);
                break;
            case 'KeyM':
                window.toggleMute();
                break;
            case 'KeyQ':
                window.openQueuePanel();
                break;
            case 'Backspace':
            case 'Escape':
                window.handleBackKey(e);
                break;
        }
    });
}

// Lógica de Navegación Espacial (Sin cambios, funciona perfecto)
function getFocusableElements() {
    const selector = 'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    return Array.from(document.querySelectorAll(selector)).filter(el => {
        return el.offsetParent !== null && !el.disabled && el.style.display !== 'none';
    });
}

function navMove(direction) {
    const activeEl = document.activeElement;
    
    if (!activeEl || activeEl === document.body) {
        const first = document.querySelector('.nav-btn');
        if (first) first.focus();
        return;
    }

    const rect = activeEl.getBoundingClientRect();
    const activeCenter = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
    };

    const candidates = getFocusableElements().filter(el => el !== activeEl);
    let bestCandidate = null;
    let minDistance = Infinity;
    const threshold = 50; 

    candidates.forEach(el => {
        const elRect = el.getBoundingClientRect();
        const elCenter = {
            x: elRect.left + elRect.width / 2,
            y: elRect.top + elRect.height / 2
        };

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
        // Fallbacks inteligentes
        if (direction === 'RIGHT' && activeEl.classList.contains('nav-btn')) {
            const firstCard = document.querySelector('.album-card, .top-played-item');
            if (firstCard) firstCard.focus();
        } else if (direction === 'LEFT' && (activeEl.classList.contains('album-card') || activeEl.classList.contains('top-played-item'))) {
            const navBtn = document.getElementById('btn-pc-audio');
            if (navBtn) navBtn.focus();
        }
    }
}