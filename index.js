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

// --- NUEVA FUNCIONALIDAD: STREAMING DE AUDIO ---
// Esto hace que el audio pase por tu servidor en lugar de ir directo a Google
app.get('/api/stream/:id', async (req, res) => {
    try {
        const fileId = req.params.id;

        // 1. Obtener el stream desde Drive usando las credenciales del robot
        const response = await drive.files.get(
            { fileId: fileId, alt: 'media' },
            { responseType: 'stream' }
        );

        // 2. Decirle al navegador que esto es audio
        res.setHeader('Content-Type', 'audio/mpeg');
        
        // 3. Enviar el audio (pipe)
        response.data.pipe(res);

    } catch (error) {
        console.error("Error en streaming:", error.message);
        res.status(500).send("Error reproduciendo archivo");
    }
});

// API: Devuelve la lista de discos
app.get('/api/albums', async (req, res) => {
    try {
        const library = [];
        // 1. Listar carpetas (Discos)
        const foldersRes = await drive.files.list({
            q: `'${FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
        });

        // 2. Entrar a cada disco
        for (const folder of foldersRes.data.files) {
            const songsRes = await drive.files.list({
                q: `'${folder.id}' in parents and mimeType contains 'audio/' and trashed = false`,
                fields: 'files(id, name, thumbnailLink)',
                pageSize: 50 
            });

            if (songsRes.data.files.length > 0) {
                // Buscar portada
                const coverRes = await drive.files.list({
                    q: `'${folder.id}' in parents and mimeType contains 'image/' and trashed = false`,
                    fields: 'files(thumbnailLink)',
                    pageSize: 1
                });

                // Portada por defecto (Placehold.co para evitar errores)
                let albumCover = "https://placehold.co/600?text=" + encodeURIComponent(folder.name);
                
                if (coverRes.data.files.length > 0) {
                    // Usamos la portada real de Drive si existe
                    albumCover = coverRes.data.files[0].thumbnailLink.replace('=s220', '=s600');
                }

                const songs = songsRes.data.files.map(file => ({
                    id: file.id,
                    title: file.name.replace(/\.[^/.]+$/, ""),
                    artist: "Para ti ❤️",
                    album: folder.name,
                    // CAMBIO CLAVE: Ahora el src apunta a TU servidor, no a Google
                    src: `/api/stream/${file.id}`, 
                    cover: albumCover
                }));

                library.push({
                    id: folder.id,
                    name: folder.name,
                    cover: albumCover,
                    songs: songs
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