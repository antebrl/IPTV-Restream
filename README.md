# IPTV StreamHub
 A simple IPTV `restream` and `synchronization` (watch2gether) application with `web` frontend. Share your iptv playlist and watch it together with your friends.

## 💡Use Cases
- [x] IPTV Web player supporting multiple playlists at once.
- [x] Connect with **multiple Devices** to 1 IPTV Stream, if your provider limits current streaming devices (restream mode).
- [x] Proxy all Requests through **one IP** (proxy and restream mode).
  - [x] Helps with CORS issues.
- [x] **Private Access** - Only authenticated users can access the application.
- [x] **User Management** - Administrators can create and manage user accounts with role-based permissions.
- [x] **Independent Channel Selection** - Each user can watch different channels simultaneously without affecting others.

## ✨ Features 
**Authentication System** - Secure JWT-based authentication with user management. <br>
**Role-Based Access** - Admin and user roles with different permission levels. <br>
**IPTV Player** - IPTV web player with support for any other iptv players by exposing the playlist. <br>
**Restream / Proxy** - Proxy your iptv streams through the backend. <br>
**Independent Viewing** - Each user can watch different channels without interfering with others. <br>
**Channels** - Add multiple iptv streams and playlists, you can switch between. <br>
**Live chat** - Chat with other viewers with a randomized profile.

## 🚀 Installation Guide

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Step 1: Clone the Repository

```bash
git clone https://github.com/lukariny91/IPTV-Restream-mod.git
cd IPTV-Restream-mod
```

### Step 2: Setup Backend

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory:
```bash
JWT_SECRET=your-secret-key-here
PORT=5000
```

Start the backend server:
```bash
node server.js
```

The backend will automatically create a default admin user on first run:
- **Username**: `admin`
- **Password**: `admin123456789`

⚠️ **Important**: Change the default admin password immediately after first login!

### Step 3: Setup Frontend

Open a new terminal and navigate to the frontend directory:
```bash
cd frontend
npm install
```

Create a `.env` file in the frontend directory:
```bash
VITE_BACKEND_URL=
```

Start the frontend development server:
```bash
npm run dev
```

### Step 4: Access the Application

Open your browser and navigate to:
```
http://localhost:8080
```

### Step 5: First Login

1. Use the default admin credentials:
   - Username: `admin`
   - Password: `admin123456789`

2. After logging in, click on the **User Management** button (top right) to:
   - Change your admin password
   - Create additional user accounts

### Run with Docker (Alternative)

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

- Configuration options
- Deploy from container registry and without cloning and building
- Deploy together with nginx proxy manager for automatic ssl handling

## 🆓 Free compatible playlists

These are some tested playlists as an example. Use your own iptv playlist for the best quality!
- [Free TV Channels](https://github.com/iptv-org/iptv): Huge collection of free tv-channels. One playlist for every country.

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

## 🔐 User Management

### Admin Features

Administrators have full access to all features:

- Create, edit, and delete user accounts
- Manage channels and playlists
- Access user management panel
- Full control over application settings

### User Features

Regular users have limited permissions:

- View and play available channels
- Independent channel selection (watch different channels simultaneously)
- Chat with other viewers
- Cannot modify channels or manage users

### Managing Users

As an admin, click the **User Management** button in the top right corner to:

1. **Create Users**: Add new users with username, password, and role
2. **Edit Users**: Update user information and change roles
3. **Delete Users**: Remove user accounts (cannot delete yourself)

## FAQ & Common Mistakes

**How do I log in for the first time?**

> Use the default admin credentials: username `admin`, password `admin123456789`. Change this password immediately after first login through the User Management panel.

---

**Which streaming mode should I choose for the channel?**

> Generally: You should try with direct mode first, switch to proxy mode if it doesn't work and switch to restream mode if this also doesn't work.
>
> Proxy mode is most likely the mode you will use! You will need restream mode especially when your iptv playlist has no programDateTime set.

---

**How can I use the channels on any other iptv player (e.g. on TV)?**

> Please click on the 📺 (TV-button) in the top-right in the frontend. There you'll find the playlist you have to use in any other iptv player.
> This playlist contains all your channels. If this playlist does not work, please check if the base-url of the channels in the playlist is correct and set the `BACKEND_URL` in the `docker-compose.yml` if not.

---

**My playlist only supports xtream codes api!**

> [IPTV playlist browser](https://github.com/PhunkyBob/iptv_playlist_browser) allows you to export a m3u playlist from your xtream codes account, and lets you select single channels or the whole playlist. Official xstreams-code integration is planned!

---

**Error: `Bind for 0.0.0.0:80 failed: port is already allocated`**

> To fix this, change the [port mapping in the docker-compose](docker-compose.yml#L40) to `X:80` e.g. `8080:80`. Make also sure that port X is open in the firewall configuration if you want to expose the application.

---

**Can I run components separately?**

> If you only need the **restream** functionality and want to use another iptv player (e.g. VLC), you may only run the [backend](/backend/README.md).
>
> If you only need a frontend player, you may only run the [frontend](/frontend/README.md).
>
> Be aware that this will require additional configuration/adaptation and won't be officially supported. It is recommended to run the whole project at once.

---

**I forgot my admin password, what should I do?**

> Delete the `backend/data/users.json` file and restart the backend. The default admin user will be recreated automatically.

## Contribute & Contact
Feel free to open discussions and issues for any type of requests. Don't hesitate to contact me, if you have any problems with the setup.


If you like the project and want to support future development, please leave a ⭐.
[![Stargazers repo roster for @antebrl/IPTV-Restream](https://reporoster.com/stars/dark/antebrl/IPTV-Restream)](https://github.com/antebrl/IPTV-Restream/stargazers)
