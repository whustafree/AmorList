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
    if (process.env.GOOGLE_CREDENTIALS) {
        return JSON.parse(process.env.GOOGLE_CREDENTIALS);
    }
    if (fs.existsSync('./credenciales.json')) {
        return require('./credenciales.json');
    }
    throw new Error('No encontré las credenciales.');
}

const auth = new google.auth.GoogleAuth({
    credentials: getCredentials(),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});
const drive = google.drive({ version: 'v3', auth });

const FOLDER_ID = process.env.DRIVE_FOLDER_ID;

app.get('/api/music', async (req, res) => {
    try {
        if (!FOLDER_ID) throw new Error("Falta el ID de la carpeta");

        let allSongs = [];

        // 1. Buscar canciones SUELTAS en la carpeta principal
        const filesRes = await drive.files.list({
            q: `'${FOLDER_ID}' in parents and mimeType contains 'audio/' and trashed = false`,
            fields: 'files(id, name, thumbnailLink)',
        });
        
        if (filesRes.data.files.length > 0) {
            filesRes.data.files.forEach(f => allSongs.push(formatSong(f, "Sueltas")));
        }

        // 2. Buscar CARPETAS (Discos) dentro de la carpeta principal
        const foldersRes = await drive.files.list({
            q: `'${FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
        });

        // 3. Entrar a cada carpeta de disco y sacar la música
        for (const folder of foldersRes.data.files) {
            const songsRes = await drive.files.list({
                q: `'${folder.id}' in parents and mimeType contains 'audio/' and trashed = false`,
                fields: 'files(id, name, thumbnailLink)',
            });

            if (songsRes.data.files.length > 0) {
                // Intentamos buscar una portada en la carpeta del álbum
                const coverRes = await drive.files.list({
                    q: `'${folder.id}' in parents and mimeType contains 'image/' and trashed = false`,
                    fields: 'files(thumbnailLink)',
                    pageSize: 1
                });
                
                // Si hay portada en el álbum, la usamos para todas sus canciones
                const albumCover = coverRes.data.files[0] 
                    ? coverRes.data.files[0].thumbnailLink.replace('=s220', '=s500') 
                    : null;

                songsRes.data.files.forEach(f => {
                    allSongs.push(formatSong(f, folder.name, albumCover));
                });
            }
        }

        console.log(`Encontradas ${allSongs.length} canciones.`);
        res.json(allSongs);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Función auxiliar para dar formato
function formatSong(file, albumName, albumCover) {
    return {
        title: file.name.replace(/\.[^/.]+$/, ""), // Quitar extensión
        artist: "Para ti ❤️", 
        album: albumName,
        src: `https://docs.google.com/uc?export=open&id=${file.id}`,
        // Prioridad de portada: 1. Del álbum, 2. Del archivo, 3. Por defecto
        cover: albumCover || (file.thumbnailLink ? file.thumbnailLink.replace('=s220', '=s500') : "https://via.placeholder.com/300")
    };
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor listo en puerto ${PORT}`));
