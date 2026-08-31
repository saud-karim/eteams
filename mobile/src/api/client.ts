import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

let defaultHost = process.env.EXPO_PUBLIC_API_URL || 'http://193.163.7.59:4000';
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  defaultHost = `http://${window.location.hostname}:4000`;
}
export const API_BASE_URL = defaultHost;

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
    getManagers: () => request('/auth/managers'),
    signup: (data: any) => request('/auth/signup', { method: 'POST', body: data }),
    me: () => request('/auth/me'),
    logout: () => request('/auth/logout', { method: 'POST' }),
  },
  users: {
    list: () => request('/users'),
    getFavorites: () => request('/users/favorites'),
    addFavorite: (id: string | number) => request(`/users/favorites/${id}`, { method: 'POST' }),
    removeFavorite: (id: string | number) => request(`/users/favorites/${id}`, { method: 'DELETE' }),
    setPresence: (presence: string, statusText: string) => request('/users/me/presence', { method: 'PUT', body: { presence, statusText } }),
    updateMe: (name: string, job_title?: string, status_text?: string, email?: string, phone?: string) => request('/users/me', { method: 'PUT', body: { name, job_title, status_text, email, phone } }),
    updatePassword: (newPassword: string) => request('/users/me/password', { method: 'PUT', body: { newPassword } }),
    saveFcmToken: (token: string) => request('/users/fcm-token', { method: 'POST', body: { token } }),
    updateAvatar: async (fileUri: string, mimeType: string, filename: string) => {
      const token = await getToken();
      const reqHeaders: any = {};
      if (token) reqHeaders['Authorization'] = `Bearer ${token}`;

      const formData = new FormData();
      // @ts-ignore
      formData.append('avatar', {
        uri: Platform.OS === 'ios' ? decodeURI(fileUri).replace('file://', '') : fileUri,
        type: mimeType || 'image/jpeg',
        name: filename || 'avatar.jpg',
      });

      const res = await fetch(`${API_BASE_URL}/api/users/me/avatar`, {
        method: 'POST',
        headers: reqHeaders,
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
  },
  channels: {
    mine: () => request('/channels'),
    get: (slug: string) => request(`/channels/${slug}`),
    create: (data: { name: string; description?: string; type: string; is_readonly?: boolean; is_mandatory?: boolean; color?: string; icon?: string }) => request('/channels', { method: 'POST', body: data }),
    createDM: (targetUserIds: string[], name?: string) => request('/channels/dm', { method: 'POST', body: { targetUserIds, name } }),
    markRead: (id: string | number) => request(`/channels/${id}/read`, { method: 'POST' }),
    addMember: (channelId: string | number, userId: string | number) => request(`/channels/${channelId}/members`, { method: 'POST', body: { userId } }),
    removeMember: (channelId: string | number, userId: string | number) => request(`/channels/${channelId}/members/${userId}`, { method: 'DELETE' }),
    leave: (channelId: string | number) => request(`/channels/${channelId}/members/me`, { method: 'DELETE' }),
    delete: (channelId: string | number) => request(`/channels/${channelId}`, { method: 'DELETE' }),
    updateMemberPermissions: (channelId: string | number, userId: string | number, permissions: any) => request(`/channels/${channelId}/members/${userId}/permissions`, { method: 'PUT', body: permissions }),
  },
  messages: {
    get: (id: string | number) => request(`/messages/single/${id}`),
    list: (channelId: string | number, before: string | null = null, limit = 50) => request(`/messages/channel/${channelId}?limit=${limit}${before ? `&before=${encodeURIComponent(before)}` : ''}`),
    listReplies: (parentId: string | number, before: string | null = null, limit = 50) => request(`/messages/${parentId}/replies?limit=${limit}${before ? `&before=${encodeURIComponent(before)}` : ''}`),
    send: (channelId: string | number, body: string, parentId: string | number | null = null, replyToId: string | number | null = null) => request('/messages', { method: 'POST', body: { channelId, body, parentId, replyToId } }),
    update: (id: string | number, body: string) => request(`/messages/${id}`, { method: 'PATCH', body: { body } }),
    delete: (id: string | number) => request(`/messages/${id}`, { method: 'DELETE' }),
    react: (id: string | number, emoji: string) => request(`/messages/${id}/react`, { method: 'POST', body: { emoji } }),
    togglePin: (id: string | number, pinned: boolean) => request(`/messages/${id}/pin`, { method: 'POST', body: { pinned } }),
    getMentions: () => request('/messages/mentions'),
    getThreads: () => request('/messages/threads'),
    getSaved: () => request('/messages/saved'),
    getFiles: () => request('/messages/files'),
    toggleSave: (id: string | number, save: boolean) => request(`/messages/${id}/save`, { method: 'POST', body: { save } }),
    search: (query: string) => request(`/messages/search?q=${encodeURIComponent(query)}`),
    markRead: (messageIds: string[]) => request('/messages/read', { method: 'POST', body: { messageIds } }),
    sendWithAttachment: async (channelId: string | number, body: string, parentId: string | number | null, fileUri: string, mimeType: string, filename: string, replyToId: string | number | null = null) => {
      const token = await getToken();
      const reqHeaders: any = {};
      if (token) reqHeaders['Authorization'] = `Bearer ${token}`;

      const formData = new FormData();
      formData.append('channelId', String(channelId));
      formData.append('body', body || '');
      if (parentId) formData.append('parentId', String(parentId));
      else formData.append('parentId', 'null'); // For backend to parse null correctly

      if (replyToId) formData.append('replyToId', String(replyToId));
      else formData.append('replyToId', 'null');

      // @ts-ignore
      formData.append('file', {
        uri: Platform.OS === 'ios' ? decodeURI(fileUri).replace('file://', '') : fileUri,
        type: mimeType || 'application/octet-stream',
        name: filename || 'attachment',
      });

      const res = await fetch(`${API_BASE_URL}/api/messages`, {
        method: 'POST',
        headers: reqHeaders, // no Content-Type so fetch sets boundary for FormData automatically
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      return res.json();
    }
  }
};
