import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { jwtDecode } from 'jwt-decode';
import socketService from '../../services/SocketService';

interface AdminContextType {
  isAdmin: boolean;
  setIsAdmin: (value: boolean) => void;
  isAdminEnabled: boolean;
  setIsAdminEnabled: (value: boolean) => void;
  adminToken: string | null;
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  setIsAdmin: () => {},
  isAdminEnabled: false,
  setIsAdminEnabled: () => {},
  adminToken: null,
});

export const useAdmin = () => useContext(AdminContext);

interface AdminProviderProps {
  children: ReactNode;
}

// Helper function to check if token is valid
const isTokenValid = (token: string): boolean => {
  try {
    const decoded: any = jwtDecode(token);
    // Check if token is expired
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
};

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminEnabled, setIsAdminEnabled] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  // Effect to handle token changes
  useEffect(() => {
    // When admin status changes, update socket connection
    if (isAdmin) {
      // Small delay to ensure token is saved before reconnecting
      setTimeout(() => {
        socketService.updateAuthToken();
      }, 100);
    } else {
      // Reset token and reconnect
      localStorage.removeItem('admin_token');
      setAdminToken(null);
      socketService.updateAuthToken();
    }
  }, [isAdmin]);

  // Initial setup - check for existing token
  useEffect(() => {
    // Check if there's a token in localStorage on component mount
    const token = localStorage.getItem('admin_token');

    if (token && isTokenValid(token)) {
      setIsAdmin(true);
      setAdminToken(token);
    } else if (token) {
      // Clear invalid token
      localStorage.removeItem('admin_token');
    }
  }, []);

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        setIsAdmin,
        isAdminEnabled,
        setIsAdminEnabled,
        adminToken,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};