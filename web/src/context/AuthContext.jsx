import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) { setTimeout(() => setLoading(false), 3000); return; }
    api.auth.me()
      .then(({ user }) => {
        if (user.presence === 'offline' || !user.presence) { user.presence = 'online'; }
        setUser(user);
      })
      .catch(() => { localStorage.clear(); })
      .finally(() => setTimeout(() => setLoading(false), 3000));
  }, []);

  const login = async (username, password) => {
    const { user, accessToken, refreshToken } = await api.auth.login(username, password);
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    if (user.presence === 'offline' || !user.presence) { user.presence = 'online'; }
    setUser(user);
  };

  const logout = async () => {
    try { await api.auth.logout(); } catch {}
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
