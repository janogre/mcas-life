import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authApi } from '../lib/api';
import type { User } from '../types/shared';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check for existing token on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const token = localStorage.getItem('authToken');
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!token && !refreshToken) {
      // No tokens at all - just mark as not authenticated
      dispatch({ type: 'LOGOUT' });
      return;
    }

    try {
      dispatch({ type: 'AUTH_START' });
      
      // Try to get profile with current token
      const response = await authApi.getProfile();
      dispatch({ type: 'AUTH_SUCCESS', payload: response.data });
    } catch (error) {
      // Token is invalid/expired, but we have automatic refresh in API interceptor
      // so if refresh token is valid, it should work automatically
      // If both tokens are invalid, API interceptor will redirect to login
      
      if (refreshToken) {
        try {
          // Try one more time - the API interceptor should handle refresh
          const response = await authApi.getProfile();
          dispatch({ type: 'AUTH_SUCCESS', payload: response.data });
        } catch (secondError) {
          // Both tokens are invalid
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        localStorage.removeItem('authToken');
        dispatch({ type: 'LOGOUT' });
      }
    }
  };

  const login = async (email: string, password: string) => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await authApi.login({ email, password });
      
      console.log('🎯 Full response from authApi.login:', response);
      console.log('🔑 Tokens:', response.data?.tokens);
      console.log('👤 User:', response.data?.user);
      
      if (!response.data?.tokens || !response.data?.user) {
        throw new Error('Invalid response structure from server');
      }
      
      localStorage.setItem('authToken', response.data.tokens.access_token);
      localStorage.setItem('refreshToken', response.data.tokens.refresh_token);
      
      dispatch({ type: 'AUTH_SUCCESS', payload: response.data.user });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      dispatch({ type: 'AUTH_START' });
      const response = await authApi.register(userData);
      
      if (!response.data?.tokens || !response.data?.user) {
        throw new Error('Invalid response structure from server');
      }
      
      localStorage.setItem('authToken', response.data.tokens.access_token);
      localStorage.setItem('refreshToken', response.data.tokens.refresh_token);
      
      dispatch({ type: 'AUTH_SUCCESS', payload: response.data.user });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      dispatch({ type: 'LOGOUT' });
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}