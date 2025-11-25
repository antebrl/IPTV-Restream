const streamController = require('./restream/StreamController');
const Channel = require('../models/Channel');
const storageService = require('./restream/StorageService');
const ChannelStorage = require('./ChannelStorage');


class ChannelService {
    constructor() {
        this.channels = ChannelStorage.load();
    }

    clearChannels() {
        ChannelStorage.clear();
        this.channels = ChannelStorage.load();
    }

    getChannels() {
        return this.channels;
    }

    getChannelById(id) {
        return this.channels.find(channel => channel.id === id);
    }

    getFilteredChannels({ playlistName, group }) {
        let filtered = this.channels;
        if (playlistName) {
            filtered = filtered.filter(ch => ch.playlistName && ch.playlistName.toLowerCase() == playlistName.toLowerCase());
        }
        if (group) {
            filtered = filtered.filter(ch => ch.group && ch.group.toLowerCase() === group.toLowerCase());
        }
        return filtered;
    }

    addChannel({ name, url, avatar, mode, headersJson, group = null, playlist = null, playlistName = null, playlistUpdate = false }, save = true) {
        // const existing = this.channels.find(channel => channel.url === url);
        // if (existing) {
        //     throw new Error('Channel already exists');
        // }

        let headers = headersJson;
        try {
            //Try to parse headers if not already parsed
            headers = JSON.parse(headersJson);
        } catch (error) {
        }

        const newChannel = new Channel(name, url, avatar, mode, headers, group, playlist, playlistName, playlistUpdate);
        this.channels.push(newChannel);
        if(save) ChannelStorage.save(this.channels);

        return newChannel;
    }

    async setCurrentChannel(id) {
        // Método mantenido para compatibilidad pero ahora simplemente retorna el canal
        // ya que cada usuario maneja su selección de forma independiente
        const nextChannel = this.channels.find(channel => channel.id === id);
        if (!nextChannel) {
            throw new Error('Channel does not exist');
        }
        return nextChannel;
    }

    getCurrentChannel() {
        // Retorna el primer canal disponible (usado en inicialización del frontend)
        return this.channels.length > 0 ? this.channels[0] : null;
    }

    getChannelById(id) {
        return this.channels.find(channel => channel.id === id);
    }

    async deleteChannel(id, save = true) {
        const channelIndex = this.channels.findIndex(channel => channel.id === id);
        if (channelIndex === -1) {
            throw new Error('Channel does not exist');
        }

        // Prevent deleting the last channel
        if (this.channels.length === 1) {
            throw new Error('Cannot delete the last channel');
        }

        this.channels.splice(channelIndex, 1);

        if(save) ChannelStorage.save(this.channels);
    }

    async updateChannel(id, updatedAttributes, save = true) {

        const channelIndex = this.channels.findIndex(channel => channel.id === id);
        if (channelIndex === -1) {
            throw new Error('Channel does not exist');
        }

        const channel = this.channels[channelIndex];
        Object.assign(channel, updatedAttributes);

        if(save) ChannelStorage.save(this.channels);

        return channel;
    }
}

module.exports = new ChannelService();
