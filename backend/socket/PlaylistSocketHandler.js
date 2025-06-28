const PlaylistService = require("../services/PlaylistService");
const ChannelService = require("../services/ChannelService");
const PlaylistUpdater = require("../services/PlaylistUpdater");
const Playlist = require("../models/Playlist");
const authService = require("../services/auth/AuthService");
require("dotenv").config();

const ADMIN_ENABLED = process.env.ADMIN_ENABLED === "true";

async function handleAddPlaylist(
  { playlist, playlistName, mode, playlistUpdate, headers },
  io,
  socket
) {
  try {
    // Check if user is authenticated as admin from the socket middleware
    if (authService.isAdminEnabled() && !socket.user?.isAdmin) {
      return socket.emit("app-error", {
        message: "Admin access required to add playlists",
      });
    }

    const channels = await PlaylistService.addPlaylist(
      playlist,
      playlistName,
      mode,
      playlistUpdate,
      headers
    );

    if (channels) {
      channels.forEach((channel) => {
        io.emit("channel-added", channel);
      });
    }

    if (playlistUpdate) {
      PlaylistUpdater.register(
        new Playlist(playlist, playlistName, mode, playlistUpdate, headers)
      );
    }
  } catch (err) {
    console.error(err);
    socket.emit("app-error", { message: err.message });
  }
}

async function handleUpdatePlaylist(
  { playlist, updatedAttributes },
  io,
  socket
) {
  try {
    // Check if user is authenticated as admin from the socket middleware
    if (authService.isAdminEnabled() && !socket.user?.isAdmin) {
      return socket.emit("app-error", {
        message: "Admin access required to update playlists",
      });
    }

    if (playlist !== updatedAttributes.playlist) {
      // Playlist URL has changed - delete channels and fetch again
      await handleDeletePlaylist({ playlist }, io, socket);
      await handleAddPlaylist({ ...updatedAttributes }, io, socket);
      return;
    }

    const channels = await PlaylistService.updatePlaylist(
      playlist,
      updatedAttributes
    );

    channels.forEach((channel) => {
      io.emit("channel-updated", channel);
    });

    PlaylistUpdater.delete(playlist);
    if (updatedAttributes.playlistUpdate) {
      PlaylistUpdater.register(
        new Playlist(
          playlist,
          updatedAttributes.playlistName,
          updatedAttributes.mode,
          updatedAttributes.playlistUpdate,
          updatedAttributes.headers
        )
      );
    }
  } catch (err) {
    console.error(err);
    socket.emit("app-error", { message: err.message });
  }
}

async function handleDeletePlaylist({ playlist }, io, socket) {
  try {
    // Check if user is authenticated as admin from the socket middleware
    if (authService.isAdminEnabled() && !socket.user?.isAdmin) {
      return socket.emit("app-error", {
        message: "Admin access required to delete playlists",
      });
    }

    const channels = await PlaylistService.deletePlaylist(playlist);

    channels.forEach((channel) => {
      io.emit("channel-deleted", channel.id);
    });
    io.emit("channel-selected", ChannelService.getCurrentChannel());

    PlaylistUpdater.delete(playlist);
  } catch (err) {
    console.error(err);
    socket.emit("app-error", { message: err.message });
  }
}

module.exports = (io, socket) => {
  socket.on("add-playlist", (data) => handleAddPlaylist(data, io, socket));
  socket.on("update-playlist", (data) =>
    handleUpdatePlaylist(data, io, socket)
  );
  socket.on("delete-playlist", (playlist) =>
    handleDeletePlaylist({ playlist }, io, socket)
  );
};
