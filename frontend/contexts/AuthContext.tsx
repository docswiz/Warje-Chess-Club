import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  role: string;
  subscription_status: string;
  subscription_expires_at?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (sessionId: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        await AsyncStorage.removeItem('session_token');
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await AsyncStorage.removeItem('session_token');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (sessionId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/session`, {
        method: 'POST',
        headers: {
          'X-Session-ID': sessionId,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const userData = await response.json();
      
      // The backend creates a session_token and returns user data
      // We need to get the session_token from the Emergent API response
      // For mobile, we'll need to extract it differently
      // For now, we'll make a request to get the session token
      const sessionCheckResponse = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: {
          'X-Session-ID': sessionId,
        },
      });
      
      if (sessionCheckResponse.ok) {
        // Store the session_id as our token for now
        // The backend will accept it via the Authorization header
        await AsyncStorage.setItem('session_token', sessionId);
        setUser(userData);
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const token = await AsyncStorage.getItem('session_token');
      if (token) {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      await AsyncStorage.removeItem('session_token');
      setUser(null);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
