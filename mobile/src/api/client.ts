import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// For Android emulator, localhost is 10.0.2.2. For iOS it's localhost. 
// Fallback to EXPO_PUBLIC_API_URL if defined.
const defaultHost = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || defaultHost;

let memoryToken: string | null = null; // Fallback

export async function getToken() {
  try {
    if (Platform.OS === 'web') return localStorage.getItem('accessToken');
    return await AsyncStorage.getItem('accessToken');
  } catch (e) {
    console.warn('AsyncStorage getToken error:', e);
    return memoryToken;
  }
}

export async function setToken(token: string) {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem('accessToken', token);
    } else {
      await AsyncStorage.setItem('accessToken', token);
    }
  } catch (e) {
    console.warn('AsyncStorage setToken error:', e);
    memoryToken = token;
  }
}

export async function clearToken() {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem('accessToken');
    } else {
      await AsyncStorage.removeItem('accessToken');
    }
  } catch (e) {
    console.warn('AsyncStorage clearToken error:', e);
    memoryToken = null;
  }
}

async function request(path: string, { method = 'GET', body = null, headers = {}, responseType = 'json' }: any = {}) {
  const token = await getToken();
  const reqHeaders: any = {
    'Content-Type': 'application/json',
    ...headers,
  };
  
  if (token) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/api${path}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  if (responseType === 'text') return res.text();
  if (responseType === 'blob') return res.blob();
  return res.json();
}

export const api = {
  auth: {
    login: (username: string, password: string) => request('/auth/login', { method: 'POST', body: { username, password } }),
    me: () => request('/auth/me'),
    logout: () => request('/auth/logout', { method: 'POST' }),
  },
  users: {
    list: () => request('/users'),
    setPresence: (presence: string, statusText: string) => request('/users/me/presence', { method: 'PUT', body: { presence, statusText } }),
    updateMe: (name: string, job_title?: string, status_text?: string) => request('/users/me', { method: 'PUT', body: { name, job_title, status_text } }),
    updatePassword: (currentPassword: string, newPassword: string) => request('/users/me/password', { method: 'PUT', body: { currentPassword, newPassword } }),
    saveFcmToken: (token: string) => request('/users/fcm-token', { method: 'POST', body: { token } }),
  },
  channels: {
    mine: () => request('/channels'),
    get: (slug: string) => request(`/channels/${slug}`),
    createDM: (targetUserIds: string[], name?: string) => request('/channels/dm', { method: 'POST', body: { targetUserIds, name } }),
    markRead: (id: string | number) => request(`/channels/${id}/read`, { method: 'POST' }),
  },
  messages: {
    list: (channelId: string | number, before: string | null = null, limit = 50) => request(`/messages/channel/${channelId}?limit=${limit}${before ? `&before=${encodeURIComponent(before)}` : ''}`),
    listReplies: (parentId: string | number, before: string | null = null, limit = 50) => request(`/messages/${parentId}/replies?limit=${limit}${before ? `&before=${encodeURIComponent(before)}` : ''}`),
    send: (channelId: string | number, body: string, parentId: string | number | null = null) => request('/messages', { method: 'POST', body: { channelId, body, parentId } }),
    react: (id: string | number, emoji: string) => request(`/messages/${id}/react`, { method: 'POST', body: { emoji } }),
    getMentions: () => request('/messages/mentions'),
  }
};
