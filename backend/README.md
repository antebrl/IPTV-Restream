# Backend

A simple NodeJS web server that is able to proxy and restream your any iptv stream/playlist and manage multiple playlists.

## 🚀 Run

It is strongly advised to [use the frontend together with the backend](../deployment/README.md). 


If you still want to use it standalone, consider these options:

### With Docker (Preferred)

In this directory:
```bash
docker build -t iptv_restream_backend
```

```bash
docker run -d \
  -v {streams_directory}:/streams \
  -e STORAGE_PATH=/streams \
  iptv_restream_backend
```
make sure that you have created a directory for the streams storage:
e.g. create `/streams` and replace `{streams_directory}` with it.

### Bare metal

Setup a `.env` file or 
equivalent environment variables:
```env
STORAGE_PATH=/mnt/streams/recordings
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

The storage directory has to exist. There will be alot of I/O, so it makes sense to mount the storage into ram memory.

Before running, make sure you have `ffmpeg` installed on your system.

```bash
node index.js
```
Be aware, that this application is designed for Linux systems!

To use together with the frontend, [run with docker](../README.md#run-with-docker-preferred).

## 🎞️ Transcodificación y Pantalla Negra

Si algunos canales descargan segmentos `.ts` y el manifiesto `.m3u8` pero el reproductor permanece en negro, normalmente la causa es que el códec de video/audio del origen no es soportado por el navegador (por ejemplo HEVC/H.265, MPEG-2 video, audio AC3/E-AC3 sin transcoding, o un stream solo-audio). El modo actual de restream (sin transcodificar) usa `-c copy` y mantiene los códecs originales. Activa `FORCE_TRANSCODE=true` para obligar a FFmpeg a convertir a H.264 (yuv420p, perfil baseline nivel 3.0) + AAC estéreo, asegurando compatibilidad amplia.

Variables clave:
* `FORCE_TRANSCODE=true` habilita la conversión.
* Ajusta `TRANSCODE_VIDEO_CODEC`, `TRANSCODE_AUDIO_CODEC` si necesitas otros códecs (requiere soporte FFmpeg).
* `HLS_SEGMENT_TIME` y `HLS_LIST_SIZE` controlan latencia y longitud del playlist.

Diagnóstico rápido (ejecutar sobre un segmento descargado):
```bash
ffprobe -hide_banner -loglevel error -select_streams v:0 -show_entries stream=codec_name -of default=nw=1 "ruta/al/segmento.ts"
ffprobe -hide_banner -loglevel error -show_streams "ruta/al/segmento.ts"
```
Si aparece `hevc`, `mpeg2video` o audio `ac3/eac3`, considera transcodificar.

Con Docker, añade al `docker run`:
```bash
-e FORCE_TRANSCODE=true -e TRANSCODE_VIDEO_CODEC=libx264 -e TRANSCODE_AUDIO_CODEC=aac \
-e TRANSCODE_PRESET=veryfast -e TRANSCODE_PROFILE=baseline -e TRANSCODE_LEVEL=3.0 \
-e TRANSCODE_AUDIO_RATE=48000 -e TRANSCODE_AUDIO_CHANNELS=2 -e TRANSCODE_AUDIO_BITRATE=128k \
-e HLS_SEGMENT_TIME=6 -e HLS_LIST_SIZE=5 \
```

Desactiva `FORCE_TRANSCODE` si tu fuente ya está en H.264 + AAC y quieres menor uso de CPU.

## 🛠️ Endpoints

### API

#### [ChannelController](./controllers/ChannelController.js)

- GET: `/api/channels/:channelId` and `/api/channels` to get information about the registered channels.
- GET: `/api/channels/current` to get the currently playing channel.
- PUT: `api/channels/:channelId` to update a channel.
- DELETE: `api/channels/:channelId` to delete a channel.
- POST: `api/channels` to create a new channel.

#### [ProxyController](./controllers/ProxyController.js)

- `/proxy/channel` to get the M3U File of the current channel
- `/proxy/segment` and `/proxy/key` will be used by the iptv player directly

#### Restream

- `/streams/{currentChannelId}/{currentChannelId}.m3u` to access the current restream.

### WebSocket

- `channel-added` and `channel-selected` events will be send to all connected clients
- chat messages: `send-chat-message` and `chat-message`
- users: `user-connected` and `user-disconnected`

## ℹ️ Usage without the frontend (with other iptv player)
You can use all the channels with any other IPTV player. The backend exposes a **M3U Playlist** on `http://your-domain/api/channels/playlist`. You can also find it by clicking on the TV-button on the top right in the frontend!
If this playlist does not work, please check if the base-url of the channels in the playlist is correct and set the `BACKEND_URL` in the `docker-compose.yml` if not.

This playlist contains all your channels and one **CURRENT_CHANNEL**, which forwards the content of the currently played channel.

To modify the channel list, you can use the frontend or the [api](#channelcontroller).

> [!NOTE]
> These options are only tested with VLC media player as other iptv player. Use them at your own risk. Only for the usage together with the frontend will be support provided.
