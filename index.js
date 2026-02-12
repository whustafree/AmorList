require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Para buscar carátulas en iTunes

const app = express();
app.use(cors());

// Servir los archivos del frontend (carpeta public)
app.use(express.static(path.join(__dirname, 'public')));

// --- 1. AUTENTICACIÓN GOOGLE ---
function getCredentials() {
    if (process.env.GOOGLE_CREDENTIALS) {
        return JSON.parse(process.env.GOOGLE_CREDENTIALS);
    }
    if (fs.existsSync('./credenciales.json')) {
        return require('./credenciales.json');
    }
    throw new Error('No encontré las credenciales. Revisa tus variables de entorno o el archivo JSON.');
}

const auth = new google.auth.GoogleAuth({
    credentials: getCredentials(),
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});
const drive = google.drive({ version: 'v3', auth });
const FOLDER_ID = process.env.DRIVE_FOLDER_ID;

// --- 2. FUNCIÓN AUXILIAR: BUSCAR EN ITUNES ---
async function findCoverOnItunes(query) {
    try {
        const term = encodeURIComponent(query);
        // Buscamos álbumes en iTunes
        const url = `https://itunes.apple.com/search?term=${term}&media=music&entity=album&limit=1`;
        const response = await axios.get(url);
        
        if (response.data.results.length > 0) {
            // iTunes da imágenes de 100x100, cambiamos la URL para pedir 600x600 (HD)
            return response.data.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
        }
    } catch (error) {
        console.error("No se encontró portada en iTunes para:", query);
    }
    return null;
}

// --- 3. STREAMING DE VIDEO/AUDIO (Soporta archivos gigantes) ---
app.get('/api/stream/:id', async (req, res) => {
    try {
        const fileId = req.params.id;
        const range = req.headers.range; // El navegador pide un trozo específico (ej: minuto 20)

        // A. Obtenemos metadatos (tamaño y tipo)
        const metadata = await drive.files.get({
            fileId: fileId,
            fields: 'size, mimeType'
        });
        
        const fileSize = parseInt(metadata.data.size);
        const contentType = metadata.data.mimeType;

        // B. Si el navegador pide un RANGO (Adelantar/Retroceder o archivo grande)
        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;

            // Pedimos a Google solo ese pedacito
            const driveStream = await drive.files.get(
                { fileId: fileId, alt: 'media' },
                { 
                    headers: { Range: `bytes=${start}-${end}` }, 
                    responseType: 'stream' 
                }
            );

            // Contestamos con estatus 206 (Contenido Parcial)
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': contentType,
            });

            driveStream.data.pipe(res);

        } else {
            // C. Si pide el archivo entero desde el principio (descarga normal)
            const driveStream = await drive.files.get(
                { fileId: fileId, alt: 'media' },
                { responseType: 'stream' }
            );
            
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': contentType,
            });
            
            driveStream.data.pipe(res);
        }

    } catch (error) {
        // Ignoramos errores de conexión cortada (común cuando el usuario salta de video)
        if (error.code !== 'ECONNRESET' && error.code !== 'EPIPE') {
            console.error("Error en streaming:", error.message);
        }
        res.end();
    }
});

// --- 4. API PRINCIPAL: LISTAR DISCOS Y VIDEOS ---
app.get('/api/albums', async (req, res) => {
    try {
        if (!FOLDER_ID) throw new Error("Falta el ID de la carpeta principal");

        const library = [];
        
        // A. Listar Carpetas (Discos)
        const foldersRes = await drive.files.list({
            q: `'${FOLDER_ID}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
            fields: 'files(id, name)',
        });

        // B. Procesar cada disco
        for (const folder of foldersRes.data.files) {
            // Buscar contenido (Audio MP3, WAV... o Video MP4, MKV...)
            const mediaRes = await drive.files.list({
                q: `'${folder.id}' in parents and (mimeType contains 'audio/' or mimeType contains 'video/') and trashed = false`,
                fields: 'files(id, name, mimeType, thumbnailLink)',
                pageSize: 100 // Límite de archivos por disco
            });

            if (mediaRes.data.files.length > 0) {
                // 1. Intentar buscar portada en Drive (Prioridad 1)
                const coverRes = await drive.files.list({
                    q: `'${folder.id}' in parents and mimeType contains 'image/' and trashed = false`,
                    fields: 'files(thumbnailLink)',
                    pageSize: 1
                });

                let albumCover = null;

                // Si hay imagen en Drive, úsala
                if (coverRes.data.files.length > 0) {
                    albumCover = coverRes.data.files[0].thumbnailLink.replace('=s220', '=s600'); // Alta calidad
                } 
                // Si NO hay imagen en Drive, búscala en iTunes
                else {
                    albumCover = await findCoverOnItunes(folder.name);
                }

                // Si tampoco está en iTunes, usa la imagen por defecto con texto
                if (!albumCover) {
                    albumCover = "https://placehold.co/600?text=" + encodeURIComponent(folder.name);
                }

                const tracks = mediaRes.data.files.map(file => ({
                    id: file.id,
                    title: file.name.replace(/\.[^/.]+$/, ""), // Quitar extensión
                    artist: "Para ti ❤️",
                    album: folder.name,
                    src: `/api/stream/${file.id}`, // Enlace al streaming propio
                    cover: albumCover,
                    isVideo: file.mimeType.includes('video') // Bandera para saber si es video
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