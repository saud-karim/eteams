import { createContext, useContext, useEffect, useState } from 'react';
import { api, setToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.auth.refresh()
      .then(({ accessToken }) => {
        setToken(accessToken);
        return api.auth.me();
      })
      .then(({ user }) => {
        if (user.presence === 'offline' || !user.presence) { user.presence = 'online'; }
        setUser(user);
      })
      .catch(() => { 
        setToken(null);
        localStorage.removeItem('accessToken'); // Clean up any legacy token
      })
      .finally(() => setTimeout(() => setLoading(false), 3000));
  }, []);

  const login = async (username, password) => {
    const { user, accessToken } = await api.auth.login(username, password);
    setToken(accessToken);
    // refreshToken is delivered ONLY via HttpOnly cookie — never stored in JS
    if (user.presence === 'offline' || !user.presence) { user.presence = 'online'; }
    setUser(user);
  };

  const logout = async () => {
    try { await api.auth.logout(); } catch {}
    setToken(null);
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
