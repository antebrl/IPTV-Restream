import React, { useState, useContext } from 'react';
import { X, Shield, ShieldOff } from 'lucide-react';
import { ToastContext } from '../notifications/ToastContext';
import { useAdmin } from './AdminContext';
import apiService from '../../services/ApiService';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function AdminModal({ isOpen, onClose }: AdminModalProps) {
  const [password, setPassword] = useState('');
  const { isAdmin, setIsAdmin } = useAdmin();
  const { addToast } = useContext(ToastContext);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await apiService.request<{success: boolean, token?: string}>('/auth/admin-login', 'POST', undefined, {
        password
      });
      
      if (response.success && response.token) {
        // Store JWT token in localStorage
        localStorage.setItem('admin_token', response.token);
        
        setIsAdmin(true);
        addToast({
          type: 'success',
          title: 'Admin mode enabled',
          duration: 3000,
        });
        onClose();
      } else {
        addToast({
          type: 'error',
          title: 'Invalid password',
          duration: 3000,
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Authentication failed',
        message: 'Please try again',
        duration: 3000,
      });
    }
  };

  const handleLogout = () => {
    // Remove JWT token from localStorage
    localStorage.removeItem('admin_token');
    
    setIsAdmin(false);
    addToast({
      type: 'info',
      title: 'Admin mode disabled',
      duration: 3000,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            {isAdmin ? (
              <Shield className="w-5 h-5 text-green-500" />
            ) : (
              <ShieldOff className="w-5 h-5 text-blue-500" />
            )}
            <h2 className="text-xl font-semibold">Admin Mode</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {isAdmin ? (
            <div className="space-y-4">
              <p className="text-green-500">You are currently in admin mode.</p>
              <button
                onClick={handleLogout}
                className="w-full p-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout from Admin Mode
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="adminPassword" className="block text-sm font-medium mb-1">
                  Admin Password
                </label>
                <input
                  type="password"
                  id="adminPassword"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter admin password"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full p-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminModal;