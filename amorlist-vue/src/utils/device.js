/**
 * Detección inteligente de dispositivo
 * AmorList — TV / Móvil / Tablet / Desktop
 */

const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
const w = typeof window !== 'undefined' ? window : null;

function hasTouch() {
  return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
}

function isAndroidTV() {
  return /android\s+tv|googletv|bravia|smart-tv|tv\s+(launcher|browser)/i.test(ua) ||
         (ua.includes('android') && !ua.includes('mobile'));
}

function isWebOS() {
  return /webos|lg\s+tv|netcast/i.test(ua);
}

function isTizen() {
  return /tizen|samsung\s+tv|smart-tv/i.test(ua);
}

function isAppleTV() {
  return /appletv|tv\s+os/i.test(ua);
}

function isFireTV() {
  return /fire\s+tv|aftb|aftm/i.test(ua);
}

export const device = {
  /** ¿Es una Smart TV o dispositivo similar? */
  get isTV() {
    return isAndroidTV() || isWebOS() || isTizen() || isAppleTV() || isFireTV();
  },

  /** ¿Es un teléfono móvil? */
  get isMobile() {
    if (this.isTV) return false;
    return /mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(ua) && !/tablet|ipad/i.test(ua);
  },

  /** ¿Es una tablet? */
  get isTablet() {
    if (this.isTV) return false;
    return /tablet|ipad|playbook|silk/i.test(ua) || (ua.includes('android') && !ua.includes('mobile'));
  },

  /** ¿Es un navegador de escritorio? */
  get isDesktop() {
    return !this.isTV && !this.isMobile && !this.isTablet;
  },

  /** Tiene pantalla táctil */
  get hasTouch() {
    return hasTouch();
  },

  /** Usa control remoto / teclado como input principal */
  get isRemoteInput() {
    return this.isTV || this.isDesktop;
  },

  /** Factor de escala para UI (TV necesita más grande) */
  get uiScale() {
    if (this.isTV) return 'tv';
    if (this.isMobile) return 'mobile';
    if (this.isTablet) return 'tablet';
    return 'desktop';
  },

  /** Clases CSS para aplicar al contenedor principal */
  get cssClass() {
    const parts = [`device-${this.uiScale}`];
    if (this.hasTouch) parts.push('has-touch');
    if (this.isTV) parts.push('is-tv');
    if (this.isRemoteInput) parts.push('remote-input');
    return parts.join(' ');
  },

  /** Capacitor platform */
  get capacitorPlatform() {
    if (typeof Capacitor !== 'undefined' && Capacitor.getPlatform) {
      return Capacitor.getPlatform();
    }
    return 'web';
  },
};
