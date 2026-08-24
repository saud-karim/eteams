import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';
import { useSocket } from './SocketContext.jsx';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { user, logout, setUser } = useAuth();
  const socket = useSocket();
  const [channels, setChannels] = useState([]);
  const [users, setUsers] = useState([]);
  const [favoriteUserIds, setFavoriteUserIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      api.channels.mine(),
      api.users.list(),
      api.users.getFavorites().catch(() => ({ favorites: [] }))
    ]).then(([channelsData, usersData, favoritesData]) => {
      setChannels(channelsData.channels || []);
      setUsers(usersData.users || []);
      setFavoriteUserIds(favoritesData.favorites || []);
      setLoading(false);
    }).catch(console.error);
  }, [user?.id]);

  const toggleFavoriteUser = async (userId) => {
    const isFavorite = favoriteUserIds.includes(userId);
    setFavoriteUserIds(prev => isFavorite ? prev.filter(id => id !== userId) : [...prev, userId]);
    try {
      if (isFavorite) {
        await api.users.removeFavorite(userId);
      } else {
        await api.users.addFavorite(userId);
      }
    } catch (error) {
      setFavoriteUserIds(prev => isFavorite ? [...prev, userId] : prev.filter(id => id !== userId));
      console.error('Failed to toggle favorite:', error);
    }
  };

  useEffect(() => {
    if (!socket) return;

    const handlePresence = ({ userId, presence }) => {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, presence } : u));
      if (user && user.id === userId) {
        setUser(prev => ({ ...prev, presence }));
      }
    };

    const handleForceLogout = (data) => {
      alert(data.message || 'You have been logged out by an administrator.');
      logout();
    };

    socket.on('presence:update', handlePresence);
    socket.on('force_logout', handleForceLogout);

    return () => {
      socket.off('presence:update', handlePresence);
      socket.off('force_logout', handleForceLogout);
    };
  }, [socket]);

  return (
    <WorkspaceContext.Provider value={{ channels, users, favoriteUserIds, toggleFavoriteUser, setChannels, setUsers, loading }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);
