# AmorList ❤️

Reproductor de música/video personalizado para Kote. Construido con **Vue 3** + **Node.js/Express** + **Google Drive API**.

> 🎵 Stream de álbumes desde Google Drive con letras, visualizador, cola y favoritos.

---

## 🚀 Deploy

### Frontend (Vercel)

El frontend Vue está en [`amorlist-vue/`](./amorlist-vue). Para deploy en Vercel:

1. Conecta el repositorio en [vercel.com](https://vercel.com)
2. Configura:
   - **Root Directory:** `amorlist-vue`
   - **Framework:** Vite
3. Listo — se desplegará automáticamente en cada push

### Backend (Render / Railway)

El backend Express necesita un servidor Node.js. Recomiendo [Render](https://render.com):

1. Crea un **Web Service** apuntando a la raíz del repo
2. **Build Command:** `npm install`
3. **Start Command:** `node index.js`
4. Agrega variables de entorno:
   - `GOOGLE_CREDENTIALS` — JSON de Service Account
   - `DRIVE_FOLDER_ID` — ID de la carpeta de Drive
   - `CORS_ORIGINS` — URL del frontend en Vercel

> ⚠️ El frontend necesita el backend corriendo para que la API funcione.

---

## 📋 Stack

| Capa | Tecnología |
|------|------------|
| **Frontend** | Vue 3 (Composition API), Vite, Tailwind CSS 3 |
| **Backend** | Node.js, Express 4 |
| **Almacenamiento** | Google Drive API v3 |
| **Letras** | lrclib.net API |
| **Streaming** | Range requests progresivos |
| **Despliegue** | Vercel (frontend) + Render (backend) |

---

## 🛠️ Desarrollo local

```bash
# 1. Backend
cd AmorList
cp .env.example .env   # Completa con tus credenciales
npm install
npm run dev             # http://localhost:3000

# 2. Frontend (otra terminal)
cd amorlist-vue
npm install
npm run dev             # http://localhost:5173
```

El frontend usa proxy de Vite: toda ruta `/api/*` se redirige a `localhost:3000`.

---

## 📁 Estructura de Google Drive

```
📁 Raíz (DRIVE_FOLDER_ID)
├── 📁 01 Álbum A
│   ├── 🎵 01-cancion.mp3
│   ├── 🎵 02-cancion.mp3
│   └── 🖼️ cover.jpg (opcional)
├── 📁 02 Álbum B
│   └── ...
└── 📁 Videos (con isVideo: true)
    └── ...
```

Cada subcarpeta = un álbum. Si tiene imágenes, se usan como portada. Si no, busca en iTunes.

---

## ✨ Características

- ✅ Streaming de audio/video con soporte **Range**
- ✅ **Visualizador** de audio (Web Audio API + Canvas)
- ✅ **Cola de reproducción** dinámica
- ✅ **Favoritos** y **historial** (localStorage)
- ✅ **Top canciones** más escuchadas
- ✅ **Letras** vía lrclib.net
- ✅ **Smart TV**: controles por teclado/remoto
- ✅ **Responsive** y adaptativo
- ✅ Caché de biblioteca en disco

---

## 🧾 Historial de cambios

### v2.0.1 — Correcciones críticas, rendimiento y UX (2026-06-22)

**🔴 Críticos**
- API letras: ahora envía el artista a lrclib.net (antes solo enviaba el título)
- scrollTo: corregido para usar el contenedor `<main>` en vez de `window`
- .gitignore: agregados `biblioteca.json`, `playlists.json`, `stats.json`
- Eliminados componentes muertos: `HelloWorld.vue` y `LyricsPanel.vue`

**🟧 Rendimiento**
- scanDrive paralelizado con `Promise.allSettled` (~30s → ~3s)
- Visualizer: limpieza con `onUnmounted` (cancelAnimationFrame + close AudioContext)
- PlayerBar: limpieza de event listener con `onUnmounted`
- Fallback doble de imágenes: placehold.co → SVG inline

**🟨 UX**
- Navegación arreglada: al volver de Favoritos/Historial restaura modo 'audio'
- Creado `.env.example` con todas las variables documentadas
- README actualizado con info real del proyecto
- Tailwind config: font-family Montserrat, colores personalizados

---

## 📄 Licencia

Propiedad de **whustaf** — uso personal.
