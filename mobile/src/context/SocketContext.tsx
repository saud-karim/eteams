import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { API_BASE_URL, getToken } from '../api/client';

const SocketContext = createContext<any>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    let s: any;

    const initSocket = async () => {
      const token = await getToken();
      s = io(API_BASE_URL, { 
        auth: { token }, 
        transports: ['websocket', 'polling'],
        path: '/socket.io/'
      });
      s.on('connect', () => console.log('[socket] connected'));
      s.on('connect_error', (err: any) => console.error('[socket] error', err.message));
      setSocket(s);
    };

    initSocket();

    return () => { 
      if (s) s.disconnect(); 
    };
  }, [user]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
