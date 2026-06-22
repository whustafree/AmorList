# AmorList ❤️ — Reproductor de música/video

Reproductor personalizado construido con **Vue 3** + **Vite** + **Tailwind CSS** y backend en **Node.js/Express** con integración a **Google Drive**.

> Regalo para Kote — Reproductor de música/video con mejoras premium 🎵

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Vue 3 (Composition API), Vite, Tailwind CSS |
| Backend | Node.js, Express, Google Drive API v3 |
| Streaming | Range requests, streaming progresivo |
| Letras | lrclib.net API |

## Requisitos

- Node.js 18+
- Cuenta de Google Cloud con Drive API habilitada
- Carpeta en Google Drive con álbumes (subcarpetas = álbumes)

## Configuración

1. **Credenciales de Google**: Crea un Service Account en Google Cloud Console, habilita Drive API y descarga el JSON. Colócalo como `credenciales.json` en la raíz o pásalo como variable de entorno `GOOGLE_CREDENTIALS`.

2. **Variables de entorno**:
   ```bash
   cp .env.example .env
   # Edita .env con tus valores
   ```

3. **Instalar dependencias**:
   ```bash
   # Backend
   cd AmorList
   npm install

   # Frontend
   cd amorlist-vue
   npm install
   ```

## Desarrollo

```bash
# Iniciar backend (puerto 3000)
cd AmorList
npm run dev

# En otra terminal, iniciar frontend (puerto 5173)
cd amorlist-vue
npm run dev
```

El frontend se conecta al backend mediante proxy de Vite (todo `/api/*` se redirige a `localhost:3000`).

## Estructura de Google Drive

```
📁 Raíz (DRIVE_FOLDER_ID)
├── 📁 01 Álbum A
│   ├── 🎵 01-cancion.mp3
│   ├── 🎵 02-cancion.mp3
│   └── 🖼️ cover.jpg (opcional)
├── 📁 02 Álbum B
│   └── ...
└── 📁 Videos (opcional, con isVideo)
    └── ...
```

## Características

- ✅ Streaming de audio con soporte Range
- ✅ Reproducción de video
- ✅ Visualizador de audio (Web Audio API)
- ✅ Cola de reproducción
- ✅ Favoritos (localStorage)
- ✅ Historial de escucha (localStorage)
- ✅ Top canciones (estadísticas)
- ✅ Letras vía lrclib.net
- ✅ Compatible con Smart TV (controles por teclado/remoto)
- ✅ Diseño responsive
