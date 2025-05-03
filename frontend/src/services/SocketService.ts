import { io, Socket } from 'socket.io-client';
import { ChannelMode } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  private isConnecting: boolean = false;
  private token: string | null = null;

  // Initialize connection with JWT token if available
  connect() {
    // Get JWT token from localStorage
    const newToken = localStorage.getItem('admin_token');

    // If already connected with the same token, don't reconnect
    if (this.socket?.connected && this.token === newToken) {
      return;
    }

    // If connecting with the same token, don't try to connect again
    if (this.isConnecting && this.token === newToken) {
      return;
    }

    this.isConnecting = true;
    this.token = newToken;

    console.log('Connecting to WebSocket server');

    // Disconnect existing socket if necessary
    if (this.socket) {
      // Save listeners before disconnecting
      const savedListeners = new Map(this.listeners);

      // Disconnect and reset the socket
      this.socket.disconnect();
      this.socket = null;

      // Restore listeners
      this.listeners = savedListeners;
    }

    // Connect with auth token if available
    this.socket = io(import.meta.env.VITE_BACKEND_URL, {
      auth: this.token ? { token: this.token } : undefined,
    });

    this.socket.on('connect', () => {
      console.log(
        'Connected to WebSocket server with auth:',
        this.token ? 'yes' : 'no'
      );
      this.isConnecting = false;

      // Re-apply listeners to new socket connection
      this.reapplyListeners();
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      this.isConnecting = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.isConnecting = false;
    });

    this.socket.on('app-error', (error) => {
      console.error('Socket error:', error);
    });

    // Listen for incoming custom events
    this.socket.onAny((event: string, data: any) => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.forEach((listener) => listener(data));
      }
    });
  }

  // Re-apply all event listeners to the new socket connection
  private reapplyListeners() {
    // Nothing needed here as Socket.IO automatically handles event listeners
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnecting = false;
    }
  }

  subscribeToEvent<T>(event: string, listener: (data: T) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    const eventListeners = this.listeners.get(event);
    // Avoid duplicate listeners
    if (eventListeners && !eventListeners.includes(listener)) {
      eventListeners.push(listener);
    }
  }

  // Unsubscribe from event
  unsubscribeFromEvent<T>(event: string, listener: (data: T) => void) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      this.listeners.set(
        event,
        eventListeners.filter(
          (existingListener) => existingListener !== listener
        )
      );
    }
  }

  // Send chat message
  sendMessage(
    userName: string,
    userAvatar: string,
    message: string,
    timestamp: string
  ) {
    if (!this.socket || !this.socket.connected) {
      this.connect();

      if (!this.socket || !this.socket.connected) {
        throw new Error('Socket is not connected.');
      }
    }

    this.socket.emit('send-message', {
      userName,
      userAvatar,
      message,
      timestamp,
    });
  }

  // Add channel
  addChannel(
    name: string,
    url: string,
    avatar: string,
    mode: ChannelMode,
    headersJson: string,
  ) {
    if (!this.socket || !this.socket.connected) {
      this.connect();

      if (!this.socket || !this.socket.connected) {
        throw new Error('Socket is not connected.');
      }
    }

    this.socket.emit('add-channel', { name, url, avatar, mode, headersJson });
  }

  // Set current channel
  setCurrentChannel(id: number) {
    if (!this.socket || !this.socket.connected) {
      this.connect();

      if (!this.socket || !this.socket.connected) {
        throw new Error('Socket is not connected.');
      }
    }

    this.socket.emit('set-current-channel', id);
  }

  // Delete channel
  deleteChannel(id: number) {
    if (!this.socket || !this.socket.connected) {
      this.connect();

      if (!this.socket || !this.socket.connected) {
        throw new Error('Socket is not connected.');
      }
    }

    this.socket.emit('delete-channel', id);
  }

  // Update channel
  updateChannel(id: number, updatedAttributes: any) {
    if (!this.socket || !this.socket.connected) {
      this.connect();

      if (!this.socket || !this.socket.connected) {
        throw new Error('Socket is not connected.');
      }
    }

    this.socket.emit('update-channel', { id, updatedAttributes });
  }

  // Add playlist
  addPlaylist(
    playlist: string,
    playlistName: string,
    mode: ChannelMode,
    playlistUpdate: boolean,
    headers: string,
  ) {
    if (!this.socket || !this.socket.connected) {
      this.connect();

      if (!this.socket || !this.socket.connected) {
        throw new Error('Socket is not connected.');
      }
    }

    this.socket.emit('add-playlist', {
      playlist,
      playlistName,
      mode,
      playlistUpdate,
      headers,
    });
  }

  // Update playlist
  updatePlaylist(
    playlist: string,
    updatedAttributes: any,
  ) {
    if (!this.socket || !this.socket.connected) {
      this.connect();

      if (!this.socket || !this.socket.connected) {
        throw new Error('Socket is not connected.');
      }
    }

    this.socket.emit('update-playlist', { playlist, updatedAttributes });
  }

  // Delete playlist
  deletePlaylist(playlist: string) {
    if (!this.socket || !this.socket.connected) {
      this.connect();

      if (!this.socket || !this.socket.connected) {
        throw new Error('Socket is not connected.');
      }
    }

    this.socket.emit('delete-playlist', playlist);
  }

  // Update authentication token and reconnect
  updateAuthToken() {
    // Force disconnect and reconnect with the new token
    this.disconnect();

    // Reset the token so connect() will use the new one from localStorage
    this.token = null;

    // Connect with the new token
    this.connect();
  }
}

const socketService = new SocketService();
export default socketService;