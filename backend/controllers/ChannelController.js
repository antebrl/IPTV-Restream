const ChannelService = require('../services/ChannelService');
const fs = require('fs');
const m3uParser = require('m3u8-parser');

module.exports = {
    getChannels(req, res) {
        res.json(ChannelService.getChannels());
    },

    getCurrentChannel(req, res) {
        res.json(ChannelService.getCurrentChannel());
    },

    deleteChannel(req, res) {
        try {
            const { channelId } = req.params;
            ChannelService.deleteChannel(channelId);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    updateChannel(req, res) {
        try {
            const { channelId } = req.params;
            const updatedChannel = ChannelService.updateChannel(channelId, req.body);
            res.json(updatedChannel);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    addChannel(req, res) {
        try {
            const { name, url, avatar, restream, headersJson } = req.body;
            const newChannel = ChannelService.addChannel(name, url, avatar, restream, headersJson);
            res.status(201).json(newChannel);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    addPlaylist(req, res) {
        try {
            const { playlistUrl } = req.body;
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
                ChannelService.addChannel(channel.name, channel.url, channel.avatar, channel.restream, channel.headersJson);
            });

            res.status(201).json({ message: 'Playlist added successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};

const express = require('express');
const router = express.Router();
const ChannelController = require('../controllers/ChannelController');

router.post('/playlist', ChannelController.addPlaylist);

module.exports = router;
