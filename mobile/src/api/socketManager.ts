// Singleton socket manager - lives OUTSIDE React lifecycle
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, getToken } from '../api/client';

let socket: Socket | null = null;
let currentUserId: string | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export async function connectSocket(userId: string): Promise<Socket> {
  // Already connected for this user
  if (socket?.connected && currentUserId === userId) {
    return socket;
  }

  // Disconnect old socket if exists
  if (socket) {
    console.log('[socketManager] Disconnecting old socket because connectSocket was called again. userId:', userId);
    console.trace();
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  const token = await getToken();
  socket = io(API_BASE_URL, {
    auth: { token },
    path: '/socket.io/',
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
  });

  currentUserId = userId;

  socket.on('connect', () => {
    console.log('[socket] connected (stable)');
  });

  socket.on('disconnect', (reason) => {
    console.log('[socket] disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[socket] error:', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    console.log('[socketManager] disconnectSocket() explicitly called.');
    console.trace();
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    currentUserId = null;
  }
}
