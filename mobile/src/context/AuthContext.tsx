import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken as saveToken, clearToken } from '../api/client';

const AuthContext = createContext<any>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await getToken();
        if (!token) {
          setLoading(false);
          return;
        }
        const { user } = await api.auth.me();
        if (user.presence === 'offline' || !user.presence) { user.presence = 'online'; }
        setUser(user);
      } catch (err) {
        console.error('Auth check failed', err);
        await clearToken();
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (username: string, password: string) => {
    const { user, accessToken, refreshToken } = await api.auth.login(username, password);
    await saveToken(accessToken);
    if (user.presence === 'offline' || !user.presence) { user.presence = 'online'; }
    setUser(user);
  };

  const logout = async () => {
    try { await api.auth.logout(); } catch {}
    await clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
