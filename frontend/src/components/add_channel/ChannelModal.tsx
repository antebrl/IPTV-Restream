import React, { useState, useEffect, useContext } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import socketService from '../../services/SocketService';
import { CustomHeader, Channel, ChannelMode } from '../../types';
import CustomHeaderInput from './CustomHeaderInput';
import { ToastContext } from '../notifications/ToastContext';
import { ModeTooltipContent, Tooltip } from '../Tooltip';

interface ChannelModalProps {
  onClose: () => void;
  channel?: Channel | null;
}

function ChannelModal({ onClose, channel }: ChannelModalProps) {
  const [type, setType] = useState<'channel' | 'playlist'>('playlist');
  const [isEditMode, setIsEditMode] = useState(false);
  const [inputMethod, setInputMethod] = useState<'url' | 'text'>('url');

  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [avatar, setAvatar] = useState('');
  const [mode, setMode] = useState<ChannelMode>('proxy');
  const [headers, setHeaders] = useState<CustomHeader[]>([]);

  const [playlistName, setPlaylistName] = useState('');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [playlistText, setPlaylistText] = useState('');
  const [playlistUpdate, setPlaylistUpdate] = useState(false);

  const { addToast } = useContext(ToastContext);

  useEffect(() => {
    if (channel) {
      setName(channel.name);
      setUrl(channel.url);
      setAvatar(channel.avatar);
      setMode(channel.mode);
      setHeaders(channel.headers);
      setPlaylistName(channel.playlistName);
      setPlaylistUpdate(channel.playlistUpdate);
      setIsEditMode(true);
      setType('channel');

      if(!channel.playlist) {
        setInputMethod('url');
        setPlaylistUrl('');
        setPlaylistText('');
      } else if(channel.playlist.startsWith("http")) {
        setInputMethod('url');
        setPlaylistUrl(channel.playlist);
        setPlaylistText('');
      } else {
        setInputMethod('text');
        setPlaylistUrl('');
        setPlaylistText(channel.playlist);
      }

    } else {
      setName('');
      setUrl('');
      setAvatar('');
      setMode('proxy');
      setHeaders([]);
      setPlaylistName('');
      setPlaylistUrl('');
      setPlaylistText('');
      setPlaylistUpdate(false);
      setIsEditMode(false);
      setType('playlist');
      setInputMethod('url');
    }
  }, [channel]);

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };
  
  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };
  
  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    setHeaders(newHeaders);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditMode && channel) {
      handleUpdate(channel.id);
      return;
    }

    if (type === 'channel') {
      if (!name.trim() || !url.trim()) return;
      socketService.addChannel(
        name.trim(),
        url.trim(),
        avatar.trim() || 'https://via.placeholder.com/64',
        mode,
        JSON.stringify(headers),
      );
    } else if (type === 'playlist') {
      if (inputMethod === 'url' && !playlistUrl.trim()) return;
      if (inputMethod === 'text' && !playlistText.trim()) return;
      
      socketService.addPlaylist(
        inputMethod === 'url' ? playlistUrl.trim() : playlistText.trim(),
        playlistName.trim(),
        mode,
        playlistUpdate,
        JSON.stringify(headers),
      );
    }

    addToast({
      type: 'success',
      title: `${type} added`,
      duration: 3000,
    });

    onClose();
  };

  const handleUpdate = (id: number) => {
    if (type === 'channel') {
      socketService.updateChannel(id, {
        name: name.trim(),
        url: url.trim(),
        avatar: avatar.trim() || 'https://via.placeholder.com/64',
        mode: mode,
        headers: headers,
      });
    } else if (type === 'playlist') {
      const newPlaylist = inputMethod === 'url' ? playlistUrl.trim() : playlistText.trim();
      socketService.updatePlaylist(channel!.playlist, {
        playlist: newPlaylist,
        playlistName: playlistName.trim(),
        playlistUpdate: playlistUpdate,
        mode: mode,
        headers: headers,
      });
    }

    addToast({
      type: 'success',
      title: `${type} updated`,
      duration: 3000,
    });

    onClose();
  };

  const handleDelete = () => {
    if (channel) {
      if (type === 'channel') {
        socketService.deleteChannel(channel.id);
      } else if (type === 'playlist') {
        socketService.deletePlaylist(channel.playlist);
      }
    }
    addToast({
      type: 'error',
      title: `${type} deleted`,
      duration: 3000,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold">
            {isEditMode ? (type === 'channel' ? 'Edit Channel' : 'Edit Playlist') : type === 'channel' ? 'Add New Channel' : 'Add New Playlist'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {(!isEditMode || channel?.playlist) && (
          <div className="p-4 pb-0">
            <div className="flex space-x-4 justify-center">
              <button
                onClick={() => setType('channel')}
                className={`px-4 py-2 rounded-lg border-2 ${type === 'channel' ? 'border-blue-600' : 'border-transparent'} hover:border-blue-600 transition-colors`}
              >
                Channel
              </button>
              <button
                onClick={() => setType('playlist')}
                className={`px-4 py-2 rounded-lg border-2 ${type === 'playlist' ? 'border-blue-600' : 'border-transparent'} hover:border-blue-600 transition-colors`}
              >
                Playlist
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {type === 'channel' && (
            <>
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                  Channel Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter channel name"
                  required
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label htmlFor="url" className="block text-sm font-medium">
                    Stream URL
                  </label>
                </div>
                <input
                  type="url"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter stream URL"
                  required
                />
              </div>
              <div>
                <label htmlFor="avatar" className="block text-sm font-medium mb-1">
                  Avatar URL
                </label>
                <input
                  type="url"
                  id="avatar"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter channel avatar URL"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  <span className="inline-flex items-center gap-2">
                    Channel Mode
                    <Tooltip content={<ModeTooltipContent />} />
                  </span>
                </label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="mode"
                      value="direct"
                      checked={mode === 'direct'}
                      className="form-radio text-blue-600"
                      onChange={() => setMode('direct')}
                    />
                    <span className="ml-2">Direct</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="mode"
                      value="proxy"
                      className="form-radio text-blue-600"
                      checked={mode === 'proxy'}
                      onChange={() => setMode('proxy')}
                    />
                    <span className="ml-2">Proxy</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="mode"
                      value="restream"
                      className="form-radio text-blue-600"
                      checked={mode === 'restream'}
                      onChange={() => setMode('restream')}
                    />
                    <span className="ml-2">Restream</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {type === 'playlist' && (
            <>
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-1">
                  Playlist Name
                </label>
                <input
                  type="text"
                  id="playlistName"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter playlist name"
                  required
                />
              </div>

              {inputMethod === 'url' ? (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="playlistUrl" className="block text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => setInputMethod('url')}
                        className="font-bold text-white"
                      >
                        M3U Playlist URL
                      </button>
                      <span className="mx-2 text-gray-400">/</span>
                      <button
                        type="button"
                        onClick={() => setInputMethod('text')}
                        className="text-gray-400 hover:text-gray-200"
                      >
                        M3U Text
                      </button>
                    </label>
                  </div>
                  <input
                    type="url"
                    id="playlistUrl"
                    value={playlistUrl}
                    onChange={(e) => setPlaylistUrl(e.target.value)}
                    className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter M3U playlist URL"
                    required={inputMethod === 'url'}
                  />
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="playlistText" className="block text-sm font-medium">
                      <button
                        type="button"
                        onClick={() => setInputMethod('url')}
                        className="text-gray-400 hover:text-gray-200"
                      >
                        M3U Playlist URL
                      </button>
                      <span className="mx-2 text-gray-400">/</span>
                      <button
                        type="button"
                        onClick={() => setInputMethod('text')}
                        className="font-bold text-white"
                      >
                        M3U Text
                      </button>
                    </label>
                  </div>
                  <textarea
                    id="playlistText"
                    value={playlistText}
                    onChange={(e) => setPlaylistText(e.target.value)}
                    className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px] scroll-container overflow-y-auto"
                    placeholder="#EXTM3U..."
                    required={inputMethod === 'text'}
                    style={{ resize: 'none' }}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">
                  <span className="inline-flex items-center gap-2">
                    Channel Mode
                    <Tooltip content={<ModeTooltipContent />} />
                  </span>
                </label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="mode"
                      value="direct"
                      checked={mode === 'direct'}
                      className="form-radio text-blue-600"
                      onChange={() => setMode('direct')}
                    />
                    <span className="ml-2">Direct</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="mode"
                      value="proxy"
                      className="form-radio text-blue-600"
                      checked={mode === 'proxy'}
                      onChange={() => setMode('proxy')}
                    />
                    <span className="ml-2">Proxy</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="mode"
                      value="restream"
                      className="form-radio text-blue-600"
                      checked={mode === 'restream'}
                      onChange={() => setMode('restream')}
                    />
                    <span className="ml-2">Restream</span>
                  </label>
                </div>
              </div>

              {/* Playlist auto-update toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium">Playlist Auto Update</label>
                  <p className="text-sm text-gray-400">Automatically update playlist once a day</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={playlistUpdate}
                    onChange={(e) => setPlaylistUpdate(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </div>
            </>
          )}

          {mode !== 'direct' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">
                  Custom Headers
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={addHeader}
                    className="flex items-center space-x-1 text-sm text-blue-400 hover:text-blue-300"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Header</span>
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {headers && headers.map((header, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <CustomHeaderInput
                      header={header}
                      onKeyChange={(value) => updateHeader(index, 'key', value)}
                      onValueChange={(value) => updateHeader(index, 'value', value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeHeader(index)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            {isEditMode && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {isEditMode ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ChannelModal;