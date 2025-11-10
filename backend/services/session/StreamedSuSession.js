const SessionHandler = require('./SessionHandler');

class StreamedSuSession extends SessionHandler {
    constructor(channel) {
        super();
        this.channel = channel;
    }

    static streamedSuHeaders = [
        { "key": "Origin", "value": "https://embedme.top" },
        { "key": "User-Agent", "value": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0" },
        { "key": "Referer", "value": "https://embedme.top/" }
    ];

    static async fetchApiChannels(apiUrl, mode, playlistName) {
        try {
            // Set timeout to 90 seconds for large API responses
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 90000);
            
            let response, data;
            try {
                response = await fetch(apiUrl, { signal: controller.signal });
                if (!response.ok) {
                    throw new Error(response);
                }
                data = await response.json();
            } finally {
                clearTimeout(timeoutId);
            }

            let channels = [];
            data.forEach(stream => {
                const { title, category, poster, sources } = stream;

                for(const source of sources) {
                    const channelUrl = `https://rr.vipstreams.in/${source.source}/js/${source.id}/1/playlist.m3u8`;
                    const channelAvatar = `https://streamed.su${poster ?? '/api/images/poster/fallback.webp'}`;

                    channels.push({
                        name: title,
                        url: channelUrl,
                        avatar: channelAvatar,
                        mode: mode,
                        headersJson: this.streamedSuHeaders,
                        group: category,
                        playlist: apiUrl,
                        playlistName: playlistName
                    });
                }
            });
            return channels;
        } catch (error) {
            console.error('Fetch StreamedSu API failed:', error);
            return [];
        }
    }


    
    async createSession() {

        console.log('Creating session:', this.channel.url);

        try {
            const parts = this.channel.url.split("/");
            const bodyData = { source: parts[3], id: parts[5], streamNo: parts[6] };

            const headers = this.channel.headers.reduce((acc, header) => {
                acc[header.key] = header.value;
                return acc;
            }, {});

            const response = await fetch('https://embedme.top/fetch', {
                method: "POST",
                headers: headers,
                body: JSON.stringify(bodyData)
            });

            if (!response.ok) {
                console.log('Failed to initialize session: ', response);
                throw new Error('Failed to initialize session');
            }

            const encryptedData = await response.text();

            const decryptUrl = `https://streamed-su-decrypt-api.vercel.app/api/decrypt?data=${encodeURIComponent(encryptedData)}`;

            const decryptRes = await fetch(decryptUrl, { method: "GET" });
            if (!decryptRes.ok) {
                console.log('Failed to decrypt session: ', response);
                throw new Error('Failed to decrypt session');
            }

            const sessionDecrypted = await decryptRes.json();
            this.channel.sessionUrl = "https://rr.vipstreams.in" + sessionDecrypted.ok;
            console.log('Session URL:', this.channel.sessionUrl);
            return sessionDecrypted.ok;

        } catch (error) {
            console.error('Session initialization failed:', error);
            this.channel.sessionUrl = null;
        }
    }

}

module.exports = StreamedSuSession;