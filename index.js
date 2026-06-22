/**
 * AmorList v2.0 - Servidor Backend Mejorado
 * Reproductor de música/video para Kote con mejoras premium
 */

require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();

// ==================== CONFIGURACIÓN DE SEGURIDAD ====================

// Trust proxy para Render/Heroku
app.set('trust proxy', 1);

// Headers de seguridad con Helmet (configuración permisiva para streaming)
app.use(helmet({
    contentSecurityPolicy: false, // Desactivado para compatibilidad con Drive
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Compresión gzip/brotli
app.use(compression({
    filter: (req, res) => {
        if (req.headers.accept && req.headers.accept.includes('text/event-stream')) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

// CORS configurado correctamente (compatible con Capacitor APK)
const corsOptions = {
    origin: (() => {
        const raw = process.env.CORS_ORIGINS;
        // Si no esta seteado, vacio, o '*', permitir todo
        if (!raw || raw.trim() === '' || raw.trim() === '*') {
            return '*';
        }
        // Lista de origenes separados por coma
        return raw.split(',').map(o => o.trim()).filter(o => o.length > 0);
    })(),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
    credentials: true,
    maxAge: 86400
};
app.use(cors(corsOptions));

// Rate limiting (más permisivo para streaming)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // 1000 requests por ventana
    message: { error: 'Demasiadas solicitudes, intenta más tarde' },
    skip: (req) => req.path.includes('/api/stream') || req.path.includes('/api/image')
});
app.use('/api/', limiter);

// Logs estructurados
app.use(morgan('[:date[iso]] :method :url :status :res[content-length] - :response-time ms'));

// Parse JSON
app.use(express.json());

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: true
}));

// ==================== ARCHIVOS DE DATOS ====================

const CACHE_FILE = 'biblioteca.json';
const PLAYLISTS_FILE = 'playlists.json';
const STATS_FILE = 'stats.json';

// Credenciales de Google
function getCredentials() {
    if (process.env.GOOGLE_CREDENTIALS) {
        try {
            return JSON.parse(process.env.GOOGLE_CREDENTIALS);
        } catch (e) {
            console.error('❌ Error parseando GOOGLE_CREDENTIALS:', e.message);
        }
    }
    if (fs.existsSync('./credenciales.json')) {
        return require('./credenciales.json');
    }
    throw new Error('No encontré las credenciales de Google.');
}

// Inicializar Google Drive
let drive;
try {
    const auth = new google.auth.GoogleAuth({
        credentials: getCredentials(),
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    drive = google.drive({ version: 'v3', auth });
    console.log('✅ Google Drive autenticado correctamente');
} catch (error) {
    console.error('❌ Error autenticando Google Drive:', error.message);
}

const FOLDER_ID = process.env.DRIVE_FOLDER_ID;

// ==================== FUNCIONES AUXILIARES ====================

/**
 * Busca portada de álbum en iTunes API
 */
async function findCoverOnItunes(query) {
    try {
        const term = encodeURIComponent(query);
        const url = `https://itunes.apple.com/search?term=${term}&media=music&entity=album&limit=1`;
        const response = await axios.get(url, { timeout: 5000 });
        if (response.data.results.length > 0) {
            return response.data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
        }
    } catch (e) {
        console.warn('⚠️ Error iTunes API:', query, e.message);
    }
    return null;
}

/**
 * Lee archivo JSON de forma segura
 */
function readJsonFile(filename, defaultValue = null) {
    try {
        if (fs.existsSync(filename)) {
            const data = fs.readFileSync(filename, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error(`❌ Error leyendo ${filename}:`, e.message);
    }
    return defaultValue;
}

/**
 * Escribe archivo JSON de forma segura
 */
function writeJsonFile(filename, data) {
    try {
        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error(`❌ Error escribiendo ${filename}:`, e.message);
        return false;
    }
}

// ==================== ESCANEO DE GOOGLE DRIVE ====================

/**
 * Escanea Google Drive y construye la biblioteca
 */
async function scanDrive() {
    console.log("📡 Iniciando escaneo de Google Drive...");

    if (!drive || !FOLDER_ID) {
        console.error("❌ Drive no configurado correctamente");
        return readJsonFile(CACHE_FILE, []);
    }

    try {
        // 1. Listar carpetas (álbumes)
        const foldersRes = await drive.files.list({
            q: `'${FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
            pageSize: 100
        });

        console.log(`📁 Encontradas ${foldersRes.data.files.length} carpetas`);

        // 2. Procesar todas las carpetas en PARALELO (antes era secuencial)
        const results = await Promise.allSettled(
            foldersRes.data.files.map(async (folder) => {
                const mediaRes = await drive.files.list({
                    q: `'${folder.id}' in parents and (mimeType contains 'audio/' or mimeType contains 'video/') and trashed = false`,
                    fields: 'files(id, name, mimeType, thumbnailLink)',
                    pageSize: 100
                });

                if (mediaRes.data.files.length === 0) return null;

                const coverRes = await drive.files.list({
                    q: `'${folder.id}' in parents and mimeType contains 'image/' and trashed = false`,
                    fields: 'files(id, thumbnailLink)',
                    pageSize: 1
                });

                let albumCover = null;
                if (coverRes.data.files.length > 0) {
                    albumCover = `/api/image/${coverRes.data.files[0].id}`;
                } else {
                    albumCover = await findCoverOnItunes(folder.name);
                }

                if (!albumCover) {
                    albumCover = `https://placehold.co/600?text=${encodeURIComponent(folder.name)}`;
                }

                const tracks = mediaRes.data.files.map(file => ({
                    id: file.id,
                    title: file.name.replace(/\.[^/.]+$/, ""),
                    artist: "Para ti ❤️",
                    album: folder.name,
                    src: `/api/stream/${file.id}`,
                    cover: albumCover,
                    isVideo: file.mimeType.includes('video')
                }));

                return {
                    id: folder.id,
                    name: folder.name,
                    cover: albumCover,
                    songs: tracks
                };
            })
        );

        const library = results
            .filter(r => r.status === 'fulfilled' && r.value !== null)
            .map(r => r.value);

        // Registrar errores de carpetas individuales
        results.forEach((r, i) => {
            if (r.status === 'rejected') {
                console.error(`⚠️ Error procesando carpeta ${foldersRes.data.files[i]?.name}:`, r.reason?.message || r.reason);
            }
        });

        // Ordenar por nombre
        library.sort((a, b) => a.name.localeCompare(b.name));

        // Guardar en caché
        writeJsonFile(CACHE_FILE, library);
        console.log(`💾 Biblioteca guardada: ${library.length} álbumes, ${library.reduce((acc, a) => acc + a.songs.length, 0)} canciones`);
        return library;

    } catch (error) {
        console.error("❌ Error escaneando Drive:", error.message);
        return readJsonFile(CACHE_FILE, []);
    }
}

// ==================== ENDPOINTS DE LA API ====================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

// 1. Obtener biblioteca (con caché)
app.get('/api/albums', async (req, res) => {
    try {
        let data;
        if (fs.existsSync(CACHE_FILE)) {
            console.log("⚡ Cargando desde caché...");
            data = readJsonFile(CACHE_FILE, []);
        } else {
            console.log("⚠️ No hay caché, escaneando Drive...");
            data = await scanDrive();
        }
        res.json(data);
    } catch (error) {
        console.error("❌ Error en /api/albums:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// 2. Forzar actualización desde Drive
app.get('/api/refresh', async (req, res) => {
    try {
        console.log("🔄 Usuario solicitó actualización manual...");
        const data = await scanDrive();
        res.json(data);
    } catch (error) {
        console.error("❌ Error en /api/refresh:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// 3. Streaming de audio/video (con soporte Range)
app.get('/api/stream/:id', async (req, res) => {
    try {
        const fileId = req.params.id;
        const range = req.headers.range;

        // Obtener metadata del archivo
        const metadata = await drive.files.get({ 
            fileId: fileId, 
            fields: 'size, mimeType, name' 
        });
        
        const fileSize = parseInt(metadata.data.size);
        let contentType = metadata.data.mimeType;
        
        // Compatibilidad de formatos de video
        if (contentType === 'video/x-matroska') contentType = 'video/webm';
        if (contentType === 'video/avi') contentType = 'video/mp4';
        if (contentType === 'video/x-msvideo') contentType = 'video/mp4';

        // Incrementar contador de reproducciones
        incrementPlayCount(fileId);

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;

            const driveStream = await drive.files.get(
                { fileId: fileId, alt: 'media' },
                { headers: { Range: `bytes=${start}-${end}` }, responseType: 'stream' }
            );

            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600'
            });
            driveStream.data.pipe(res);
        } else {
            const driveStream = await drive.files.get(
                { fileId: fileId, alt: 'media' },
                { responseType: 'stream' }
            );
            res.writeHead(200, { 
                'Content-Length': fileSize, 
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600'
            });
            driveStream.data.pipe(res);
        }
    } catch (error) { 
        if (error.code !== 'ECONNRESET') {
            console.error("❌ Stream error:", error.message);
        }
        if (!res.headersSent) {
            res.status(500).json({ error: 'Error en streaming' });
        }
    }
});

// 4. Proxy de imágenes (para evitar expiración de URLs de Drive)
app.get('/api/image/:id', async (req, res) => {
    try {
        const fileId = req.params.id;
        
        const metadata = await drive.files.get({ 
            fileId: fileId, 
            fields: 'mimeType' 
        });
        const contentType = metadata.data.mimeType;

        const driveStream = await drive.files.get(
            { fileId: fileId, alt: 'media' },
            { responseType: 'stream' }
        );

        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 día
        driveStream.data.pipe(res);

    } catch (error) {
        console.error("❌ Error cargando imagen:", error.message);
        // Devolver imagen placeholder
        res.redirect('https://placehold.co/600?text=Error');
    }
});

// ==================== API DE PLAYLISTS ====================

// Obtener todas las playlists
app.get('/api/playlists', (req, res) => {
    const playlists = readJsonFile(PLAYLISTS_FILE, []);
    res.json(playlists);
});

// Crear nueva playlist
app.post('/api/playlists', (req, res) => {
    try {
        const { name, songs = [] } = req.body;
        
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'El nombre es requerido' });
        }

        const playlists = readJsonFile(PLAYLISTS_FILE, []);
        
        const newPlaylist = {
            id: `pl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: name.trim(),
            songs: songs,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        playlists.push(newPlaylist);
        writeJsonFile(PLAYLISTS_FILE, playlists);
        
        console.log(`📋 Playlist creada: ${name}`);
        res.status(201).json(newPlaylist);
    } catch (error) {
        console.error("❌ Error creando playlist:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// Actualizar playlist
app.put('/api/playlists/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, songs } = req.body;
        
        const playlists = readJsonFile(PLAYLISTS_FILE, []);
        const index = playlists.findIndex(p => p.id === id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Playlist no encontrada' });
        }
        
        if (name) playlists[index].name = name.trim();
        if (songs) playlists[index].songs = songs;
        playlists[index].updatedAt = new Date().toISOString();
        
        writeJsonFile(PLAYLISTS_FILE, playlists);
        
        console.log(`📋 Playlist actualizada: ${playlists[index].name}`);
        res.json(playlists[index]);
    } catch (error) {
        console.error("❌ Error actualizando playlist:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// Eliminar playlist
app.delete('/api/playlists/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        let playlists = readJsonFile(PLAYLISTS_FILE, []);
        const index = playlists.findIndex(p => p.id === id);
        
        if (index === -1) {
            return res.status(404).json({ error: 'Playlist no encontrada' });
        }
        
        const deleted = playlists.splice(index, 1);
        writeJsonFile(PLAYLISTS_FILE, playlists);
        
        console.log(`🗑️ Playlist eliminada: ${deleted[0].name}`);
        res.json({ success: true, deleted: deleted[0] });
    } catch (error) {
        console.error("❌ Error eliminando playlist:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// ==================== API DE ESTADÍSTICAS ====================

// Incrementar contador de reproducciones
function incrementPlayCount(trackId) {
    try {
        const stats = readJsonFile(STATS_FILE, { plays: {}, lastUpdated: null });
        stats.plays[trackId] = (stats.plays[trackId] || 0) + 1;
        stats.lastUpdated = new Date().toISOString();
        writeJsonFile(STATS_FILE, stats);
    } catch (e) {
        console.error('Error guardando stats:', e);
    }
}

// Obtener estadísticas
app.get('/api/stats', (req, res) => {
    const stats = readJsonFile(STATS_FILE, { plays: {}, lastUpdated: null });
    res.json(stats);
});

// Obtener top canciones
app.get('/api/stats/top', async (req, res) => {
    try {
        const stats = readJsonFile(STATS_FILE, { plays: {} });
        const library = readJsonFile(CACHE_FILE, []);
        
        // Crear mapa de canciones
        const songsMap = {};
        library.forEach(album => {
            album.songs.forEach(song => {
                songsMap[song.id] = song;
            });
        });
        
        // Ordenar por reproducciones
        const topSongs = Object.entries(stats.plays)
            .map(([id, count]) => ({
                ...songsMap[id],
                playCount: count
            }))
            .filter(s => s.title)
            .sort((a, b) => b.playCount - a.playCount)
            .slice(0, 20);
        
        res.json(topSongs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==================== LETRAS DE CANCIONES ====================

app.get('/api/lyrics', async (req, res) => {
    try {
        const { artist, title } = req.query;
        
        if (!artist || !title) {
            return res.status(400).json({ error: 'Artista y título requeridos' });
        }
        
        // Usar API de letras libre (lrclib.net)
        const response = await axios.get(`https://lrclib.net/api/search`, {
            params: { track_name: title, artist_name: artist },
            timeout: 5000
        });
        
        if (response.data && response.data.length > 0) {
            const lyric = response.data[0];
            res.json({
                found: true,
                lyrics: lyric.plainLyrics || lyric.syncedLyrics || null,
                syncedLyrics: lyric.syncedLyrics || null
            });
        } else {
            res.json({ found: false, lyrics: null });
        }
    } catch (error) {
        console.error('Error buscando letras:', error.message);
        res.json({ found: false, lyrics: null, error: 'No se encontraron letras' });
    }
});

// ==================== MANEJO DE ERRORES ====================

// Error handler global
app.use((err, req, res, next) => {
    console.error('🔥 Error no manejado:', err.message);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
});

// ==================== AUTO-PING (mantener despierto) ====================

const MY_RENDER_URL = process.env.RENDER_EXTERNAL_URL || process.env.MY_URL;
if (MY_RENDER_URL) {
    setInterval(() => {
        axios.get(`${MY_RENDER_URL}/api/health`).catch(() => {});
    }, 14 * 60 * 1000); // Cada 14 minutos
    console.log(`🔄 Auto-ping configurado a ${MY_RENDER_URL}`);
}

// ==================== INICIAR SERVIDOR ====================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════╗
║   🎵 AmorList v2.0 - Para Kote ❤️    ║
║   Servidor listo en puerto ${PORT}        ║
╚═══════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 Cerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('👋 Cerrando servidor...');
    process.exit(0);
});
