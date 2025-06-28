import { useState, useEffect, useMemo, useContext } from 'react';
import { Search, Plus, Settings, Users, Radio, Tv2, ChevronDown, Shield } from 'lucide-react';
import VideoPlayer from './components/VideoPlayer';
import ChannelList from './components/ChannelList';
import Chat from './components/chat/Chat';
import ChannelModal from './components/add_channel/ChannelModal';
import { Channel } from './types';
import socketService from './services/SocketService';
import apiService from './services/ApiService';
import SettingsModal from './components/SettingsModal';
import TvPlaylistModal from './components/TvPlaylistModal';
import { ToastProvider, ToastContext } from './components/notifications/ToastContext';
import ToastContainer from './components/notifications/ToastContainer';
import { AdminProvider, useAdmin } from './components/admin/AdminContext';
import AdminModal from './components/admin/AdminModal';

function AppContent() {

  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTvPlaylistOpen, setIsTvPlaylistOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(() => {
    const savedValue = localStorage.getItem('syncEnabled');
    return savedValue !== null ? JSON.parse(savedValue) : false;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [editChannel, setEditChannel] = useState<Channel | null>(null);

  const [selectedPlaylist, setSelectedPlaylist] = useState<string>('All Channels');
  const [selectedGroup, setSelectedGroup] = useState<string>('Category');
  const [isPlaylistDropdownOpen, setIsPlaylistDropdownOpen] = useState(false);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);

  const { isAdmin, isAdminEnabled, setIsAdminEnabled } = useAdmin();
  const { addToast } = useContext(ToastContext);

  // Get unique playlists from channels
  const playlists = useMemo(() => {
    const uniquePlaylists = new Set(channels.map(channel => channel.playlistName).filter(playlistName => playlistName !== null));
    return ['All Channels', ...Array.from(uniquePlaylists)];
  }, [channels]);

  const filteredChannels = useMemo(() => {
    //Filter by playlist
    let filteredByPlaylist = selectedPlaylist === 'All Channels' ? channels : channels.filter(channel =>
      channel.playlistName === selectedPlaylist
    );

    //Filter by group
    filteredByPlaylist = selectedGroup === 'Category' ? filteredByPlaylist : filteredByPlaylist.filter(channel =>
      channel.group === selectedGroup
    );

    //Filter by name search
    return filteredByPlaylist.filter(channel =>
      channel.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [channels, selectedPlaylist, selectedGroup, searchQuery]);

  const groups = useMemo(() => {
    let uniqueGroups;
    if (selectedPlaylist === 'All Channels') {
      uniqueGroups = new Set(channels.map(channel => channel.group).filter(group => group !== null));
    } else {
      uniqueGroups = new Set(channels.filter(channel => channel.group !== null && channel.playlistName === selectedPlaylist).map(channel => channel.group));
    }
    return ['Category', ...Array.from(uniqueGroups)];
  }, [selectedPlaylist, channels]);

  useEffect(() => {
    // Check if admin mode is enabled on the server
    apiService
      .request<{ enabled: boolean }>('/auth/admin-status', 'GET')
      .then((data) => setIsAdminEnabled(data.enabled))
      .catch((error) => console.error('Error checking admin status:', error));

    apiService
      .request<Channel[]>('/channels/', 'GET')
      .then((data) => setChannels(data))
      .catch((error) => console.error('Error loading channels:', error));

    apiService
      .request<Channel>('/channels/current', 'GET')
      .then((data) => setSelectedChannel(data))
      .catch((error) => console.error('Error loading current channel:', error));

    console.log('Subscribing to events');
    const channelAddedListener = (channel: Channel) => {
      setChannels((prevChannels) => [...prevChannels, channel]);
    };

    const channelSelectedListener = (nextChannel: Channel) => {
      setSelectedChannel(nextChannel);
    };

    const channelUpdatedListener = (updatedChannel: Channel) => {
      setChannels((prevChannels) =>
        prevChannels.map((channel) =>
          channel.id === updatedChannel.id ?
            updatedChannel : channel
        )
      );

      setSelectedChannel((selectedChannel: Channel | null) => {
        if (selectedChannel?.id === updatedChannel.id) {
          // Reload stream if the stream attributes (url, headers) have changed
          if (
            (selectedChannel?.url != updatedChannel.url ||
              JSON.stringify(selectedChannel?.headers) !=
              JSON.stringify(updatedChannel.headers)) &&
            selectedChannel?.mode === 'restream'
          ) {
            //TODO: find a better solution instead of reloading (problem is m3u8 needs time to refresh server-side)
            setTimeout(() => {
              window.location.reload();
            }, 3000);
          }
          return updatedChannel;
        }
        return selectedChannel;
      });
    };

    const channelDeletedListener = (deletedChannel: number) => {
      setChannels((prevChannels) =>
        prevChannels.filter((channel) => channel.id !== deletedChannel)
      );
    };

    const errorListener = (error: { message: string }) => {
      addToast({
        type: 'error',
        title: 'Error',
        message: error.message,
        duration: 5000,
      });
    };

    socketService.subscribeToEvent('channel-added', channelAddedListener);
    socketService.subscribeToEvent('channel-selected', channelSelectedListener);
    socketService.subscribeToEvent('channel-updated', channelUpdatedListener);
    socketService.subscribeToEvent('channel-deleted', channelDeletedListener);
    socketService.subscribeToEvent('app-error', errorListener);

    socketService.connect();

    return () => {
      socketService.unsubscribeFromEvent('channel-added', channelAddedListener);
      socketService.unsubscribeFromEvent(
        'channel-selected',
        channelSelectedListener
      );
      socketService.unsubscribeFromEvent(
        'channel-updated',
        channelUpdatedListener
      );
      socketService.unsubscribeFromEvent(
        'channel-deleted',
        channelDeletedListener
      );
      socketService.unsubscribeFromEvent('app-error', errorListener);
      socketService.disconnect();
      console.log('WebSocket connection closed');
    };
  }, []);

  const handleEditChannel = (channel: Channel) => {
    // Only allow editing if admin mode is not enabled or user is admin
    if (!isAdminEnabled || isAdmin) {
      setEditChannel(channel);
      setIsModalOpen(true);
    } else {
      setIsAdminModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto py-4">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Radio className="w-8 h-8 text-blue-500" />
            <h1 className="text-2xl font-bold">StreamHub</h1>

            {isAdmin && (
              <span className="ml-2 flex items-center px-2 py-1 text-xs font-medium text-green-400 bg-green-400 bg-opacity-10 rounded-full border border-green-400">
                <Shield className="w-3 h-3 mr-1" />
                Admin
              </span>
            )}
          </div>
          <div className="relative max-w-md w-full">
            <input
              type="text"
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>
          <div className="flex items-center space-x-4">
            <Users className="w-6 h-6 text-blue-500" />
            <button
              onClick={() => setIsTvPlaylistOpen(true)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Tv2 className="w-6 h-6 text-blue-500" />
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Settings className="w-6 h-6 text-blue-500" />
            </button>
            {isAdminEnabled && (
              <button
                onClick={() => setIsAdminModalOpen(true)}
                className={`p-2 hover:bg-gray-800 rounded-lg transition-colors ${isAdmin ?
                  "text-green-500" : ""}`}
              >
                <Shield className="w-6 h-6" />
              </button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-8 space-y-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <button
                      onClick={() => {
                        setIsPlaylistDropdownOpen(!isPlaylistDropdownOpen);
                        setIsGroupDropdownOpen(false);
                      }}
                      className="flex items-center space-x-2 group"
                    >
                      <div className="flex items-center space-x-2">
                        <Tv2 className="w-5 h-5 text-blue-500" />
                        <h2 className="text-xl font-semibold group-hover:text-blue-400 transition-colors">
                          {selectedPlaylist}
                        </h2>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isPlaylistDropdownOpen ?
                        "rotate-180" : ""}`} />
                    </button>

                    {isPlaylistDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50 overflow-hidden">
                        <div className="max-h-72 overflow-y-auto scroll-container">
                          {playlists.map((playlist) => (
                            <button
                              key={playlist}
                              onClick={() => {
                                setSelectedPlaylist(playlist);
                                setSelectedGroup('Category');
                                setIsPlaylistDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-700 ${selectedPlaylist === playlist ?
                                "text-blue-400 text-base font-semibold" : "text-gray-200"}`}
                              style={{
                                whiteSpace: 'normal',
                                wordWrap: 'break-word',
                                overflowWrap: 'anywhere',
                              }}
                            >
                              {playlist}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Group Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setIsGroupDropdownOpen(!isGroupDropdownOpen);
                        setIsPlaylistDropdownOpen(false);
                      }}
                      className="flex items-center space-x-2 group py-0.5 px-1.5 rounded-lg transition-all bg-white bg-opacity-10"
                    >
                      <div className="flex items-center space-x-2">
                        <h4 className="text-base text-gray-300 group-hover:text-blue-400 transition-colors">
                          {selectedGroup}
                        </h4>
                      </div>
                      <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform duration-200 ${isGroupDropdownOpen ?
                        "rotate-180" : ""}`} />
                    </button>

                    {isGroupDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50 overflow-hidden">
                        <div className="max-h-72 overflow-y-auto scroll-container">
                          {groups.map((group) => (
                            <button
                              key={group}
                              onClick={() => {
                                setSelectedGroup(group);
                                setIsGroupDropdownOpen(false);
                              }}
                              className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-700 ${selectedGroup === group ?
                                "text-blue-400 text-base font-semibold" : "text-gray-200"}`}
                              style={{
                                whiteSpace: 'normal',
                                wordWrap: 'break-word',
                                overflowWrap: 'anywhere',
                              }}
                            >
                              {group === 'Category' ? 'All Categories' : group}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    // Only allow adding channels if admin mode is not enabled or user is admin
                    if (!isAdminEnabled || isAdmin) {
                      setIsModalOpen(true);
                      setIsGroupDropdownOpen(false);
                      setIsPlaylistDropdownOpen(false);
                    } else {
                      setIsAdminModalOpen(true);
                    }
                  }}
                  className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>

              <ChannelList
                channels={filteredChannels}
                selectedChannel={selectedChannel}
                setSearchQuery={setSearchQuery}
                onEditChannel={handleEditChannel}
              />
            </div>

            <VideoPlayer channel={selectedChannel} syncEnabled={syncEnabled} />
          </div>

          <div className="col-span-12 lg:col-span-4">
            <Chat />
          </div>
        </div>
      </div>

      {isModalOpen && (
        <ChannelModal
          onClose={() => {
            setIsModalOpen(false);
            setEditChannel(null);
          }}
          channel={editChannel}
        />
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        syncEnabled={syncEnabled}
        onSyncChange={(enabled) => {
          setSyncEnabled(enabled);
          localStorage.setItem('syncEnabled', JSON.stringify(enabled));
        }}
      />

      <TvPlaylistModal
        isOpen={isTvPlaylistOpen}
        onClose={() => setIsTvPlaylistOpen(false)}
      />

      <AdminModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />

      <ToastContainer />
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AdminProvider>
        <AppContent />
      </AdminProvider>
    </ToastProvider>
  );
}

export default App;