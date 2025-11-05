import React, { useContext, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Channel, ChannelMode } from '../types';
import { ToastContext } from './notifications/ToastContext';
import socketService from '../services/SocketService';

interface VideoPlayerProps {
  channel: Channel | null;
  syncEnabled: boolean;
}

function VideoPlayer({ channel, syncEnabled }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [streamPaused, setStreamPaused] = useState(false);
  const { addToast, removeToast, clearToasts, editToast } = useContext(ToastContext);

  // Listen for stream status changes
  useEffect(() => {
    const handleStreamStatusChange = (data: { status: string, channelId: number }) => {
      if (channel && data.channelId === channel.id) {
        if (data.status === 'stopped') {
          setStreamPaused(true);
          // Show toast notification
          addToast({
            type: 'info',
            title: 'Stream paused',
            message: 'Stream paused due to inactivity. Will resume automatically when viewers return.',
            duration: 5000,
          });
        } else if (data.status === 'started') {
          setStreamPaused(false);
          // Show toast notification
          addToast({
            type: 'success',
            title: 'Stream resumed',
            message: 'Stream is now active.',
            duration: 5000,
          });
          
          // Reload the player
          if (hlsRef.current) {
            const videoElement = videoRef.current;
            if (videoElement && channel) {
              const sourceLinks: Record<ChannelMode, string> = {
                direct: channel.url,
                proxy: import.meta.env.VITE_BACKEND_URL + '/proxy/channel',
                restream: import.meta.env.VITE_BACKEND_URL + '/streams/' + channel.id + "/" + channel.id + ".m3u8",
              };
              
              // Give the backend a moment to start the stream
              setTimeout(() => {
                hlsRef.current?.loadSource(sourceLinks[channel.mode]);
                hlsRef.current?.startLoad();
              }, 2000);
            }
          }
        }
      }
    };

    socketService.subscribeToEvent('stream-status-changed', handleStreamStatusChange);

    return () => {
      socketService.unsubscribeFromEvent('stream-status-changed', handleStreamStatusChange);
    };
  }, [channel]);

  useEffect(() => {
    if (!videoRef.current || !channel?.url) return;
    
    const video = videoRef.current;

    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        autoStartLoad: syncEnabled ? false : true,
        liveDurationInfinity: true,
        //debug: true,
        manifestLoadPolicy: {
          default: {
            maxTimeToFirstByteMs: Infinity,
            maxLoadTimeMs: 20000,
            timeoutRetry: {
              maxNumRetry: 3,
              retryDelayMs: 0,
              maxRetryDelayMs: 0,
            },
            errorRetry: {
              maxNumRetry: 12,
              retryDelayMs: 1000,
              maxRetryDelayMs: 8000,
              backoff: 'linear',
              shouldRetry: (
                retryConfig,
                retryCount,
                _isTimeout,
                _loaderResponse,
              ) => retryCount < retryConfig!.maxNumRetry
            },
          },
        },
      });

      const sourceLinks: Record<ChannelMode, string> = {
        direct: channel.url,
        proxy: import.meta.env.VITE_BACKEND_URL + '/proxy/channel', 
        restream: import.meta.env.VITE_BACKEND_URL + '/streams/' + channel.id + "/" + channel.id + ".m3u8", 
      };    

      hlsRef.current = hls;
      hls.loadSource(sourceLinks[channel.mode]);
      hls.attachMedia(video);

      if(!syncEnabled) return;

      clearToasts();
      let toastStartId = null;
      toastStartId = addToast({
        type: 'loading',
        title: 'Starting Stream',
        message: 'This might take a few moments...',
        duration: 0,
      });

      const tolerance = import.meta.env.VITE_SYNCHRONIZATION_TOLERANCE || 0.8;
      const maxDeviation = import.meta.env.VITE_SYNCHRONIZATION_MAX_DEVIATION || 4;

      let toastDurationSet = false;
      hls.on(Hls.Events.MANIFEST_PARSED, (_event, _data) => {
        if (channel.mode === 'restream') {
          const now = new Date().getTime();
      
          const fragments = hls.levels[0]?.details?.fragments;
          const lastFragment = fragments?.[fragments.length - 1];
          if (!lastFragment || !lastFragment.programDateTime) {
            console.warn("No program date time found in fragment. Cannot synchronize.");
            return;
          }
      
          const timeDiff = (now - lastFragment.programDateTime) / 1000;
          const videoLength = fragments.reduce((acc, fragment) => acc + fragment.duration, 0);
          const targetDelay : number = Number(import.meta.env.VITE_STREAM_DELAY);
      
          //Load stream if it is close to the target delay
          const timeTolerance = tolerance + 1;

          const delay : number = videoLength + timeDiff + timeTolerance;
          if (delay >= targetDelay) {
            hls.startLoad();
            video.play();
            console.log("Starting stream");
            if (!toastDurationSet && toastStartId) {
              removeToast(toastStartId);
            }
          } else {
            console.log("Waiting for stream to load: ", delay, " < ", targetDelay);

            if(!toastDurationSet && toastStartId) {
              editToast(toastStartId, {duration: (1 + targetDelay - delay) * 1000});
              toastDurationSet = true;
            }
      
            // Reload manifest
            setTimeout(() => {
              hls.loadSource(import.meta.env.VITE_BACKEND_URL + '/streams/' + channel.id + "/" + channel.id + ".m3u8");
            }, 1000); 
          }
        } else {
          hls.startLoad();
          video.play();

          if (toastStartId) {
            removeToast(toastStartId);
          }
        }
      });
      
      
      let timeMissingErrorShown = false;
      hls.on(Hls.Events.FRAG_LOADED, (_event, data) => {

        const now = new Date().getTime();
        const newFrag = data.frag;

        if(!newFrag.programDateTime) {
          if(!timeMissingErrorShown) {
            addToast({
              type: 'error',
              title: 'Synchronization Error',
              message: `Playback can't be synchonized for this channel in ${channel.mode}. Change this channel to restream mode and try again.`,
              duration: 5000,
            });
            console.warn("No program date time found in fragment. Cannot synchronize.");
            timeMissingErrorShown = true;
          }
          return;
        }
        const timeDiff = (now - newFrag.programDateTime) / 1000;
        const videoDiff = newFrag.end - video.currentTime;
        const delay = timeDiff + videoDiff;
        
        const targetDelay = channel.mode == 'restream' ? import.meta.env.VITE_STREAM_DELAY : import.meta.env.VITE_STREAM_PROXY_DELAY;

        const deviation = delay - targetDelay;

        if (Math.abs(deviation) > maxDeviation) {
          video.currentTime += deviation;
          video.playbackRate = 1.0;
          console.log("Significant deviation detected. Adjusting current time.");
        } else if (Math.abs(deviation) > tolerance) {
          const adjustmentFactor = import.meta.env.VITE_SYNCHRONIZATION_ADJUSTMENT || 0.06;
          const speedAdjustment = 1 +  Math.sign(deviation) * Math.min(Math.abs(adjustmentFactor * deviation), import.meta.env.VITE_SYNCHRONIZATION_MAX_ADJUSTMENT || 0.16);
          video.playbackRate = speedAdjustment;
        } else {
          video.playbackRate = 1.0;
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error('HLS error:', data);

          if (toastStartId) {
            removeToast(toastStartId);
          }

          const messages: Record<ChannelMode, string> = {
            direct: 'The stream is not working. Try with proxy/restream option enabled for this channel.',
            proxy: 'The stream is not working. Try with restream option enabled for this channel.',
            restream: `The stream is not working. Check the source. ${data.response?.text}`,
          };
          
          addToast({
            type: 'error',
            title: 'Stream Error',
            message: messages[channel.mode],
            duration: 5000,
          });
          return;
        }
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };

  }, [channel?.url, channel?.mode, syncEnabled]);

  const handleVideoClick = (event: React.MouseEvent<HTMLVideoElement>) => {
    if (videoRef.current?.muted) {
      event.preventDefault();

      videoRef.current.muted = false;
      videoRef.current.play();
    }
  };

  // Display a message when stream is paused due to inactivity
  if (streamPaused && channel?.mode === 'restream') {
    return (
      <div className="relative bg-gray-800 rounded-lg overflow-hidden">
        <div className="w-full aspect-video bg-black flex items-center justify-center flex-col">
          <img 
            src={channel.avatar} 
            alt="Stream paused" 
            className="w-24 h-24 mb-4 opacity-50"
          />
          <h3 className="text-xl text-gray-400">Stream paused</h3>
          <p className="text-gray-500 mt-2">Streaming will resume automatically when viewers return</p>
        </div>
        <div className="flex items-center p-4 bg-gray-900 text-white">
          <img 
            src={channel.avatar} 
            alt={`${channel.name} avatar`} 
            className="w-10 h-10 object-contain mr-3" 
          />
          <span className="font-medium">{channel.name}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="w-full aspect-video bg-black"
        muted
        autoPlay
        playsInline
        controls
        onClick={handleVideoClick}
      />
      <div className="flex items-center p-4 bg-gray-900 text-white">
        <img 
          src={channel?.avatar} 
          alt={`${channel?.name} avatar`} 
          className="w-10 h-10 object-contain mr-3" 
        />
        <span className="font-medium">{channel?.name}</span>
      </div>
    </div>
  );
}

export default VideoPlayer;