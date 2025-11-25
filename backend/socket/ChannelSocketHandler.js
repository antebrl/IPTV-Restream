const ChannelService = require("../services/ChannelService");
const authService = require("../services/auth/AuthService");

module.exports = (io, socket) => {
  // Admin-only: Add channel
  socket.on("add-channel", ({ name, url, avatar, mode, headersJson }) => {
    try {
      // Check if user is admin
      if (!socket.user?.isAdmin) {
        return socket.emit("app-error", {
          message: "Admin access required to add channels",
        });
      }

      console.log("Adding solo channel:", url);
      const newChannel = ChannelService.addChannel({
        name: name,
        url: url,
        avatar: avatar,
        mode: mode,
        headersJson: headersJson,
      });
      io.emit("channel-added", newChannel); // Broadcast to all clients
    } catch (err) {
      socket.emit("app-error", { message: err.message });
    }
  });

  // All authenticated users can select channels (unless CHANNEL_SELECTION_REQUIRES_ADMIN is true)
  socket.on("set-current-channel", async (id) => {
    try {
      if (
        authService.channelSelectionRequiresAdmin() &&
        !socket.user?.isAdmin
      ) {
        return socket.emit("app-error", {
          message: "Admin access required to switch channel",
        });
      }
      const nextChannel = await ChannelService.setCurrentChannel(id);
      // Solo emitir al cliente que solicitó el cambio, no a todos
      socket.emit("channel-selected", nextChannel);
    } catch (err) {
      console.error(err);
      socket.emit("app-error", { message: err.message });
    }
  });

  // Admin-only: Delete channel
  socket.on("delete-channel", async (id) => {
    try {
      // Check if user is admin
      if (!socket.user?.isAdmin) {
        return socket.emit("app-error", {
          message: "Admin access required to delete channels",
        });
      }

      await ChannelService.deleteChannel(id);
      io.emit("channel-deleted", id); // Broadcast to all clients
      // Ya no emitimos channel-selected, cada cliente maneja su selección localmente
    } catch (err) {
      console.error(err);
      socket.emit("app-error", { message: err.message });
    }
  });

  // Admin-only: Update channel
  socket.on("update-channel", async ({ id, updatedAttributes }) => {
    try {
      // Check if user is admin
      if (!socket.user?.isAdmin) {
        return socket.emit("app-error", {
          message: "Admin access required to update channels",
        });
      }

      const updatedChannel = await ChannelService.updateChannel(
        id,
        updatedAttributes
      );
      io.emit("channel-updated", updatedChannel); // Broadcast to all clients
    } catch (err) {
      console.error(err);
      socket.emit("app-error", { message: err.message });
    }
  });
};
