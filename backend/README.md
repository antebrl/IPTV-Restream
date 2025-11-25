# Backend

Servidor Node.js que puede: (1) proxy de streams/playlist IPTV, (2) restream (opcionalmente transcodificando), y (3) gestionar múltiples playlists y canales con autenticación JWT.

## 🚀 Ejecución

Se recomienda usar el backend junto al frontend ([deployment](../deployment/README.md)).

Si deseas ejecutarlo de forma independiente, tienes estas opciones:

### Docker (Preferido)

En este directorio:

```bash
docker build -t iptv_restream_backend .
```

Ejemplo de ejecución (exponiendo puerto 3000 y montando almacenamiento):

```bash
docker run -d \
  --name iptv-backend \
  -p 3000:3000 \
  -v /streams:/streams \
  -e STORAGE_PATH=/streams \
  -e FORCE_TRANSCODE=false \
  iptv_restream_backend
```

Asegúrate de crear el directorio `/streams` en el host y otorgar permisos de escritura.

### Bare Metal

Configura un archivo `.env` (o variables de entorno equivalentes):

```env
STORAGE_PATH=/streams
# Opcional: forzar transcodificación si algunos canales muestran pantalla negra
# (convierte todo a H.264 + AAC, útil si origen viene en H.265/HEVC, MPEG-2, AC3, etc.)
FORCE_TRANSCODE=true
TRANSCODE_VIDEO_CODEC=libx264
TRANSCODE_AUDIO_CODEC=aac
TRANSCODE_PRESET=veryfast
TRANSCODE_PROFILE=baseline
TRANSCODE_LEVEL=3.0
TRANSCODE_AUDIO_RATE=48000
TRANSCODE_AUDIO_CHANNELS=2
TRANSCODE_AUDIO_BITRATE=128k
HLS_SEGMENT_TIME=6
HLS_LIST_SIZE=5
```

El directorio definido en `STORAGE_PATH` debe existir. Habrá mucha E/S; usar RAM (tmpfs) puede reducir latencia.

Antes de ejecutar, asegúrate de tener `ffmpeg` instalado.

```bash
node server.js
```

La aplicación está diseñada y probada principalmente en sistemas Linux.

To use together with the frontend, [run with docker](../README.md#run-with-docker-preferred).

## 🎞️ Transcodificación y Pantalla Negra

Si algunos canales descargan segmentos `.ts` y el manifiesto `.m3u8` pero el reproductor permanece en negro, normalmente la causa es que el códec de video/audio del origen no es soportado por el navegador (por ejemplo HEVC/H.265, MPEG-2 video, audio AC3/E-AC3 sin transcoding, o un stream solo-audio). El modo actual de restream (sin transcodificar) usa `-c copy` y mantiene los códecs originales. Activa `FORCE_TRANSCODE=true` para obligar a FFmpeg a convertir a H.264 (yuv420p, perfil baseline nivel 3.0) + AAC estéreo, asegurando compatibilidad amplia.

Variables clave:

* `FORCE_TRANSCODE=true` habilita conversión universal.
* Ajusta `TRANSCODE_VIDEO_CODEC`, `TRANSCODE_AUDIO_CODEC` según compatibilidad deseada.
* `HLS_SEGMENT_TIME` y `HLS_LIST_SIZE` influyen en latencia vs estabilidad.

Diagnóstico rápido (ejecutar sobre un segmento descargado):

```bash
ffprobe -hide_banner -loglevel error -select_streams v:0 -show_entries stream=codec_name -of default=nw=1 "ruta/al/segmento.ts"
ffprobe -hide_banner -loglevel error -show_streams "ruta/al/segmento.ts"
```

Si aparece `hevc`, `mpeg2video` o audio `ac3/eac3`, considera transcodificar.

Con Docker, añade al `docker run` si lo necesitas:

```bash
-e FORCE_TRANSCODE=true -e TRANSCODE_VIDEO_CODEC=libx264 -e TRANSCODE_AUDIO_CODEC=aac \
-e TRANSCODE_PRESET=veryfast -e TRANSCODE_PROFILE=baseline -e TRANSCODE_LEVEL=3.0 \
-e TRANSCODE_AUDIO_RATE=48000 -e TRANSCODE_AUDIO_CHANNELS=2 -e TRANSCODE_AUDIO_BITRATE=128k \
-e HLS_SEGMENT_TIME=6 -e HLS_LIST_SIZE=5 \
```

Desactiva `FORCE_TRANSCODE` si el origen ya es H.264 + AAC para ahorrar CPU.

## 🔐 Variables de Entorno Principales

| Variable | Descripción |
|----------|-------------|
| `JWT_SECRET` | Clave para firmar tokens JWT (cambia en producción). |
| `JWT_EXPIRY` | Tiempo de expiración (ej: `24h`). |
| `DEFAULT_ADMIN_USERNAME/PASSWORD` | Credenciales creadas si no existen usuarios. |
| `CHANNEL_SELECTION_REQUIRES_ADMIN` | Restringe selección de canal a administradores. |
| `STORAGE_PATH` | Carpeta donde se generan playlists y segmentos HLS. |
| `FORCE_TRANSCODE` | Fuerza transcodificación (true/false). |
| `TRANSCODE_...` | Parámetros finos de transcodificación (video/audio). |
| `HLS_SEGMENT_TIME` | Duración en segundos de cada segmento HLS. |
| `HLS_LIST_SIZE` | Cantidad de entradas en playlist antes de rotar. |

Mantén secretos fuera de control de versiones usando variables de entorno en tu orquestador.

## 🛠️ Endpoints

### API

#### [ChannelController](./controllers/ChannelController.js)

* GET: `/api/channels/:channelId` and `/api/channels` to get information about the registered channels.
* GET: `/api/channels/current` to get the currently playing channel.
* PUT: `api/channels/:channelId` to update a channel.
* DELETE: `api/channels/:channelId` to delete a channel.
* POST: `api/channels` to create a new channel.

#### [ProxyController](./controllers/ProxyController.js)

* `/proxy/channel` to get the M3U File of the current channel
* `/proxy/segment` and `/proxy/key` will be used by the iptv player directly

#### Restream

* `/streams/{channelId}/{channelId}.m3u8` acceder al HLS restream del canal.

### WebSocket

* Eventos canales: `channel-added`, `channel-selected`.
* Chat: `send-chat-message`, `chat-message`.
* Usuarios: `user-connected`, `user-disconnected`.

## ℹ️ Uso sin Frontend (otro reproductor IPTV)

Puedes consumir los canales con otro reproductor IPTV mediante la playlist M3U: `http://<tu-dominio>/api/channels/playlist` (también disponible con el ícono de TV en el frontend). Si la playlist falla revisa:

1. Que las URLs base sean accesibles desde el cliente.
2. Configurar `BACKEND_URL` correctamente en `docker-compose.yml`.

La playlist incluye todos los canales y un canal especial **CURRENT_CHANNEL** que apunta al canal actualmente seleccionado.

Modifica canales vía frontend o API.

> [!NOTE]
> Probado principalmente con VLC. Otros reproductores pueden requerir encabezados adicionales.
