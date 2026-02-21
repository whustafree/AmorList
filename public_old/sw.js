/**
 * AmorList Service Worker v2.0
 * Caché inteligente para modo offline y rendimiento optimizado
 */

const CACHE_NAME = 'amorlist-v2';
const STATIC_CACHE = 'amorlist-static-v2';
const DYNAMIC_CACHE = 'amorlist-dynamic-v2';
const IMAGE_CACHE = 'amorlist-images-v2';

// Assets estáticos a cachear inmediatamente
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/script.js',
    '/style.css',
    '/manifest.json',
    '/logo.png',
    '/logokawai.png'
];

// Patrones para diferentes tipos de caché
const CACHE_STRATEGIES = {
    // Cache First - para assets estáticos
    static: { cache: STATIC_CACHE, strategy: 'cache-first' },
    // Network First - para API
    api: { cache: DYNAMIC_CACHE, strategy: 'network-first' },
    // Stale While Revalidate - para imágenes
    image: { cache: IMAGE_CACHE, strategy: 'stale-while-revalidate' }
};

// ==================== INSTALACIÓN ====================

self.addEventListener('install', (event) => {
    console.log('[SW] Instalando Service Worker...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Cacheando assets estáticos');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Instalación completada');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Error en instalación:', error);
            })
    );
});

// ==================== ACTIVACIÓN ====================

self.addEventListener('activate', (event) => {
    console.log('[SW] Activando Service Worker...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            // Eliminar cachés antiguas
                            return name.startsWith('amorlist-') && 
                                   name !== STATIC_CACHE && 
                                   name !== DYNAMIC_CACHE && 
                                   name !== IMAGE_CACHE;
                        })
                        .map((name) => {
                            console.log('[SW] Eliminando caché antigua:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Activación completada');
                return self.clients.claim();
            })
    );
});

// ==================== ESTRATEGIAS DE CACHÉ ====================

/**
 * Cache First - Busca en caché primero, si no existe va a la red
 */
async function cacheFirst(request, cacheName) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        return new Response('Offline - No cached version available', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

/**
 * Network First - Intenta la red primero, si falla usa caché
 */
async function networkFirst(request, cacheName) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Respuesta offline para API
        return new Response(JSON.stringify({ 
            error: 'offline', 
            message: 'No hay conexión y no hay datos en caché' 
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Stale While Revalidate - Devuelve caché inmediatamente y actualiza en segundo plano
 */
async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    const fetchPromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch(() => cachedResponse);
    
    return cachedResponse || fetchPromise;
}

// ==================== INTERCEPTACIÓN DE REQUESTS ====================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Ignorar requests que no son GET
    if (request.method !== 'GET') {
        return;
    }
    
    // Ignorar requests de extensiones y chrome
    if (url.protocol === 'chrome-extension:' || url.hostname === 'localhost' && url.port !== '') {
        return;
    }
    
    // Determinar estrategia según el tipo de request
    let strategy, cacheName;
    
    // APIs - Network First
    if (url.pathname.startsWith('/api/')) {
        // No cachear streaming
        if (url.pathname.includes('/stream/') || url.pathname.includes('/image/')) {
            return;
        }
        strategy = networkFirst;
        cacheName = DYNAMIC_CACHE;
    }
    // Imágenes - Stale While Revalidate
    else if (request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
        strategy = staleWhileRevalidate;
        cacheName = IMAGE_CACHE;
    }
    // Assets estáticos - Cache First
    else if (STATIC_ASSETS.some(asset => url.pathname === asset || url.pathname.endsWith(asset))) {
        strategy = cacheFirst;
        cacheName = STATIC_CACHE;
    }
    // CDN externos (Google Fonts, FontAwesome, etc.)
    else if (url.hostname !== self.location.hostname) {
        strategy = staleWhileRevalidate;
        cacheName = DYNAMIC_CACHE;
    }
    // Default - Network First
    else {
        strategy = networkFirst;
        cacheName = DYNAMIC_CACHE;
    }
    
    event.respondWith(strategy(request, cacheName));
});

// ==================== MENSAJES DESDE LA APP ====================

self.addEventListener('message', (event) => {
    const { type, payload } = event.data || {};
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CACHE_ALBUMS':
            // Pre-cachear álbumes específicos
            if (payload && payload.albums) {
                cacheAlbums(payload.albums);
            }
            break;
            
        case 'CLEAR_CACHE':
            clearAllCaches();
            break;
            
        case 'GET_CACHE_SIZE':
            getCacheSize().then((size) => {
                event.ports[0].postMessage({ size });
            });
            break;
    }
});

// ==================== FUNCIONES AUXILIARES ====================

async function cacheAlbums(albums) {
    const cache = await caches.open(IMAGE_CACHE);
    
    for (const album of albums) {
        try {
            // Cachear portada
            if (album.cover && album.cover.startsWith('/api/image/')) {
                await cache.add(album.cover);
            }
            
            // Cachear portadas de canciones
            for (const song of album.songs || []) {
                if (song.cover && song.cover.startsWith('/api/image/')) {
                    await cache.add(song.cover);
                }
            }
        } catch (error) {
            console.error('[SW] Error cacheando álbum:', album.name, error);
        }
    }
    
    console.log('[SW] Álbumes cacheados:', albums.length);
}

async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    console.log('[SW] Todas las cachés eliminadas');
}

async function getCacheSize() {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    
    for (const name of cacheNames) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        
        for (const request of keys) {
            const response = await cache.match(request);
            if (response) {
                const blob = await response.clone().blob();
                totalSize += blob.size;
            }
        }
    }
    
    return totalSize;
}

// ==================== BACKGROUND SYNC (opcional) ====================

self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-playlists') {
        event.waitUntil(syncPlaylists());
    }
});

async function syncPlaylists() {
    // Aquí se podría implementar sincronización con servidor
    console.log('[SW] Sincronizando playlists...');
}

// ==================== NOTIFICACIONES (opcional) ====================

self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};
    
    const options = {
        body: data.body || 'Nueva notificación de AmorList',
        icon: '/logo.png',
        badge: '/logo.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/'
        }
    };
    
    event.waitUntil(
        self.registration.showNotification(data.title || '🎵 AmorList', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});

console.log('[SW] Service Worker cargado');
