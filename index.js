require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());

// Servir los archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Función para cargar credenciales (Local vs Nube)
function getCredentials() {
    if (process.env.GOOGLE_CREDENTIALS) {
        return JSON.parse(process.env.GOOGLE_CREDENTIALS);
    }
    if (fs.existsSync('./credenciales.json')) {
        return require('./credenciales.json');
    }
    throw new Error('No encontré las credenciales.');
}

// Configuración de Drive
const auth = new google.auth.GoogleAuth({
    credentials: getCredentials(),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});
const drive = google.drive({ version: 'v3', auth });

const FOLDER_ID = process.env.DRIVE_FOLDER_ID;

// API: Devuelve la lista de canciones
app.get('/api/music', async (req, res) => {
    try {
        if (!FOLDER_ID) {
            throw new Error("Falta el ID de la carpeta (DRIVE_FOLDER_ID)");
        }

        const query = `'${FOLDER_ID}' in parents and mimeType contains 'audio/' and trashed = false`;
        const files = await drive.files.list({
            q: query,
            fields: 'files(id, name, webContentLink, thumbnailLink)',
            pageSize: 100
        });

        const songs = files.data.files.map(file => ({
            title: file.name.replace(/\.[^/.]+$/, ""),
            artist: "Para ti ❤️", 
            src: `https://docs.google.com/uc?export=open&id=${file.id}`,
            cover: file.thumbnailLink ? file.thumbnailLink.replace('=s220', '=s500') : "https://via.placeholder.com/300"
        }));

        res.json(songs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error leyendo Drive: " + error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor listo en puerto ${PORT}`));
