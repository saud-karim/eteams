import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from './AuthContext.jsx';
import { useSocket } from './SocketContext.jsx';

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const [channels, setChannels] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.channels.mine(),
      api.users.list()
    ]).then(([channelsData, usersData]) => {
      setChannels(channelsData.channels || []);
      setUsers(usersData.users || []);
      setLoading(false);
    }).catch(console.error);
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    const handlePresence = ({ userId, presence }) => {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, presence } : u));
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
    <WorkspaceContext.Provider value={{ channels, users, setChannels, setUsers, loading }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);
