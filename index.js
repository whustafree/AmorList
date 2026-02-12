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

// API: Devuelve la música ORDENADA POR DISCOS
app.get('/api/albums', async (req, res) => {
    try {
        const library = [];

        // 1. Obtener las carpetas (Los Discos)
        const foldersRes = await drive.files.list({
            q: `'${FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
        });

        // 2. Entrar a cada disco y buscar sus canciones
        for (const folder of foldersRes.data.files) {
            const songsRes = await drive.files.list({
                q: `'${folder.id}' in parents and mimeType contains 'audio/' and trashed = false`,
                fields: 'files(id, name, thumbnailLink)',
                pageSize: 50 // Límite por disco para no saturar
            });

            // Solo agregamos el disco si tiene música
            if (songsRes.data.files.length > 0) {
                // Buscamos si hay una imagen de portada en la carpeta
                const coverRes = await drive.files.list({
                    q: `'${folder.id}' in parents and mimeType contains 'image/' and trashed = false`,
                    fields: 'files(thumbnailLink)',
                    pageSize: 1
                });

                // Definimos la portada del disco
                let albumCover = "https://via.placeholder.com/300?text=Disco";
                if (coverRes.data.files.length > 0) {
                    albumCover = coverRes.data.files[0].thumbnailLink.replace('=s220', '=s600'); // Alta calidad
                }

                // Preparamos las canciones de este disco
                const songs = songsRes.data.files.map(file => ({
                    id: file.id, // Importante para Favoritos
                    title: file.name.replace(/\.[^/.]+$/, ""),
                    artist: "Para ti ❤️",
                    album: folder.name,
                    src: `https://docs.google.com/uc?export=open&id=${file.id}`,
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
