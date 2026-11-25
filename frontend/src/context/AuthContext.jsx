import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, getStoredToken, setStoredToken } from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then((res) => setUser(res.user))
      .catch(() => {
        setStoredToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const res = await api.login(username, password);
    setStoredToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const register = async (payload) => {
    const res = await api.register(payload);
    setStoredToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const loginDemo = async () => {
    const res = await api.demoLogin();
    setStoredToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
