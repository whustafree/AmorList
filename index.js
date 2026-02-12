require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

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

// --- STREAMING INTELIGENTE (AUDIO Y VIDEO) ---
app.get('/api/stream/:id', async (req, res) => {
    try {
        const fileId = req.params.id;

        // Pedimos el archivo a Google
        const response = await drive.files.get(
            { fileId: fileId, alt: 'media' },
            { responseType: 'stream' }
        );

        // COPIAMOS el tipo de archivo real que nos da Google (ej: video/mp4 o audio/mpeg)
        // Esto es crucial para que el navegador sepa qué reproductor usar
        if (response.headers['content-type']) {
            res.setHeader('Content-Type', response.headers['content-type']);
            res.setHeader('Content-Length', response.headers['content-length']);
        }
        
        // Enviamos los datos
        response.data.pipe(res);

    } catch (error) {
        console.error("Error stream:", error.message);
        res.status(500).end();
    }
});

// API: LISTA DE ÁLBUMES Y VIDEOS
app.get('/api/albums', async (req, res) => {
    try {
        const library = [];
        
        // 1. Listar carpetas (Discos)
        const foldersRes = await drive.files.list({
            q: `'${FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
        });

        // 2. Entrar a cada carpeta
        for (const folder of foldersRes.data.files) {
            // AHORA BUSCAMOS AUDIO Y VIDEO
            const mediaRes = await drive.files.list({
                q: `'${folder.id}' in parents and (mimeType contains 'audio/' or mimeType contains 'video/') and trashed = false`,
                fields: 'files(id, name, mimeType, thumbnailLink)', // Pedimos mimeType para saber qué es
                pageSize: 50 
            });

            if (mediaRes.data.files.length > 0) {
                // Buscar portada
                const coverRes = await drive.files.list({
                    q: `'${folder.id}' in parents and mimeType contains 'image/' and trashed = false`,
                    fields: 'files(thumbnailLink)',
                    pageSize: 1
                });

                let albumCover = "https://placehold.co/600?text=" + encodeURIComponent(folder.name);
                if (coverRes.data.files.length > 0) {
                    albumCover = coverRes.data.files[0].thumbnailLink.replace('=s220', '=s600');
                }

                const tracks = mediaRes.data.files.map(file => ({
                    id: file.id,
                    title: file.name.replace(/\.[^/.]+$/, ""),
                    artist: "Para ti ❤️",
                    album: folder.name,
                    src: `/api/stream/${file.id}`,
                    cover: albumCover,
                    // Detectamos si es video mirando el tipo de archivo
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