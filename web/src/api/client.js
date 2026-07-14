const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function getToken() { return localStorage.getItem('accessToken'); }

async function request(path, { method = 'GET', body, headers = {}, responseType = 'json' } = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
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
    login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
    register: (data) => request('/auth/register', { method: 'POST', body: data }),
    signup: (data) => request('/auth/signup', { method: 'POST', body: data }),
    getManagers: () => request('/auth/managers'),
    me: () => request('/auth/me'),
    logout: () => request('/auth/logout', { method: 'POST' }),
  },
  users: {
    list: () => request('/users'),
    updateMe: (data) => request('/users/me', { method: 'PUT', body: data }),
    updatePassword: (currentPassword, newPassword) => request('/users/me/password', { method: 'PUT', body: { currentPassword, newPassword } }),
    setPresence: (presence, statusText) => request('/users/me/presence', { method: 'PUT', body: { presence, statusText } }),
  },
  channels: {
    mine: () => request('/channels'),
    get: (slug) => request(`/channels/${slug}`),
    create: (data) => request('/channels', { method: 'POST', body: data }),
    createDM: (targetUserIds) => request('/channels/dm', { method: 'POST', body: { targetUserIds } }),
    addMember: (id, userId) => request(`/channels/${id}/members`, { method: 'POST', body: { userId } }),
    removeMember: (channelId, userId) => request(`/channels/${channelId}/members/${userId}`, { method: 'DELETE' }),
    markRead: (id) => request(`/channels/${id}/read`, { method: 'POST' }),
    leave: (id) => request(`/channels/${id}/members/me`, { method: 'DELETE' }),
    delete: (id) => request(`/channels/${id}`, { method: 'DELETE' }),
    updateMemberPermissions: (id, userId, permissions) => request(`/channels/${id}/members/${userId}/permissions`, { method: 'PUT', body: permissions }),
    export: (id) => request(`/channels/${id}/export`, { responseType: 'text' }),
  },
  messages: {
    list: (channelId, before = null, limit = 50) => request(`/messages/channel/${channelId}?limit=${limit}${before ? `&before=${encodeURIComponent(before)}` : ''}`),
    listReplies: (parentId, before = null, limit = 50) => request(`/messages/${parentId}/replies?limit=${limit}${before ? `&before=${encodeURIComponent(before)}` : ''}`),
    search: (q) => request(`/messages/search?q=${encodeURIComponent(q)}`),
    getSaved: () => request('/messages/saved'),
    getThreads: () => request('/messages/threads'),
    getMentions: () => request('/messages/mentions'),
    send: (channelId, body, parentId = null) => request('/messages', { method: 'POST', body: { channelId, body, parentId } }),
    sendWithFile: async (channelId, body, parentId, file) => {
      const fd = new FormData();
      fd.append('channelId', channelId);
      fd.append('body', body || '');
      if (parentId) fd.append('parentId', parentId);
      if (file) fd.append('file', file);
      const token = getToken();
      const res = await fetch(`${BASE}/api/messages`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
    edit: (id, body) => request(`/messages/${id}`, { method: 'PATCH', body: { body } }),
    remove: (id) => request(`/messages/${id}`, { method: 'DELETE' }),
    react: (id, emoji) => request(`/messages/${id}/react`, { method: 'POST', body: { emoji } }),
    togglePin: (id, pinned) => request(`/messages/${id}/pin`, { method: 'POST', body: { pinned } }),
    toggleSave: (id, saved) => request(`/messages/${id}/save`, { method: 'POST', body: { saved } }),
  },
  broadcasts: {
    list: () => request('/broadcasts'),
    send: (data) => request('/broadcasts', { method: 'POST', body: data }),
  },
  admin: {
    getStats: () => request('/admin/stats'),
    getChannelManagers: () => request('/admin/channels/managers'),
    importUsers: (users) => request('/admin/users/import', { method: 'POST', body: { users } }),
    getAuditLogs: () => request('/admin/audit-logs'),
    listUsers: () => request('/admin/users'),
    getPendingUsers: () => request('/admin/users/pending'),
    approveUser: (id, data) => request(`/admin/users/${id}/approve`, { method: 'POST', body: data }),
    rejectUser: (id) => request(`/admin/users/${id}/reject`, { method: 'POST' }),
    deactivateUser: (id) => request(`/admin/users/${id}/deactivate`, { method: 'POST' }),
    reactivateUser: (id) => request(`/admin/users/${id}/reactivate`, { method: 'POST' }),
    forceLogout: (id) => request(`/admin/users/${id}/force-logout`, { method: 'POST' }),
    resetPassword: (id, data) => request(`/admin/users/${id}/reset-password`, { method: 'POST', body: data }),
    createUser: (data) => request('/admin/users', { method: 'POST', body: data }),
    updateUser: (id, data) => request(`/admin/users/${id}`, { method: 'PUT', body: data }),
    getUserChannels: (id) => request(`/admin/users/${id}/channels`),
    getChannels: () => request('/admin/channels'),
    updateChannel: (id, data) => request(`/admin/channels/${id}`, { method: 'PUT', body: data }),
    archiveChannel: (id) => request(`/admin/channels/${id}/archive`, { method: 'POST' }),
    assignChannelManager: (channelId, data) => request(`/admin/channels/${channelId}/managers`, { method: 'POST', body: data }),
    revokeChannelManager: (channelId, userId) => request(`/admin/channels/${channelId}/managers/${userId}`, { method: 'DELETE' }),
    getRolePresets: () => request('/admin/role-presets'),
    createRolePreset: (data) => request('/admin/role-presets', { method: 'POST', body: data }),
    updateRolePreset: (id, data) => request(`/admin/role-presets/${id}`, { method: 'PUT', body: data }),
    deleteRolePreset: (id) => request(`/admin/role-presets/${id}`, { method: 'DELETE' }),
    inviteGuest: (email) => request(`/admin/invite`, { method: 'POST', body: { email } }),
  },
  broadcasts: {
    send: (data) => request('/broadcasts', { method: 'POST', body: data }),
    list: () => request('/broadcasts'),
  }
};
