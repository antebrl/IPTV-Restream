import { X, Copy, Tv2 } from 'lucide-react';
import { useContext } from 'react';
import { ToastContext } from './notifications/ToastContext';

interface TvPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

function TvPlaylistModal({ isOpen, onClose, isAdmin = false }: TvPlaylistModalProps) {
  const { addToast } = useContext(ToastContext);
  const playlistUrl = `${import.meta.env.VITE_BACKEND_URL || window.location.origin}/api/channels/playlist`;

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(playlistUrl);
      addToast({
        type: 'success',
        title: 'Playlist URL copied to clipboard',
        duration: 2500,
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to copy URL',
        message: 'Please copy the URL manually',
        duration: 2500,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <Tv2 className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-semibold">TV Playlist</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={playlistUrl}
              readOnly
              className="flex-1 bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleCopy}
              className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-sm text-gray-400">
            Use this playlist in any other IPTV player. If you have problems, check if the base-url in the playlist is correctly pointing to the backend. If not, please set BACKEND_URL in the docker-compose.yml
          </p>

          {isAdmin && (
            <div className="mt-6 border-t border-gray-700 pt-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-medium">Admin Information</h3>
              </div>
              
              <div className="bg-gray-900 rounded-lg p-4">
                <p className="text-sm text-gray-300">
                  This playlist contains all stream URLs. You can share a link to the 
                  application with other users, and they will be able to watch the streams 
                  together with you.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TvPlaylistModal;