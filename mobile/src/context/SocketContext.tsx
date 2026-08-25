import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { connectSocket, disconnectSocket, getSocket } from '../api/socketManager';

const SocketContext = createContext<any>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    console.log('[SocketProvider] useEffect triggered. user?.id:', user?.id);
    if (!user?.id) {
      console.log('[SocketProvider] Disconnecting because no user.id');
      disconnectSocket();
      setReady(false);
      return;
    }

    let cancelled = false;

    console.log('[SocketProvider] Calling connectSocket for user:', user.id);
    connectSocket(String(user.id)).then((s) => {
      console.log('[SocketProvider] connectSocket resolved. cancelled:', cancelled);
      if (!cancelled) {
        setReady(true);
        s.on('connect', () => {
          if (user.presence === 'offline' || !user.presence) {
            // we don't have setUser here, so we just let the backend handle the presence
          }
        });
        // Catch it if it's already connected before the listener is added
        if (s.connected && (user.presence === 'offline' || !user.presence)) {
            // handled
        }
      }
    });

    // Do NOT disconnect on cleanup - the singleton manages its own lifecycle
    return () => {
      console.log('[SocketProvider] useEffect cleanup triggered for user:', user?.id);
      cancelled = true;
    };
  }, [user?.id]);

  // Return the singleton socket directly
  return (
    <SocketContext.Provider value={ready ? getSocket() : null}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
