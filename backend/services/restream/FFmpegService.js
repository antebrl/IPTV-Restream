const { spawn } = require('child_process');
require('dotenv').config();

let currentFFmpegProcess = null;
let currentChannelId = null;
const STORAGE_PATH = process.env.STORAGE_PATH;
const USE_GPU = process.env.USE_GPU === 'true';
const GPU_DECODER = process.env.GPU_DECODER || 'h264_cuvid';
const GPU_ENCODER = process.env.GPU_ENCODER || 'h264_nvenc';

function startFFmpeg(nextChannel) {
    console.log('Starting FFmpeg process with channel:', nextChannel.id);
    // if (currentFFmpegProcess) {
    //     console.log('Gracefully terminate previous ffmpeg-Prozess...');
    //     await stopFFmpeg();
    // }

    let channelUrl = nextChannel.sessionUrl ? nextChannel.sessionUrl : nextChannel.url;

    currentChannelId = nextChannel.id;
    const headers = nextChannel.headers;

    // Build ffmpeg arguments
    const ffmpegArgs = [
        '-headers', headers.map(header => `${header.key}: ${header.value}`).join('\r\n'),
        '-reconnect', '1',
        '-reconnect_at_eof', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '2'
    ];

    // GPU acceleration: Use NVIDIA hardware decoder instead of CPU
    if (USE_GPU) {
        console.log(`GPU acceleration enabled: decoder=${GPU_DECODER}, encoder=${GPU_ENCODER}`);
        ffmpegArgs.push('-hwaccel', 'cuda');  // Enable CUDA hardware acceleration
        ffmpegArgs.push('-c:v', GPU_DECODER);  // Use GPU decoder (e.g., h264_cuvid)
    }

    ffmpegArgs.push('-i', channelUrl);

    // GPU acceleration: Use NVIDIA hardware encoder instead of CPU
    if (USE_GPU) {
        ffmpegArgs.push('-c:v', GPU_ENCODER);  // Use GPU encoder (e.g., h264_nvenc)
        ffmpegArgs.push('-c:a', 'copy');  // Keep audio codec as-is (no re-encoding)
    } else {
        ffmpegArgs.push('-c', 'copy');  // Keep both video and audio as-is (no re-encoding)
    }

    // HLS output settings
    ffmpegArgs.push(
        '-f', 'hls',
        '-hls_time', '6',
        '-hls_list_size', '5',
        '-hls_flags', 'delete_segments+program_date_time',
        '-start_number', Math.floor(Date.now() / 1000).toString(),
        `${STORAGE_PATH}${currentChannelId}/${currentChannelId}.m3u8`
    );

    currentFFmpegProcess = spawn('ffmpeg', ffmpegArgs);

    currentFFmpegProcess.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    currentFFmpegProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    // currentFFmpegProcess.on('close', (code) => {
    //     console.log(`ffmpeg-Process terminated with code: ${code}`);

    //     // currentFFmpegProcess = null;
    //     // //Restart if crashed
    //     // if (code !== null && code !== 255) {
    //     //     console.log(`Restarting FFmpeg process with channel: ${nextChannel.id}`);
    //     //     //wait 1 second before restarting
    //     //     setTimeout(() => startFFmpeg(nextChannel), 2000);
    //     // }
    // });
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
