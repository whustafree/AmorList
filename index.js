require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.static('public')); // Esto muestra tu web de la carpeta public

// Función inteligente para cargar credenciales (Local vs Nube)
function getCredentials() {
    // Si estamos en Render, usa la variable de entorno
    if (process.env.GOOGLE_CREDENTIALS) {
        return JSON.parse(process.env.GOOGLE_CREDENTIALS);
    }
    // Si estamos en tu PC, usa el archivo
    if (fs.existsSync('./credenciales.json')) {
        return require('./credenciales.json');
    }
    throw new Error('No encontré las credenciales. Revisa tus variables.');
}

// Configuración de Drive
const auth = new google.auth.GoogleAuth({
    credentials: getCredentials(),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});
const drive = google.drive({ version: 'v3', auth });

const FOLDER_ID = process.env.DRIVE_FOLDER_ID || 'PON_AQUI_TU_ID_SI_PRUEBAS_LOCAL';

// API: Devuelve la lista de canciones
app.get('/api/music', async (req, res) => {
    try {
        const query = `'${FOLDER_ID}' in parents and mimeType contains 'audio/' and trashed = false`;
        const files = await drive.files.list({
            q: query,
            fields: 'files(id, name, webContentLink)',
        });

        const songs = files.data.files.map(file => ({
            title: file.name.replace(/\.[^/.]+$/, ""), // Quita el .mp3
            artist: "Para ti ❤️", // O personalízalo
            src: `https://docs.google.com/uc?export=open&id=${file.id}`,
            cover: "https://via.placeholder.com/300" // Podemos mejorar esto luego
        }));

        res.json(songs);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error leyendo Drive");
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));