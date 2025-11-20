import { useState, useEffect, useMemo, useContext } from 'react';
import { Search, Plus, Settings, Users as UsersIcon, Radio, Tv2, ChevronDown, Shield, LogOut } from 'lucide-react';
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
import LoginModal from './components/auth/LoginModal';
import UserManagement from './components/admin/UserManagement';

interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTvPlaylistOpen, setIsTvPlaylistOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
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

  const { isAdmin, setIsAdmin, channelSelectRequiresAdmin, setChannelSelectRequiresAdmin } = useAdmin();
  const { addToast } = useContext(ToastContext);

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('user');

      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          setCurrentUser(user);
          setIsAdmin(user.role === 'admin');
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user');
        }
      }
      setIsCheckingAuth(false);
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (user: User, token: string) => {
    setCurrentUser(user);
    setIsAdmin(user.role === 'admin');
    setIsAuthenticated(true);
    addToast({
      type: 'success',
      title: 'Welcome!',
      message: `Logged in as ${user.username}`,
      duration: 3000,
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    setIsAdmin(false);
    setIsAuthenticated(false);
    socketService.disconnect();
    addToast({
      type: 'info',
      title: 'Logged out',
      duration: 3000,
    });
  };

  // Función para manejar la selección de canal localmente
  const handleChannelSelect = (channel: Channel) => {
    setSelectedChannel(channel);
  };

  // Get unique playlists from channels - ALWAYS call hooks in the same order
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

  // Load data and setup socket connections - ALWAYS call this hook
  useEffect(() => {
    // Only load data if authenticated
    if (!isAuthenticated) return;

    // Check if admin mode is enabled on the server
    apiService
      .request<{ authRequired: boolean; channelSelectionRequiresAdmin: boolean }>('/auth/status', 'GET')
      .then((data) => {
        setChannelSelectRequiresAdmin(data.channelSelectionRequiresAdmin);
      })
      .catch((error) => console.error('Error checking auth status:', error));

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
      setChannels((prevChannels) => {
        const updatedChannels = prevChannels.filter((channel) => channel.id !== deletedChannel);
        
        // Si el canal eliminado es el que está seleccionado, cambiar al primero disponible
        if (selectedChannel?.id === deletedChannel && updatedChannels.length > 0) {
          setSelectedChannel(updatedChannels[0]);
        }
        
        return updatedChannels;
      });
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
    // Eliminado: channel-selected listener (selección independiente por usuario)
    socketService.subscribeToEvent('channel-updated', channelUpdatedListener);
    socketService.subscribeToEvent('channel-deleted', channelDeletedListener);
    socketService.subscribeToEvent('app-error', errorListener);

    socketService.connect();

    return () => {
      socketService.unsubscribeFromEvent('channel-added', channelAddedListener);
      // Eliminado: channel-selected unsubscribe (selección independiente por usuario)
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
  }, [isAuthenticated]);

  // Show loading state while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show login modal if not authenticated
  if (!isAuthenticated) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  const handleEditChannel = (channel: Channel) => {
    // Only admins can edit channels
    if (isAdmin) {
      setEditChannel(channel);
      setIsModalOpen(true);
    } else {
      addToast({
        type: 'error',
        title: 'Permission denied',
        message: 'Only administrators can edit channels',
        duration: 3000,
      });
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
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400 mr-2">{currentUser?.username}</span>
            {isAdmin && (
              <button
                onClick={() => setIsUserManagementOpen(true)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                title="User Management"
              >
                <UsersIcon className="w-6 h-6 text-yellow-500" />
              </button>
            )}
            <button
              onClick={() => setIsTvPlaylistOpen(true)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="TV Playlist"
            >
              <Tv2 className="w-6 h-6 text-blue-500" />
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="w-6 h-6 text-blue-500" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-red-600 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-6 h-6 text-red-500" />
            </button>
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

                {isAdmin && (
                  <button
                    onClick={() => {
                      setIsModalOpen(true);
                      setIsGroupDropdownOpen(false);
                      setIsPlaylistDropdownOpen(false);
                    }}
                    className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>

              <ChannelList
                channels={filteredChannels}
                selectedChannel={selectedChannel}
                setSearchQuery={setSearchQuery}
                onEditChannel={handleEditChannel}
                onChannelSelectCheckPermission={() => {
                  if (channelSelectRequiresAdmin && !isAdmin) {
                    addToast({
                      type: 'error',
                      title: 'Permission denied',
                      message: 'Only administrators can select channels',
                      duration: 3000,
                    });
                    return false;
                  }
                  return true;
                }}
                onChannelSelect={handleChannelSelect}
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

      {currentUser && (
        <UserManagement
          isOpen={isUserManagementOpen}
          onClose={() => setIsUserManagementOpen(false)}
          currentUser={currentUser}
        />
      )}

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