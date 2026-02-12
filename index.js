require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Nueva librería para buscar en internet

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

function getCredentials() {
    if (process.env.GOOGLE_CREDENTIALS) return JSON.parse(process.env.GOOGLE_CREDENTIALS);
    if (fs.existsSync('./credenciales.json')) return require('./credenciales.json');
    throw new Error('No encontré credenciales');
}

const auth = new google.auth.GoogleAuth({
    credentials: getCredentials(),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});
const drive = google.drive({ version: 'v3', auth });
const FOLDER_ID = process.env.DRIVE_FOLDER_ID;

// --- FUNCIÓN PARA BUSCAR CARÁTULA EN ITUNES ---
async function findCoverOnItunes(query) {
    try {
        // Limpiamos el nombre para la búsqueda (quitamos caracteres raros)
        const term = encodeURIComponent(query);
        const url = `https://itunes.apple.com/search?term=${term}&media=music&entity=album&limit=1`;
        
        const response = await axios.get(url);
        
        if (response.data.results.length > 0) {
            // iTunes devuelve una imagen de 100x100, la trucamos para pedir la de 600x600
            return response.data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
        }
    } catch (error) {
        console.error("No se encontró en iTunes:", query);
    }
    return null; // Si falla, devolvemos null
}

// --- STREAMING (Audio y Video) ---
app.get('/api/stream/:id', async (req, res) => {
    try {
        const fileId = req.params.id;
        const response = await drive.files.get(
            { fileId: fileId, alt: 'media' },
            { responseType: 'stream' }
        );
        if (response.headers['content-type']) {
            res.setHeader('Content-Type', response.headers['content-type']);
            res.setHeader('Content-Length', response.headers['content-length']);
        }
        response.data.pipe(res);
    } catch (error) {
        console.error("Error stream:", error.message);
        res.status(500).end();
    }
});

// --- API PRINCIPAL ---
app.get('/api/albums', async (req, res) => {
    try {
        const library = [];
        
        // 1. Listar Carpetas (Discos)
        const foldersRes = await drive.files.list({
            q: `'${FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
        });

        // 2. Procesar cada disco
        for (const folder of foldersRes.data.files) {
            // Buscar contenido (Audio o Video)
            const mediaRes = await drive.files.list({
                q: `'${folder.id}' in parents and (mimeType contains 'audio/' or mimeType contains 'video/') and trashed = false`,
                fields: 'files(id, name, mimeType, thumbnailLink)',
                pageSize: 50 
            });

            if (mediaRes.data.files.length > 0) {
                // A. Intentar buscar portada en Drive (Prioridad 1)
                const coverRes = await drive.files.list({
                    q: `'${folder.id}' in parents and mimeType contains 'image/' and trashed = false`,
                    fields: 'files(thumbnailLink)',
                    pageSize: 1
                });

                let albumCover = null;

                // Si hay imagen en Drive, úsala
                if (coverRes.data.files.length > 0) {
                    albumCover = coverRes.data.files[0].thumbnailLink.replace('=s220', '=s600');
                } 
                // Si NO hay imagen en Drive, búscala en iTunes
                else {
                    albumCover = await findCoverOnItunes(folder.name);
                }

                // Si tampoco está en iTunes, usa la imagen por defecto
                if (!albumCover) {
                    albumCover = "https://placehold.co/600?text=" + encodeURIComponent(folder.name);
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

                library.push({
                    id: folder.id,
                    name: folder.name,
                    cover: albumCover,
                    songs: tracks
                });
            }
        }
        res.json(library);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor listo en puerto ${PORT}`));