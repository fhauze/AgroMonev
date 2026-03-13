import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(
    () => localStorage.getItem('access_token')
  );
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  const getBaseUrl = () => {
    let url = import.meta.env.VITE_BASE44_API_URL || '';
    return url.replace(/\/+$/, "").replace(/\/api$/, "");
  };

  useEffect(() => {
    checkInitialState();
  }, []);

  const checkInitialState = async () => {
    try {
      setIsLoadingAuth(true);
      const localToken = localStorage.getItem('access_token');
      const localUser = localStorage.getItem('user_data');
      
      if (localToken && localUser) {
        setUser(JSON.parse(localUser));
        setIsAuthenticated(true);
      }

      if (navigator.onLine && localToken) {
        try {
          const response = await axios.get(`${getBaseUrl()}/api/auth/me`, {
            headers: { Authorization: `Bearer ${localToken}` }
          });

          const freshUser = response.data;
          setUser(freshUser);
          localStorage.setItem('user_data', JSON.stringify(freshUser));
        } catch (e) {
          if (e.response?.status === 401) {
            logout(false);
          }
        }
      }
    } catch (error) {
      console.error("Auth check error:", error);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const login = async (email, password) => {
    try {
      setIsLoadingAuth(true);
      const response = await axios.post(`${getBaseUrl()}/api/auth/login`, {
        email,
        password
      });

      const { access_token, user: userData } = response.data;

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user_data', JSON.stringify(userData));

      setUser(userData);
      setIsAuthenticated(true);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login gagal. Cek koneksi Anda.' 
      };
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = (shouldRedirect = true) => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      token, user, isAuthenticated, isLoadingAuth, authError, 
      login, logout, checkAppState: checkInitialState 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};