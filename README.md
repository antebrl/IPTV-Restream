> [!NOTE]
>
> #### NEW VERSION
> 🎉 I'm currently working on a fully hosted version – no setup required and **completely FREE**!   
> 👉 Join the [WAITLIST](https://iptv-waitlist.vercel.app/) to show your interest and be among the first to try it out.
>
> 🚀 The upcoming version will include several highly requested features:
> - **Group Watching** – Multiple groups can watch different channels independently.
> - **Authentication & Team Management** – Invite people, assign roles, and manage access.
> - **Personal Channel Management** – Each user can create custom channel groups and favorites.
> - **Improved Streaming** – Smoother playback and a more robust synchronization engine.
> - **Extended Format Support** – Compatibility with MPEG-DASH and Xtream-Codes.

# IPTV StreamHub
 A simple IPTV `restream` and `synchronization` (watch2gether) application with `web` frontend. Share your iptv playlist and watch it together with your friends.

## 💡Use Cases
- [x] IPTV Web player supporting multiple playlists at once.
- [x] Connect with **multiple Devices** to 1 IPTV Stream, if your provider limits current streaming devices (restream mode).
- [x] Proxy all Requests through **one IP** (proxy and restream mode).
  - [x] Helps with CORS issues.
- [x] **Synchronize** IPTV streaming with multiple devices: Synchronized playback and channel selection for perfect Watch2Gether.
- [x] **Share your iptv access** without revealing your actual stream-url (privacy-mode) and watch together with your friends.

## ✨ Features 
**IPTV Player** - IPTV web player with support for any other iptv players by exposing the playlist.
**Restream / Proxy** - Proxy your iptv streams through the backend. <br>
**Synchronization** - The selection and playback of the stream is perfectly synchronized for all viewers. <br>
**Channels** - Add multiple iptv streams and playlists, you can switch between. <br>
**Live chat** - chat with other viewers with a randomized profile.

## 🚀 Run

### Run with Docker (Preferred)

Clone the repo

```bash
git clone https://github.com/antebrl/IPTV-Restream.git
```

Make sure to have docker up & running. Start with docker compose
```bash
docker compose up -d
```
Open http://localhost

> [!IMPORTANT]  
> If a channel/playlist won't work, please try with `proxy` or `restream` mode. This fixes most of the problems! See also [Channel Mode](#channel-mode).
>
> If you're using an **Xtream Codes** playlist (format: `/get.php?username=xxx&password=xxx&type=xxx&output=xxx`), try the following options:
> - Use **proxy mode** with HLS output: Use `&type=m3u_plus&output=hls` in your playlist URL.
> - Use **restream mode** with MPEG-TS output: Use `&type=m3u_plus&output=ts` to your playlist URL.
>
> If your playlist is a plain HTTP link or has CORS issues, you must use **proxy** or **restream mode** to ensure compatibility in the web.


There is also [documentation for ADVANCED DEPLOYMENT](/deployment/README.md):
- Configuration options (Admin mode).
- Deploy from container registry and without cloning and building.
- Deploy together with nginx proxy manager for automatic ssl handling.

## 🆓 Free compatible playlists

These are some tested playlists as an example. Use your own iptv playlist for the best quality!
- [Free TV Channels](https://github.com/iptv-org/iptv): Huge collection of free tv-channels. One playlist for every country.

---

- [Move On Joy Playlist](https://raw.githubusercontent.com/pigzillaaaaa/iptv-scraper/refs/heads/main/moveonjoy.m3u8): A playlist with various channels, including sports and movies. Use the playlist or single channels (preferred) in proxy mode.
- [Daddylive](https://daddylive.mp/): Various tv-channels including sports

  Use this playlistUrl: `https://raw.githubusercontent.com/pigzillaaaaa/iptv-scraper/refs/heads/main/daddylive-channels.m3u8`. <br>
  Also add these headers:
  - `Referer`: setting `#EXTVLCOPT:http-referrer` of the [playlist](https://raw.githubusercontent.com/pigzillaaaaa/iptv-scraper/refs/heads/main/daddylive-channels.m3u8)
  - `Origin`: setting `#EXTVLCOPT:http-origin` of the [playlist](https://raw.githubusercontent.com/pigzillaaaaa/iptv-scraper/refs/heads/main/daddylive-channels.m3u8)
 
  The daddylive playlist only works locally! It won't work on the test server (https://ante.is-a.dev)! <br>
  You also have to update (remove and add again) the playlist regularly, as the headers change regularly! This will be done automatically in the [new version](#new-version).

- [Streamed SU Sports](https://streamed.su): Sport live-events <br>
  Just put any [matches api url](https://streamed.su/docs/matches) e.g. `https://streamed.su/api/matches/football/popular` as playlistUrl.
  
## 🖼️ Preview
![Frontend Preview](/frontend/ressources/frontend-preview.png)
![Add channel](/frontend/ressources/add-channel.png)

## ⚙️ Settings

### Channel Mode
#### `Direct`
Directly uses the source stream. Won't work with most of the streams, because of CORS, IP/Device restrictions. Is also incompatible with custom headers and privacy mode.

#### `Proxy` (Preffered)
The stream requests are proxied through the backend. Allows to set custom headers and bypass CORS. This mode is preffered. Only switch to restream mode, if proxy mode won't work for your stream or if you have synchronization issues.

#### `Restream`
The backend service caches the source stream (with ffmpeg) and restreams it. Can help with hard device restrictions of your provider or synchroization problems (when your iptv channels have no programDateTime). But it can lead to longer initial loading times and performance issues after time.

## FAQ & Common Mistakes

Which streaming mode should I choose for the channel?

> Generally: You should try with direct mode first, switch to proxy mode if it doesn't work and switch to restream mode if this also doesn't work.
>
> Proxy mode is most likely the mode, you will use! You will need restream mode especially when your iptv playlist has no programDateTime set and you want to have playback synchronization.
---

How can I use the channels on any other iptv player (e.g. on TV)?

> Please click on the 📺 (TV-button) in the top-right in the frontend. There you'll find the playlist you have to use in any other iptv player.
> This playlist contains all your channels and one **CURRENT_CHANNEL**, which forwards the content of the currently played channel.
> If this playlist does not work, please check if the base-url of the channels in the playlist is correct and set the `BACKEND_URL` in the `docker-compose.yml` if not.
---

My playlist only supports xtream codes api!

> [IPTV playlist browser](https://github.com/PhunkyBob/iptv_playlist_browser) allows you to export a m3u playlist from your xtream codes account, and let's you select single channels or the whole playlist. Official xstreams-code integration is planned!
---
Error: `Bind for 0.0.0.0:80 failed: port is already allocated`

> To fix this, change the [port mapping in the docker-compose](docker-compose.yml#L40) to `X:80` e.g. `8080:80`. Make also sure that port X is open in the firewall configuration if you want to expose the application.
---
Is it possible to run components seperately, if I only need the frontend OR backend?

> If you only need the **restream** functionality and want to use another iptv player (e.g. VLC), you may only run the [backend](/backend/README.md).
> <br>
> If you only need the **synchronization** functionality, you may only run the [frontend](/frontend/README.md).
>
> Be aware, that this'll require additional configuration/adaption and won't be officially supported. It is recommended to [run the whole project as once](#run-with-docker-preferred).
---
Is there a option to limit access of channel management?

> Yes, you can enable [**Admin Mode**](/deployment/README.md#admin-mode) in the configuration to restrict channel management to authenticated administrators only.

## Contribute & Contact
Feel free to open discussions and issues for any type of requests. Don't hesitate to contact me, if you have any problems with the setup.


If you like the project and want to support future development, please leave a ⭐.
[![Stargazers repo roster for @antebrl/IPTV-Restream](https://reporoster.com/stars/dark/antebrl/IPTV-Restream)](https://github.com/antebrl/IPTV-Restream/stargazers)
