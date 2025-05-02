const ChannelService = require('../services/ChannelService');
require('dotenv').config();

const ADMIN_ENABLED = process.env.ADMIN_ENABLED === 'true';

module.exports = (io, socket) => {
    // Check if admin mode is required for channel modifications
    socket.on('add-channel', ({ name, url, avatar, mode, headersJson }) => {
        try {
            // Check if user is authenticated as admin from the socket middleware
            if (ADMIN_ENABLED && !socket.user?.isAdmin) {
                return socket.emit('app-error', { message: 'Admin access required to add channels' });
            }

            console.log('Adding solo channel:', url);
            const newChannel = ChannelService.addChannel({ name: name, url: url, avatar: avatar, mode: mode, headersJson: headersJson });
            io.emit('channel-added', newChannel); // Broadcast to all clients
        } catch (err) {
            socket.emit('app-error', { message: err.message });
        }
    });

    socket.on('set-current-channel', async (id) => {
        try {
            const nextChannel = await ChannelService.setCurrentChannel(id);
            io.emit('channel-selected', nextChannel); // Broadcast to all clients
        } catch (err) {
            console.error(err);
            socket.emit('app-error', { message: err.message });
        }
    });

    socket.on('delete-channel', async (id) => {
        try {
            // Check if user is authenticated as admin from the socket middleware
            if (ADMIN_ENABLED && !socket.user?.isAdmin) {
                return socket.emit('app-error', { message: 'Admin access required to delete channels' });
            }

            const lastChannel = ChannelService.getCurrentChannel();
            const current = await ChannelService.deleteChannel(id);
            io.emit('channel-deleted', id); // Broadcast to all clients
            if(lastChannel.id != current.id) io.emit('channel-selected', current);
        } catch (err) {
            console.error(err);
            socket.emit('app-error', { message: err.message });
        }
    });

    socket.on('update-channel', async ({ id, updatedAttributes }) => {
        try {
            // Check if user is authenticated as admin from the socket middleware
            if (ADMIN_ENABLED && !socket.user?.isAdmin) {
                return socket.emit('app-error', { message: 'Admin access required to update channels' });
            }

            const updatedChannel = await ChannelService.updateChannel(id, updatedAttributes);
            io.emit('channel-updated', updatedChannel); // Broadcast to all clients
        } catch (err) {
            console.error(err);
            socket.emit('app-error', { message: err.message });
        }
    });
};