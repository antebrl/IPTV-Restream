const streamController = require('./streaming/StreamController');
const Channel = require('../models/Channel');
const fs = require('fs');
const m3uParser = require('m3u8-parser');

class ChannelService {
    constructor() {

        const daddyHeaders = [
            { "key": "Origin", "value": "https://cookiewebplay.xyz" },
            { "key": "User-Agent", "value": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36" },
            { "key": "Referer", "value": "https://cookiewebplay.xyz/" }
        ];

        this.channels = [
            //Some Test-channels to get started
            new Channel('Das Erste', process.env.DEFAULT_CHANNEL_URL, "https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Das_Erste-Logo_klein.svg/768px-Das_Erste-Logo_klein.svg.png", false, []),
            new Channel('DAZN 1 DE', "https://xyzdddd.mizhls.ru/lb/premium426/index.m3u8", "https://upload.wikimedia.org/wikipedia/commons/4/49/DAZN_1.svg", true, daddyHeaders),
            new Channel('beIN Sports 1', "https://xyzdddd.mizhls.ru/lb/premium61/index.m3u8","https://www.thesportsdb.com/images/media/channel/logo/BeIn_Sports_1_Australia.png", true, daddyHeaders),
            new Channel('beIN Sports 2', "https://xyzdddd.mizhls.ru/lb/premium92/index.m3u8", "https://www.thesportsdb.com/images/media/channel/logo/BeIn_Sports_HD_2_France.png", true, daddyHeaders),
            new Channel('Sky Sport Football', "https://xyzdddd.mizhls.ru/lb/premium35/index.m3u8", "https://raw.githubusercontent.com/tv-logo/tv-logos/main/countries/united-kingdom/sky-sports-football-uk.png", true, daddyHeaders),
            new Channel('Sky Sports Premier League', "https://xyzdddd.mizhls.ru/lb/premium130/index.m3u8", "https://github.com/tv-logo/tv-logos/blob/main/countries/united-kingdom/sky-sports-premier-league-uk.png?raw=true", true, daddyHeaders),
            new Channel('SuperSport Premier League', 'https://xyzdddd.mizhls.ru/lb/premium414/index.m3u8', "https://github.com/tv-logo/tv-logos/blob/8d25ddd79ca2f9cd033b808c45cccd2b3da563ee/countries/south-africa/supersport-premier-league-za.png?raw=true", true, daddyHeaders),
            new Channel('NBA', "https://v14.thetvapp.to/hls/NBA28/index.m3u8?token=bFFITmZCbllna21WRUJra0xjN0JPN0w1VlBmSkNUcTl4Zml3a2tQSg==", "https://raw.githubusercontent.com/tv-logo/tv-logos/635e715cb2f2c6d28e9691861d3d331dd040285b/countries/united-states/nba-tv-icon-us.png", false, []),
        ];
        this.currentChannel = this.channels[0];
    }

    getChannels() {
        return this.channels;
    }

    addChannel(name, url, avatar, restream, headersJson) {
        const existing = this.channels.find(channel => channel.url === url);

        if (existing && restream == existing.restream) {
            throw new Error('Channel already exists');
        }

        const headers = JSON.parse(headersJson);
        const newChannel = new Channel(name, url, avatar, restream, headers);
        this.channels.push(newChannel);
        
        return newChannel;
    }

    setCurrentChannel(id) {
        const nextChannel = this.channels.find(channel => channel.id === id);
        if (!nextChannel) {
            throw new Error('Channel does not exist');
        }

        if (this.currentChannel !== nextChannel) {
            if(nextChannel.restream) {
                streamController.stop(this.currentChannel.id);
                streamController.stop(nextChannel.id);
                streamController.start(nextChannel);
            } else {
                streamController.stop(this.currentChannel.id);
            }
            this.currentChannel = nextChannel;
        }
        return nextChannel;
    }

    getCurrentChannel() {
        return this.currentChannel;
    }

    deleteChannel(id) {
        const channelIndex = this.channels.findIndex(channel => channel.id === id);
        if (channelIndex === -1) {
            throw new Error('Channel does not exist');
        }

        const [deletedChannel] = this.channels.splice(channelIndex, 1);

        if (this.currentChannel.id === id) {
            if (deletedChannel.restream) {
                streamController.stop(deletedChannel.id);
            }

            this.currentChannel = this.channels.length > 0 ? this.channels[0] : null;
            if(this.currentChannel?.restream) {
                streamController.start(this.currentChannel);
            }
        }


        return this.currentChannel;
    }

    updateChannel(id, updatedAttributes) {
        const channelIndex = this.channels.findIndex(channel => channel.id === id);
        if (channelIndex === -1) {
            throw new Error('Channel does not exist');
        }

        const streamChanged = updatedAttributes.url != this.currentChannel.url || 
                              JSON.stringify(updatedAttributes.headers) != JSON.stringify(this.currentChannel.headers) || 
                              updatedAttributes.restream != this.currentChannel.restream;

        const channel = this.channels[channelIndex];
        Object.assign(channel, updatedAttributes);

        if(this.currentChannel.id == id) {
            if(streamChanged) {
                streamController.stop(channel.id);
                if(channel.restream) {
                    streamController.start(channel);
                }
            }
        }

        return channel;
    }

    addChannelsFromPlaylist(playlistUrl) {
        const playlistContent = fs.readFileSync(playlistUrl, 'utf8');
        const parser = new m3uParser.Parser();
        parser.push(playlistContent);
        parser.end();

        const parsedPlaylist = parser.manifest;
        const channels = parsedPlaylist.segments.map(segment => ({
            name: segment.title,
            url: segment.uri,
            avatar: '',
            restream: false,
            headersJson: '[]'
        }));

        channels.forEach(channel => {
            this.addChannel(channel.name, channel.url, channel.avatar, channel.restream, channel.headersJson);
        });

        return channels;
    }
}

module.exports = new ChannelService();
