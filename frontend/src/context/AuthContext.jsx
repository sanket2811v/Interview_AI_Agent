import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, userService, setAuthToken, clearAuthToken } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Initialize authentication status on application load
   * Tries to restore session via HttpOnly cookie refresh
   */
  const initializeAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await authService.refresh();
      if (res.data?.accessToken && res.data?.user) {
        setAuthToken(res.data.accessToken);
        setUser(res.data.user);
        setIsAuthenticated(true);
      }
    } catch {
      // Unauthenticated visitor on public page - expected behavior
      clearAuthToken();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeAuth();

    // Listen to automatic session expiry events from Axios response interceptor
    const handleSessionExpired = () => {
      clearAuthToken();
      setUser(null);
      setIsAuthenticated(false);
    };

    window.addEventListener('interviewai:session_expired', handleSessionExpired);
    return () => {
      window.removeEventListener('interviewai:session_expired', handleSessionExpired);
    };
  }, [initializeAuth]);

  /**
   * User registration
   */
  const register = async (formData) => {
    setError(null);
    try {
      const response = await authService.register(formData);
      return response;
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    }
  };

  /**
   * User login
   */
  const login = async ({ email, password }) => {
    setError(null);
    try {
      const response = await authService.login({ email, password });
      if (response.data?.accessToken && response.data?.user) {
        setAuthToken(response.data.accessToken);
        setUser(response.data.user);
        setIsAuthenticated(true);
      }
      return response;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  /**
   * User logout
   */
  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn('Logout API error:', err);
    } finally {
      clearAuthToken();
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  /**
   * Refresh session manually
   */
  const refreshSession = async () => {
    try {
      const res = await authService.refresh();
      if (res.data?.accessToken && res.data?.user) {
        setAuthToken(res.data.accessToken);
        setUser(res.data.user);
        setIsAuthenticated(true);
        return res.data;
      }
    } catch (err) {
      clearAuthToken();
      setUser(null);
      setIsAuthenticated(false);
      throw err;
    }
  };

  /**
   * Update profile information
   */
  const updateProfile = async (profileData) => {
    try {
      const res = await userService.updateProfile(profileData);
      // Refresh current user object with updated profile
      setUser((prev) => (prev ? { ...prev, profile: res.data?.profile } : prev));
      return res;
    } catch (err) {
      throw err;
    }
  };

  /**
   * Change password
   */
  const changePassword = async (passwordData) => {
    try {
      return await authService.changePassword(passwordData);
    } catch (err) {
      throw err;
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    refreshSession,
    updateProfile,
    changePassword,
    reloadUser: initializeAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

