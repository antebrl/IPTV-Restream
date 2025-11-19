const m3uParser = require('iptv-playlist-parser');
const ChannelService = require('./ChannelService');
const ChannelStorage = require('./ChannelStorage');
const StreamedSuSession = require('./session/StreamedSuSession');

class PlaylistService {

    async addPlaylist(playlist, playlistName, mode, playlistUpdate, headersJson) {

        console.log('Adding playlist', playlist);

        let content = "";
        if(playlist.startsWith("http")) {
            // Set timeout to 90 seconds for large playlists
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 90000);
            
            try {
                const response = await fetch(playlist, { signal: controller.signal });
                content = await response.text();
            } finally {
                clearTimeout(timeoutId);
            }

            //check for streamedSu here and add channel for every source
            if(playlist.includes('streamed.su')) {
                console.log('Fetching StreamedSu API channels');
                const channels = await StreamedSuSession.fetchApiChannels(playlist, mode, playlistName);
                const data = channels.map(channel => {
                    return ChannelService.addChannel(channel, false);
                });

                ChannelStorage.save(ChannelService.getChannels());
                return data;
            }
        } else {
            content = playlist;
            const fs = require('fs');
            fs.writeFileSync(`/channels/${playlistName}.txt`, playlist, { encoding: 'utf-8' }, (err) => err && console.error(err));
            console.log('Adding playlist to playlist.m3u8');
        }

        const parsedPlaylist = m3uParser.parse(content);

        // list of added channels
        const channels = parsedPlaylist.items.map(channel => {
            //TODO: add channel.http if not '' to headers
            try {
                return ChannelService.addChannel({
                    name: channel.name,
                    url: channel.url,
                    avatar: channel.tvg.logo,
                    mode: mode,
                    headersJson: headersJson,
                    group: channel.group.title,
                    playlist: playlist,
                    playlistName: playlistName,
                    playlistUpdate: playlistUpdate
                }, false);
            } catch (error) {
                console.error(error);
                return null;
            }
        })
        .filter(result => result !== null);

        ChannelStorage.save(ChannelService.getChannels());

        return channels;
    }


    async updatePlaylist(playlistUrl, updatedAttributes) {

        // Update channels attributes
        const channels = ChannelService
                            .getChannels()
                            .filter(channel => channel.playlist === playlistUrl);

        for(let channel of channels) {
            channel = await ChannelService.updateChannel(channel.id, updatedAttributes, false);
        }
        ChannelStorage.save(ChannelService.getChannels());
        
        return channels;
    }

    async deletePlaylist(playlistUrl) {

        console.log('Deleting playlist', playlistUrl);

        const channels = ChannelService
                            .getChannels()
                            .filter(channel => channel.playlist === playlistUrl);
                            
        for(const channel of channels) {
            await ChannelService.deleteChannel(channel.id, false);
        }
        ChannelStorage.save(ChannelService.getChannels());

        return channels;
    }
}

module.exports = new PlaylistService();
