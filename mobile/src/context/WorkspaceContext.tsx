import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { api } from '../api/client';
import { useAuth } from './AuthContext';
import { getSocket } from '../api/socketManager';
import { Audio } from 'expo-av';

const WorkspaceContext = createContext<any>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [channels, setChannels] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [favoriteUserIds, setFavoriteUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const listenersAttached = useRef(false);
  const notificationSoundRef = useRef<any>(null);
  const userRef = useRef<any>(null);
  userRef.current = user;

  useEffect(() => {
    let isMounted = true;
    const loadSound = async () => {
      if (Platform.OS === 'web') return; // Avoid expo-av bugs on web
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg' }
        );
        if (isMounted) {
          notificationSoundRef.current = sound;
        }
      } catch (e) {
        console.log('Error loading sound', e);
      }
    };
    loadSound();
    return () => {
      isMounted = false;
      if (notificationSoundRef.current) {
        notificationSoundRef.current.unloadAsync().catch(() => { });
      }
    };
  }, []);

  const fetchWorkspaceData = async () => {
    if (!userRef.current) return;
    try {
      const [channelsData, usersData, favoritesData] = await Promise.all([
        api.channels.mine(),
        api.users.list(),
        api.users.getFavorites().catch(() => ({ favorites: [] }))
      ]);
      setChannels(channelsData.channels || []);
      setUsers(usersData.users || []);
      setFavoriteUserIds(favoritesData.favorites || []);
    } catch (error) {
      console.error(error);
    }
  };

  const refreshWorkspace = async () => {
    setRefreshing(true);
    await fetchWorkspaceData();
    setRefreshing(false);
  };

  const toggleFavoriteUser = async (userId: string) => {
    const isFavorite = favoriteUserIds.includes(userId);
    // Optimistic UI update
    setFavoriteUserIds(prev => isFavorite ? prev.filter(id => id !== userId) : [...prev, userId]);
    try {
      if (isFavorite) {
        await api.users.removeFavorite(userId);
      } else {
        await api.users.addFavorite(userId);
      }
    } catch (error) {
      // Revert on failure
      setFavoriteUserIds(prev => isFavorite ? [...prev, userId] : prev.filter(id => id !== userId));
      console.error('Failed to toggle favorite:', error);
    }
  };

  // Fetch data once when user logs in
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    fetchWorkspaceData().finally(() => setLoading(false));
  }, [user?.id]);

  // Attach socket listeners once - poll for socket readiness
  useEffect(() => {
    if (!user?.id || listenersAttached.current) return;

    const attachListeners = () => {
      const socket = getSocket();
      if (!socket?.connected) return false;

      const handlePresence = ({ userId, presence }: any) => {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, presence } : u));
      };

      const handleForceLogout = (data: any) => {
        alert(data.message || 'You have been logged out by an administrator.');
        logout();
      };

      const playNotificationSound = async () => {
        try {
          if (Platform.OS === 'web') {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(2000, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.2);
          } else {
            if (notificationSoundRef.current) {
              await notificationSoundRef.current.replayAsync();
            }
          }
        } catch (error) {
          console.log('Error playing sound', error);
        }
      };

      const handleNewMessage = (msg: any) => {
        const isFromMe = msg.user_id === userRef.current?.id;
        if (!isFromMe) {
          playNotificationSound();
        }

        setChannels(prev => prev.map(channel => {
          if (channel.id === msg.channel_id) {
            return {
              ...channel,
              unread_count: isFromMe ? channel.unread_count : (channel.unread_count || 0) + 1,
              latest_message: msg
            };
          }
          return channel;
        }));
      };

      socket.on('presence:update', handlePresence);
      socket.on('force_logout', handleForceLogout);
      socket.on('message:new', handleNewMessage);

      listenersAttached.current = true;
      console.log('[workspace] socket listeners attached');
      return true;
    };

    // Try immediately, then retry until connected
    if (!attachListeners()) {
      const interval = setInterval(() => {
        if (attachListeners()) {
          clearInterval(interval);
        }
      }, 500);

      return () => clearInterval(interval);
    }
  }, [user?.id]);

  // Reset listeners flag on logout
  useEffect(() => {
    if (!user?.id) {
      listenersAttached.current = false;
    }
  }, [user?.id]);

  return (
    <WorkspaceContext.Provider value={{ channels, users, favoriteUserIds, toggleFavoriteUser, setChannels, setUsers, loading, refreshWorkspace, refreshing }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext);
