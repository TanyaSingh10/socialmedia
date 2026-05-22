import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform } from 'react-native';

// Universal API IP helper: on web use localhost, on mobile we default to local host or localhost
export const API_URL = 'http://localhost:5001';

interface User {
  _id: string;
  username: string;
  email: string;
  bio: string;
  profilePic: string;
  followers?: string[];
  following?: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateProfileState: (updatedUser: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Simple memory fallback for mobile if localStorage doesn't exist
let memoryStorage: Record<string, string> = {};

const getStoredItem = async (key: string): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return memoryStorage[key] || null;
};

const setStoredItem = async (key: string, value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    memoryStorage[key] = value;
  }
};

const removeStoredItem = async (key: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
  } else {
    delete memoryStorage[key];
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const storedToken = await getStoredItem('token');
        const storedUser = await getStoredItem('user');
        
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error('Failed to load local auth data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadAuthData();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, message: data.message || 'Login failed' };
      }

      const { token: userToken, ...userDetails } = data;
      setToken(userToken);
      setUser(userDetails);

      await setStoredItem('token', userToken);
      await setStoredItem('user', JSON.stringify(userDetails));

      return { success: true };
    } catch (err: any) {
      console.error('Login error:', err);
      return { success: false, message: 'Network connection failed' };
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, message: data.message || 'Registration failed' };
      }

      const { token: userToken, ...userDetails } = data;
      setToken(userToken);
      setUser(userDetails);

      await setStoredItem('token', userToken);
      await setStoredItem('user', JSON.stringify(userDetails));

      return { success: true };
    } catch (err: any) {
      console.error('Registration error:', err);
      return { success: false, message: 'Network connection failed' };
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await removeStoredItem('token');
    await removeStoredItem('user');
  };

  const updateProfileState = async (updatedUser: User) => {
    setUser(updatedUser);
    await setStoredItem('user', JSON.stringify(updatedUser));
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const userDetails = await response.json();
        setUser(userDetails);
        await setStoredItem('user', JSON.stringify(userDetails));
      }
    } catch (err) {
      console.warn('Failed to refresh user credentials:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        logout,
        updateProfileState,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
