import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext(null);
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('accessToken');
    const socketPath = import.meta.env.VITE_SOCKET_PATH || '/socket.io/';
    const s = io(SOCKET_URL, { 
      auth: { token }, 
      transports: ['websocket', 'polling'],
      path: socketPath
    });
    s.on('connect', () => console.log('[socket] connected'));
    s.on('connect_error', (err) => console.error('[socket] error', err.message));
    setSocket(s);
    return () => { s.disconnect(); };
  }, [user]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
