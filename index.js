require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Archivo donde guardaremos la "memoria"
const CACHE_FILE = 'biblioteca.json';

// --- CREDENCIALES ---
function getCredentials() {
    if (process.env.GOOGLE_CREDENTIALS) return JSON.parse(process.env.GOOGLE_CREDENTIALS);
    if (fs.existsSync('./credenciales.json')) return require('./credenciales.json');
    throw new Error('No encontré las credenciales.');
}

const auth = new google.auth.GoogleAuth({
    credentials: getCredentials(),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});
const drive = google.drive({ version: 'v3', auth });
const FOLDER_ID = process.env.DRIVE_FOLDER_ID;

// --- FUNCIONES AUXILIARES ---
async function findCoverOnItunes(query) {
    try {
        const term = encodeURIComponent(query);
        const url = `https://itunes.apple.com/search?term=${term}&media=music&entity=album&limit=1`;
        const response = await axios.get(url);
        if (response.data.results.length > 0) {
            return response.data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
        }
    } catch (e) { console.error("Error iTunes:", query); }
    return null;
}

// Función que hace el trabajo pesado (Escanear Drive)
async function scanDrive() {
    console.log("📡 Iniciando escaneo de Google Drive...");
    const library = [];
    
    // 1. Listar Carpetas
    const foldersRes = await drive.files.list({
        q: `'${FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id, name)',
    });

    // 2. Procesar Discos
    for (const folder of foldersRes.data.files) {
        const mediaRes = await drive.files.list({
            q: `'${folder.id}' in parents and (mimeType contains 'audio/' or mimeType contains 'video/') and trashed = false`,
            fields: 'files(id, name, mimeType, thumbnailLink)',
            pageSize: 100 
        });

        if (mediaRes.data.files.length > 0) {
            // Buscar portada
            const coverRes = await drive.files.list({
                q: `'${folder.id}' in parents and mimeType contains 'image/' and trashed = false`,
                fields: 'files(thumbnailLink)',
                pageSize: 1
            });

            let albumCover = null;
            if (coverRes.data.files.length > 0) {
                albumCover = coverRes.data.files[0].thumbnailLink.replace('=s220', '=s600');
            } else {
                albumCover = await findCoverOnItunes(folder.name);
            }
            if (!albumCover) albumCover = "https://placehold.co/600?text=" + encodeURIComponent(folder.name);

            const tracks = mediaRes.data.files.map(file => ({
                id: file.id,
                title: file.name.replace(/\.[^/.]+$/, ""),
                artist: "Para ti ❤️",
                album: folder.name,
                src: `/api/stream/${file.id}`,
                cover: albumCover,
                isVideo: file.mimeType.includes('video')
            }));

            library.push({
                id: folder.id,
                name: folder.name,
                cover: albumCover,
                songs: tracks
            });
        }
    }
    
    // Guardamos en "memoria" (archivo local)
    fs.writeFileSync(CACHE_FILE, JSON.stringify(library));
    console.log("💾 Biblioteca guardada en caché local.");
    return library;
}

// --- ENDPOINTS ---

// 1. Obtener Biblioteca (Rápido: lee del archivo)
app.get('/api/albums', async (req, res) => {
    try {
        // Si existe el archivo de caché, lo usamos
        if (fs.existsSync(CACHE_FILE)) {
            console.log("⚡ Cargando desde caché...");
            const data = fs.readFileSync(CACHE_FILE);
            res.json(JSON.parse(data));
        } else {
            // Si no existe, escaneamos por primera vez
            const data = await scanDrive();
            res.json(data);
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// 2. Forzar Actualización (Botón de Refresh)
app.get('/api/refresh', async (req, res) => {
    try {
        const data = await scanDrive(); // Fuerza el escaneo
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Streaming (Igual que antes)
app.get('/api/stream/:id', async (req, res) => {
    try {
        const fileId = req.params.id;
        const range = req.headers.range;

        const metadata = await drive.files.get({ fileId: fileId, fields: 'size, mimeType' });
        const fileSize = parseInt(metadata.data.size);
        const contentType = metadata.data.mimeType;

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
            });
            driveStream.data.pipe(res);
        } else {
            const driveStream = await drive.files.get(
                { fileId: fileId, alt: 'media' },
                { responseType: 'stream' }
            );
            res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': contentType });
            driveStream.data.pipe(res);
        }
    } catch (error) { if (error.code !== 'ECONNRESET') console.error("Stream error", error.message); res.end(); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor listo en puerto ${PORT}`));