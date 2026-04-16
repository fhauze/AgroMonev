import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { db } from "@/utils/db";
import CryptoJS from 'crypto-js';

const AuthContext = createContext();
const SECRET_KEY = import.meta.env.VITE_CRYPTO_KEY || "Pr08ind0";

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

  const encryptPassword = (password) => {
    return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
  };

  const decryptPassword = (hashedPassword) => {
    const bytes = CryptoJS.AES.decrypt(hashedPassword, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  };

  useEffect(() => {
    checkInitialState();
  }, []);

  const checkInitialState = async () => {
    try {
      setIsLoadingAuth(true);
      const localToken = localStorage.getItem('access_token');

      if (!db.isOpen()) await db.open();
      const localUsers = await db.users.toArray();
      const storedUser = localUsers.length > 0 ? localUsers[0] : null;

      if (localToken && storedUser) {
        setUser(storedUser);
        setIsAuthenticated(true);
      }
      
      // if (localToken && localUser) {
      //   setUser(JSON.parse(localUser));
      //   setIsAuthenticated(true);
      // }

      if (navigator.onLine && localToken) {
        try {
          const response = await axios.get(`${getBaseUrl()}/api/auth/me`, {
            headers: { Authorization: `Bearer ${localToken}` }
          });

          const freshUser = response.data;
          setUser(freshUser);
          await db.users.put({ ...freshUser, sync_status: 'synced' });
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
    setIsLoadingAuth(true);
    
    try{

      const response = await axios.post(`${getBaseUrl()}/api/auth/login`, {
        email,
        password
      });

      const { access_token} = response.data;
      const userResponse = await axios.get(`${getBaseUrl()}/api/auth/me`, {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      const userDataRaw = userResponse.data;
      const userData = {
        ...userDataRaw,
        verification_status: 'verified'
      }

      localStorage.setItem('access_token', access_token);
      setToken(access_token);

      if (!db.isOpen()) await db.open();
      const encryptedPW = encryptPassword(password);
      try{
      await db.users.put({
        id: userData.id || userData.user_id,
        ...userData,
        password:encryptedPW,
        sync_status: 'synced',
        last_login: new Date().toISOString(),
        access_token: access_token,
        verification_status: 'verified'
      });
      }catch(err){
        console.log(err)
      }
      setUser(userData);
      setIsAuthenticated(true);
      return { success: true };
    } catch (error) {
      console.log(error, "Warning error")
      try {
        if (!db.isOpen()) await db.open();
        const localUser = await db.users.where("email").equals(email).first();
        
        if (localUser && localUser.password) {
          const decryptedPW = decryptPassword(localUser.password);
          
          if (decryptedPW === password) {
            localStorage.setItem('access_token', localUser.access_token);
            localStorage.setItem('user_data', JSON.stringify(localUser));
            
            setToken(localUser.access_token);
            setUser(localUser);
            setIsAuthenticated(true);
            
            return { success: true};
          }
        }
      } catch (dexieErr) {
        console.error("Gagal membaca database lokal", dexieErr);
      }
      
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login gagal. Periksa koneksi atau data lokal Anda.' 
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