import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';

const WorkspaceContext = createContext<any>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const socket = useSocket();
  const [channels, setChannels] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWorkspaceData = async () => {
    if (!user) return;
    try {
      const [channelsData, usersData] = await Promise.all([
        api.channels.mine(),
        api.users.list()
      ]);
      setChannels(channelsData.channels || []);
      setUsers(usersData.users || []);
    } catch (error) {
      console.error(error);
    }
  };

  const refreshWorkspace = async () => {
    setRefreshing(true);
    await fetchWorkspaceData();
    setRefreshing(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchWorkspaceData().finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    const handlePresence = ({ userId, presence }: any) => {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, presence } : u));
    };

    const handleForceLogout = (data: any) => {
      alert(data.message || 'You have been logged out by an administrator.');
      logout();
    };

    const handleNewMessage = (msg: any) => {
      // Optimistically update the channel or re-fetch channels to update unread counts
      api.channels.mine().then(data => {
        setChannels(data.channels || []);
      }).catch(console.error);
    };

    socket.on('presence:update', handlePresence);
    socket.on('force_logout', handleForceLogout);
    socket.on('message:new', handleNewMessage);

    return () => {
      socket.off('presence:update', handlePresence);
      socket.off('force_logout', handleForceLogout);
      socket.off('message:new', handleNewMessage);
    };
  }, [socket]);

  return (
    <WorkspaceContext.Provider value={{ channels, users, setChannels, setUsers, loading, refreshWorkspace, refreshing }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);
