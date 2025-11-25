const { spawn } = require('child_process');
require('dotenv').config();

let currentFFmpegProcess = null;
let currentChannelId = null;
const STORAGE_PATH = process.env.STORAGE_PATH;

// Environment-based transcode options
const FORCE_TRANSCODE = process.env.FORCE_TRANSCODE === 'true';
const VIDEO_CODEC = process.env.TRANSCODE_VIDEO_CODEC || 'libx264';
const AUDIO_CODEC = process.env.TRANSCODE_AUDIO_CODEC || 'aac';
const PRESET = process.env.TRANSCODE_PRESET || 'veryfast';
const PROFILE = process.env.TRANSCODE_PROFILE || 'baseline';
const LEVEL = process.env.TRANSCODE_LEVEL || '3.0';
const AUDIO_RATE = process.env.TRANSCODE_AUDIO_RATE || '48000';
const AUDIO_CHANNELS = process.env.TRANSCODE_AUDIO_CHANNELS || '2';
const AUDIO_BITRATE = process.env.TRANSCODE_AUDIO_BITRATE || '128k';
const HLS_TIME = process.env.HLS_SEGMENT_TIME || '6';
const HLS_LIST_SIZE = process.env.HLS_LIST_SIZE || '5';

function buildFFmpegArgs(channelUrl, headers, channelId) {
    const baseInput = [
        '-headers', headers.map(header => `${header.key}: ${header.value}`).join('\r\n'),
        '-reconnect', '1',
        '-reconnect_at_eof', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '2',
        '-i', channelUrl
    ];

    let codecPart;
    if (FORCE_TRANSCODE) {
        codecPart = [
            '-fflags', '+genpts',
            '-c:v', VIDEO_CODEC,
            '-preset', PRESET,
            '-tune', 'zerolatency',
            '-profile:v', PROFILE,
            '-level', LEVEL,
            '-vf', 'format=yuv420p',
            '-c:a', AUDIO_CODEC,
            '-ar', AUDIO_RATE,
            '-ac', AUDIO_CHANNELS,
            '-b:a', AUDIO_BITRATE
        ];
    } else {
        codecPart = [
            '-fflags', '+genpts',
            '-c', 'copy'
        ];
    }

    const hlsPart = [
        '-f', 'hls',
        '-hls_time', HLS_TIME,
        '-hls_list_size', HLS_LIST_SIZE,
        '-hls_flags', 'delete_segments+program_date_time+independent_segments',
        '-start_number', Math.floor(Date.now() / 1000),
        `${STORAGE_PATH}${channelId}/${channelId}.m3u8`
    ];

    return [...baseInput, ...codecPart, ...hlsPart];
}

function startFFmpeg(nextChannel) {
    console.log('Starting FFmpeg process with channel:', nextChannel.id, 'FORCE_TRANSCODE=', FORCE_TRANSCODE);

    const channelUrl = nextChannel.sessionUrl ? nextChannel.sessionUrl : nextChannel.url;
    currentChannelId = nextChannel.id;
    const headers = nextChannel.headers || [];

    const args = buildFFmpegArgs(channelUrl, headers, currentChannelId);
    console.log('FFmpeg args:', args.join(' '));

    currentFFmpegProcess = spawn('ffmpeg', args);

    currentFFmpegProcess.stdout.on('data', (data) => {
        console.log(`ffmpeg stdout: ${data}`);
    });

    currentFFmpegProcess.stderr.on('data', (data) => {
        // Filter very noisy repeating lines if desired later
        console.error(`ffmpeg stderr: ${data}`);
    });

    currentFFmpegProcess.on('close', (code) => {
        console.log(`FFmpeg process terminated with code: ${code}`);
        currentFFmpegProcess = null;
    });
}

function stopFFmpeg() {
    return new Promise((resolve, reject) => {
        if (currentFFmpegProcess) {
            console.log('Gracefully terminate ffmpeg-Process...');
            
            currentFFmpegProcess.on('close', (code) => {
                console.log(`ffmpeg-Process terminated with code: ${code}`);
                currentFFmpegProcess = null;
                resolve(); 
            });

            currentFFmpegProcess.kill('SIGTERM');
        } else {
            console.log('No ffmpeg process is running.');
            resolve(); 
        }
    });
}

function isFFmpegRunning() {
    return currentFFmpegProcess !== null;
}

module.exports = {
    startFFmpeg,
    stopFFmpeg,
    isFFmpegRunning
};
