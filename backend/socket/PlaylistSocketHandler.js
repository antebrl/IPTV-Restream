const PlaylistService = require('../services/PlaylistService');
const ChannelService = require('../services/ChannelService');
const Channel = require('../models/Channel');

module.exports = (io, socket) => {

    socket.on('add-playlist', async ({ playlist, mode, headersJson }) => {
        try {
            const channels = await PlaylistService.addPlaylist(playlist, mode, headersJson);
            if (channels) {
                channels.forEach(channel => {
                    io.emit('channel-added', channel);
                });
            }
        } catch (err) {
            console.error(err);
            socket.emit('app-error', { message: err.message });
        }
    });


    socket.on('update-playlist', ({ playlist, updatedAttributes }) => {
        try {
            const channels =  PlaylistService.updatePlaylist(playlist, updatedAttributes);
            channels.forEach(channel => {
                io.emit('channel-updated', channel);
            });
        } catch (err) {
            console.error(err);
            socket.emit('app-error', { message: err.message });
        }
    });


    socket.on('delete-playlist', (playlist) => {
        try {
            const channels = PlaylistService.deletePlaylist(playlist);
            channels.forEach(channel => {
                io.emit('channel-deleted', channel.id);
            });
            io.emit('channel-selected', ChannelService.getCurrentChannel());
        } catch (err) {
            console.error(err);
            socket.emit('app-error', { message: err.message });
        }
    });
};
