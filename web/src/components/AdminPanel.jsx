import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Shield, ArrowLeft, BarChart2, Users, Hash, FileText, Radio, Lock,
  Search, Download, Info, AlertTriangle, XCircle, Clock, Archive, CheckCircle, Megaphone, X,
  User, Briefcase, Settings, ChevronDown, ChevronUp, UserCheck, MessageSquare
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import Avatar from './Avatar';
import ChannelIcon from './ChannelIcon';
import CreateChannelModal from './CreateChannelModal';
import DashboardTab from './admin/DashboardTab';
import UsersTab from './admin/UsersTab';
import PresetsTab from './admin/PresetsTab';
import ChannelsTab from './admin/ChannelsTab';
import ChannelPermissionsTab from './admin/ChannelPermissionsTab';
import AuditTab from './admin/AuditTab';
import BroadcastTab from './admin/BroadcastTab';
import PendingTab from './admin/PendingTab';

import { defaultPermissions } from '../constants/permissions';

export default function AdminPanel({ onClose }) {
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('adminTab') || 'dashboard';

  const setActiveTab = (tab) => {
    setSearchParams(prev => {
      prev.set('adminTab', tab);
      return prev;
    });
  };

  const { t } = useLanguage();
  const { channels, users, setUsers } = useWorkspace();

  // Broadcast State
  const [broadcastType, setBroadcastType] = useState('informational');
  const [broadcastRecipients, setBroadcastRecipients] = useState('all');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastsHistory, setBroadcastsHistory] = useState([]);
  const [isSending, setIsSending] = useState(false);

  const [auditLogs, setAuditLogs] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);

  const [showUserModal, setShowUserModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [showPermCatalog, setShowPermCatalog] = useState(false);
  const [userForm, setUserForm] = useState({ 
    name: '', email: '', department: '', role: 'user', password: '',
    job_title: '', reports_to: '', employment_type: 'Full-time employee', 
    role_preset: 'standard', permissions: { ...defaultPermissions },
    initial_channels: []
  });

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // Channels State
  const [localChannels, setLocalChannels] = useState([]);
  const [showEditChannelModal, setShowEditChannelModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);
  const [channelForm, setChannelForm] = useState({ name: '', description: '', type: 'public', is_readonly: false });

  // Presets State
  const [rolePresets, setRolePresets] = useState([]);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [editingPreset, setEditingPreset] = useState(null);
  const [presetForm, setPresetForm] = useState({ name: '', description: '', icon: 'Shield', permissions: { ...defaultPermissions } });

  // Update local users when creating/editing so we don't need a full page reload instantly
  const [localUsers, setLocalUsers] = useState([]);

  const [stats, setStats] = useState({ totalUsers: 0, activeSessions: 0, totalChannels: 0, totalMessages: 0, storageBytes: 0 });
  const [channelManagers, setChannelManagers] = useState([]);
  
  const [showAssignManagerModal, setShowAssignManagerModal] = useState(false);
  const [managerForm, setManagerForm] = useState({ 
    userId: '', 
    channelId: '', 
    is_manager: true,
    can_post: true,
    can_pin_messages: true,
    can_delete_messages: true,
    can_add_members: true,
    can_remove_members: true
  });
  
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('All action types');

  const getRelativeTime = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins || 1} min ago`;
    if (mins < 1440) return `${Math.floor(mins/60)}h ago`;
    return `${Math.floor(mins/1440)}d ago`;
  };

  const loadPresets = async () => {
    try {
      const res = await api.admin.getRolePresets();
      setRolePresets(res.presets || []);
    } catch (err) { console.error('Failed to load presets', err); }
  };

  useEffect(() => {
    Promise.all([
      api.admin.listUsers(),
      api.admin.getChannels(),
      api.admin.getRolePresets()
    ]).then(([usersRes, channelsRes, presetsRes]) => {
      setLocalUsers(usersRes.users || []);
      setLocalChannels(channelsRes.channels || []);
      setRolePresets(presetsRes.presets || []);
    }).catch(e => console.error('Admin data error', e));
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      api.admin.getStats().then(res => setStats(res.stats || {})).catch(console.error);
    } else if (activeTab === 'broadcast') {
      api.broadcasts.list().then(res => setBroadcastsHistory(res.broadcasts || [])).catch(console.error);
    } else if (activeTab === 'audit') {
      api.admin.getAuditLogs().then(res => setAuditLogs(res.logs || [])).catch(console.error);
    } else if (activeTab === 'channels' || activeTab === 'channel_permissions') {
      api.admin.getChannels().then(res => setLocalChannels(res.channels || [])).catch(console.error);
      api.admin.getChannelManagers().then(res => setChannelManagers(res.managers || [])).catch(console.error);
    } else if (activeTab === 'presets' || activeTab === 'users' || activeTab === 'pending') {
      loadPresets();
      if (activeTab === 'users') {
        api.admin.getChannels().then(res => setLocalChannels(res.channels || [])).catch(console.error);
        api.admin.listUsers().then(res => {
          setLocalUsers(res.users || []);
        }).catch(console.error);
      } else if (activeTab === 'pending') {
        api.admin.getChannels().then(res => setLocalChannels(res.channels || [])).catch(console.error);
        api.admin.getPendingUsers().then(res => setPendingUsers(res.users || [])).catch(console.error);
      }
    }
  }, [activeTab]);


  const exportCSV = (filename, headers, rows) => {
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportUsers = () => {
    const headers = ['ID', 'Name', 'Email', 'Department', 'Role'];
    const rows = localUsers.map(u => [u.id, `"${u.name}"`, `"${u.email}"`, `"${u.department || ''}"`, u.role]);
    exportCSV('users_export.csv', headers, rows);
  };

  const handleExportChannels = () => {
    const headers = ['Name', 'Type', 'Read Only'];
    const rows = localChannels.map(c => [`"${c.name}"`, c.type, c.is_readonly ? 'Yes' : 'No']);
    exportCSV('channels_export.csv', headers, rows);
  };

  const handleExportAuditLogs = () => {
    const headers = ['Action', 'User', 'IP', 'Date'];
    const rows = auditLogs.map(l => [`"${l.action}"`, `"${l.user_id || 'System'}"`, l.ip_address, new Date(l.created_at).toLocaleString()]);
    exportCSV('audit_logs.csv', headers, rows);
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target.result;
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        const parsedUsers = lines.slice(1).map(l => {
          const [name, email, department, jobTitle] = l.split(',').map(s => s?.trim().replace(/^"|"$/g, '') || '');
          return { name, email, department, jobTitle };
        });
        if (parsedUsers.length === 0) return alert('No valid users found in CSV');
        
        const res = await api.admin.importUsers(parsedUsers);
        alert(`Successfully imported ${res.imported} users!`);
        window.location.reload();
      } catch (err) {
        alert('Failed to import CSV: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMessage.trim()) return;
    setIsSending(true);
    try {
      const res = await api.broadcasts.send({ type: broadcastType, recipients: broadcastRecipients, messageBody: broadcastMessage });
      setBroadcastsHistory([res.broadcast, ...broadcastsHistory]);
      setBroadcastMessage('');
    } catch (e) { alert('Failed to send broadcast'); }
    setIsSending(false);
  };

  const handleDeactivate = async (u) => {
    const ok = await confirm({ title: 'Deactivate User', message: `Are you sure you want to deactivate ${u.name}?`, isDanger: true });
    if (!ok) return;
    try {
      await api.admin.deactivateUser(u.id);
      alert(`${u.name} deactivated.`);
      // Update local state
      setLocalUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: 0, status: 'inactive' } : x));
    } catch(e) {
      alert(e.error || 'Failed to deactivate user');
    }
  };

  const handleReactivate = async (u) => {
    const ok = await confirm({ title: 'Reactivate User', message: `Are you sure you want to reactivate ${u.name}?` });
    if (!ok) return;
    try {
      await api.admin.reactivateUser(u.id);
      alert(`${u.name} reactivated.`);
      setLocalUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: 1, status: 'online' } : x));
    } catch(e) {
      alert(e.error || 'Failed to reactivate user');
    }
  };

  const handleForceLogout = async (u) => {
    const ok = await confirm({ title: 'Force Logout', message: `Force logout ${u.name}?` });
    if (!ok) return;
    try {
      await api.admin.forceLogout(u.id);
      alert(`${u.name} logged out.`);
    } catch(e) { alert(e.error || 'Failed'); }
  };

  const handleResetPassword = (u) => {
    setResetTargetUser(u);
    setNewPassword('');
    setShowResetModal(true);
  };

  const confirmResetPassword = async () => {
    if (!newPassword.trim()) return alert('Please enter a new password');
    try {
      await api.admin.resetPassword(resetTargetUser.id, { newPassword });
      alert(`Password has been successfully updated for ${resetTargetUser.name}.`);
      setShowResetModal(false);
    } catch(e) { alert(e.error || 'Failed to reset password'); }
  };

  const openCreateUser = () => {
    setEditingUser(null);
    setUserForm({ 
      name: '', email: '', department: '', role: 'user', password: '',
      job_title: '', reports_to: '', employment_type: 'Full-time employee', 
      role_preset: 'standard', permissions: { ...defaultPermissions },
      initial_channels: localChannels.filter(c => c.is_mandatory).map(c => c.id)
    });
    setShowPermCatalog(false);
    setShowUserModal(true);
  };

  const openReviewUser = (u) => {
    openEditUser(u);
  };

  const handleApproveUser = async (id, formPayload = null) => {
    try {
      await api.admin.approveUser(id, formPayload || {});
      setPendingUsers(prev => prev.filter(x => x.id !== id));
      if (formPayload) setShowUserModal(false);
      alert('User approved successfully.');
    } catch (e) { alert(e.error || e.message || 'Failed to approve'); }
  };

  const handleRejectUser = async (id) => {
    const ok = window.confirm('Are you sure you want to reject this signup?');
    if (!ok) return;
    try {
      await api.admin.rejectUser(id);
      setPendingUsers(prev => prev.filter(x => x.id !== id));
      setShowUserModal(false);
    } catch (e) { alert(e.error || e.message || 'Failed to reject'); }
  };

  const openInviteModal = () => {
    setInviteEmail('');
    setInviteLink('');
    setShowInviteModal(true);
  };

  const submitInviteGuest = async () => {
    if (!inviteEmail.trim()) return alert('Please enter an email address');
    try {
      const res = await api.admin.inviteGuest(inviteEmail);
      setInviteLink(res.inviteLink);
    } catch(e) { alert(e.error || 'Failed to invite guest'); }
  };

  const openEditUser = async (u) => {
    setEditingUser(u);
    let userChannels = [];
    try {
      const res = await api.admin.getUserChannels(u.id);
      userChannels = res.channels || [];
    } catch(e) { console.error('Failed to get user channels', e); }

    if (u.approval_status === 'pending' && userChannels.length === 0) {
      userChannels = localChannels.filter(c => c.is_mandatory).map(c => c.id);
    }

    setUserForm({ 
      name: u.name, email: u.email, department: u.department || '', role: u.role, password: '',
      job_title: u.job_title || '', reports_to: u.reports_to || '', employment_type: u.employment_type || 'Full-time employee',
      role_preset: u.role_preset || 'standard', permissions: typeof u.permissions === 'string' ? JSON.parse(u.permissions) : (u.permissions || { ...defaultPermissions }),
      initial_channels: userChannels
    });
    setShowPermCatalog(false);
    setShowUserModal(true);
  };

  const handlePresetChange = (presetId) => {
    if (presetId === 'custom') {
      setUserForm({ ...userForm, role_preset: 'custom' });
      return;
    }
    const preset = rolePresets.find(p => p.id === presetId);
    if (preset) {
      setUserForm({ ...userForm, role_preset: preset.id, permissions: preset.permissions });
    }
  };

  const togglePerm = (perm) => {
    setUserForm(prev => {
      const p = { ...prev.permissions };
      p[perm] = !p[perm];
      return { ...prev, permissions: p, role_preset: 'custom' };
    });
  };

  const toggleInitialChannel = (id) => {
    setUserForm(prev => {
      let ch = [...(prev.initial_channels || [])];
      if (ch.includes(id)) ch = ch.filter(x => x !== id);
      else ch.push(id);
      return { ...prev, initial_channels: ch };
    });
  };

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        const res = await api.admin.updateUser(editingUser.id, userForm);
        setLocalUsers(prev => prev.map(x => x.id === editingUser.id ? res.user : x));
        if (setUsers) setUsers(prev => prev.map(x => x.id === editingUser.id ? res.user : x));
        alert('User updated.');
      } else {
        const res = await api.admin.createUser(userForm);
        setLocalUsers(prev => [...prev, res.user]);
        if (setUsers) setUsers(prev => [...prev, res.user]);
        alert('User created.');
      }
      setShowUserModal(false);
    } catch(e) {
      alert(e.error || 'Failed to save user');
    }
  };

  const enrichedUsers = localUsers.map(u => ({
    ...u,
    dept: u.department || (u.role === 'superadmin' ? 'Executive' : 'Operations'),
    last: u.presence === 'online' ? 'Now' : '15 min ago',
    avatar: u.avatar_initials || u.name.substring(0, 2).toUpperCase(),
    color: u.avatar_color || 'var(--emerald)'
  }));

  const handleArchiveChannel = async (c) => {
    const ok = await confirm({ title: 'Archive Channel', message: `Are you sure you want to archive #${c.name}? This will hide it for everyone.`, isDanger: true });
    if (!ok) return;
    try {
      await api.admin.archiveChannel(c.id);
      alert(`Channel #${c.name} archived.`);
      setLocalChannels(prev => prev.filter(x => x.id !== c.id));
    } catch(e) { alert(e.error || 'Failed to archive channel'); }
  };

  const openEditChannel = (c) => {
    setEditingChannel(c);
    setChannelForm({ name: c.name, description: c.description || '', type: c.type, is_readonly: c.is_readonly ? true : false, is_mandatory: c.is_mandatory ? true : false });
    setShowEditChannelModal(true);
  };

  const handleSaveChannel = async () => {
    try {
      const res = await api.admin.updateChannel(editingChannel.id, channelForm);
      setLocalChannels(prev => prev.map(x => x.id === editingChannel.id ? {...x, ...res.channel} : x));
      alert('Channel updated.');
      setShowEditChannelModal(false);
    } catch(e) {
      alert(e.error || 'Failed to update channel');
    }
  };

  const handleCreateChannelSuccess = () => {
    setShowCreateChannelModal(false);
    // Refresh channel list
    api.admin.getChannels().then(res => setLocalChannels(res.channels || [])).catch(console.error);
  };

  const handleAssignManager = async () => {
    if (!managerForm.userId || !managerForm.channelId) return alert('Select user and channel');
    try {
      await api.admin.assignChannelManager(managerForm.channelId, { 
        userId: managerForm.userId,
        is_manager: managerForm.is_manager,
        can_post: managerForm.can_post,
        can_add_members: managerForm.can_add_members,
        can_remove_members: managerForm.can_remove_members,
        can_pin_messages: managerForm.can_pin_messages,
        can_delete_messages: managerForm.can_delete_messages
      });
      alert('Manager assigned successfully.');
      setShowAssignManagerModal(false);
      setManagerForm({ 
        userId: '', 
        channelId: '', 
        is_manager: true,
        can_post: true,
        can_pin_messages: true,
        can_delete_messages: true,
        can_add_members: true,
        can_remove_members: true
      });
      api.admin.getChannelManagers().then(res => setChannelManagers(res.managers || []));
    } catch(e) {
      alert(e.error || e.message || 'Failed to assign manager');
    }
  };

  const handleRevokeManager = async (channelId, userId) => {
    const ok = await confirm({ title: 'Revoke Manager', message: 'Are you sure you want to revoke this manager?', isDanger: true });
    if (!ok) return;
    try {
      await api.admin.revokeChannelManager(channelId, userId);
      alert('Manager revoked.');
      api.admin.getChannelManagers().then(res => setChannelManagers(res.managers || []));
    } catch(e) {
      alert(e.error || e.message || 'Failed to revoke manager');
    }
  };

  const mockAuditLogs = [
    { type: 'normal', icon: <Info size={18} color="var(--emerald)" />, action: <>Superadmin <b>Jasmine Ali</b> created channel <b>#procurement-alerts</b></>, meta: 'Type: public • Retention: 7 years • Initial members: 32', when: '5 minutes ago • IP 10.0.4.87' },
    { type: 'warn', icon: <AlertTriangle size={18} color="var(--amber)" />, action: <><b>Karim Sobhy</b> exported messages from <b>#hr-confidential</b></>, meta: 'Format: PDF • 1,402 messages • Case: Audit 2026', when: '2 hours ago • IP 10.0.12.5' },
    { type: 'danger', icon: <XCircle size={18} color="var(--danger)" />, action: <>System forced logout for <b>Omar Fathy</b></>, meta: 'Reason: suspected credential leak • Password reset triggered', when: 'Last week • IP 10.0.4.87' }
  ];

  const mockBroadcasts = [
    { icon: <Info size={16} color="var(--emerald)" />, msg: 'ERP maintenance tonight 10PM-12AM. Expect brief downtime.', r: '487 users', ack: '312 read (64%)', when: '3 hours ago' },
    { icon: <AlertTriangle size={16} color="var(--amber)" />, msg: 'Fire drill scheduled Thursday 11 AM. All staff to assemble at meeting point A.', r: '487 users', ack: '487 acknowledged (100%)', when: '2 days ago' },
    { icon: <Info size={16} color="var(--emerald)" />, msg: 'New Ramadan working hours policy published — please read #hr-updates', r: '487 users', ack: '419 read (86%)', when: 'Last week' }
  ];



  const filteredAuditLogs = auditLogs.filter(log => {
    let match = true;
    if (auditSearchQuery) {
      const q = auditSearchQuery.toLowerCase();
      const metaStr = log.metadata ? JSON.stringify(log.metadata).toLowerCase() : '';
      if (
        !log.action.toLowerCase().includes(q) &&
        !(log.actor_name || '').toLowerCase().includes(q) &&
        !(log.ip_address || '').toLowerCase().includes(q) &&
        !metaStr.includes(q)
      ) {
        match = false;
      }
    }
    if (match && auditActionFilter !== 'All action types') {
      if (auditActionFilter === 'User management' && !log.action.startsWith('user.')) match = false;
      if (auditActionFilter === 'Channel management' && !log.action.startsWith('channel.')) match = false;
      if (auditActionFilter === 'Message deletions' && !log.action.startsWith('message.')) match = false;
    }
    return match;
  });

  return (
    <section className="admin-panel" style={{ display: 'flex' }}>
      <div className="admin-topbar">
        <div>
          <div className="admin-title">
            <div className="shield"><Shield size={24} color="var(--emerald)" /></div>
            <div>
              <div>{t('adminPanel')}</div>
              <div className="admin-sub"><span className="sa-badge">SUPERADMIN</span> Jasmine Ali · {t('adminFullControl')}</div>
            </div>
          </div>
        </div>
        <button className="admin-btn-ghost" onClick={onClose}>
          <ArrowLeft size={16} style={{ marginRight: '8px' }} /> {t('adminBackToChat')}
        </button>
      </div>
      
      <div className="admin-tabs">
        <div className={`admin-tab ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <BarChart2 size={16} /><span>Dashboard</span>
        </div>
        <div className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          <Users size={16} /><span>Users</span>
        </div>
        <div className={`admin-tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
          <UserCheck size={16} /><span>Pending Approvals {pendingUsers.length > 0 && <span style={{color:'var(--danger)', marginLeft:'4px'}}>●</span>}</span>
        </div>
        <div className={`admin-tab ${activeTab === 'presets' ? 'active' : ''}`} onClick={() => setActiveTab('presets')}>
          <Settings size={16} /><span>Role Presets</span>
        </div>
        <div className={`admin-tab ${activeTab === 'channels' ? 'active' : ''}`} onClick={() => setActiveTab('channels')}>
          <Hash size={16} /><span>Channels</span>
        </div>
        <div className={`admin-tab ${activeTab === 'channel_permissions' ? 'active' : ''}`} onClick={() => setActiveTab('channel_permissions')}>
          <Shield size={16} /><span>Channel Permissions</span>
        </div>
        <div className={`admin-tab ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
          <FileText size={16} /><span>Audit Log</span>
        </div>
        <div className={`admin-tab ${activeTab === 'broadcast' ? 'active' : ''}`} onClick={() => setActiveTab('broadcast')}>
          <Radio size={16} /><span>Broadcast</span>
        </div>

      </div>

      {showUserModal && (
        <div className="modal-backdrop active" style={{ zIndex: 9999 }}>
          <div className="big-modal" style={{ position: 'relative', width: '640px' }}>
            <button 
              onClick={() => setShowUserModal(false)}
              style={{ position: 'absolute', right: '16px', top: '16px', color: 'var(--text-dim)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Users size={20} /> {editingUser ? 'Edit User' : 'Create new user'}
            </h3>
            <div className="msub" style={{ marginBottom: '20px' }}>
              {editingUser ? 'Update details, role preset, and permissions.' : 'Set up profile, then pick a role preset — or go Custom to tick every permission yourself.'}
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-mute)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '8px' }}>User Profile</div>
            
            <div className="form-row">
              <div className="form-field">
                <label>Full name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="text" placeholder="e.g. John Doe" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} />
              </div>
              <div className="form-field">
                <label>Work email <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="email" placeholder="john@company.com" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Department</label>
                <select value={userForm.department} onChange={e => setUserForm({...userForm, department: e.target.value})}>
                  <option value="">Select department...</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Product">Product</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                  <option value="Executive">Executive</option>
                  <option value="CEO">CEO</option>
                </select>
              </div>
              <div className="form-field">
                <label>Job title</label>
                <input type="text" placeholder="e.g. Senior Frontend Engineer" value={userForm.job_title} onChange={e => setUserForm({...userForm, job_title: e.target.value})} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>Reports to (Manager)</label>
                <select value={userForm.reports_to} onChange={e => setUserForm({...userForm, reports_to: e.target.value})}>
                  <option value="">None / N/A</option>
                  {localUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.department || 'No dept'})</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>Employment type</label>
                <select value={userForm.employment_type} onChange={e => setUserForm({...userForm, employment_type: e.target.value})}>
                  <option value="Full-time employee">Full-time employee</option>
                  <option value="Part-time employee">Part-time employee</option>
                  <option value="Contractor">Contractor / Freelance</option>
                  <option value="Intern">Intern</option>
                  <option value="Guest">External Guest / Client</option>
                </select>
              </div>
            </div>

            {!editingUser && (
              <div className="form-field">
                <label>Initial Password <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input type="text" placeholder="e.g. ChangeMe123!" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} />
              </div>
            )}
            


            <div style={{ fontSize: '11px', color: 'var(--text-mute)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', margin: '20px 0 8px' }}>Role preset — pick one, or Custom</div>
            <div className="template-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              {rolePresets.map(preset => {
                return (
                  <button key={preset.id} className={`template-card ${userForm.role_preset === preset.id ? 'selected' : ''}`} onClick={() => handlePresetChange(preset.id)}>
                    <div className="tname"><Shield size={14} /> {preset.name}</div>
                    <div className="tdesc">{preset.description}</div>
                    <div className="tperms">{Object.values(preset.permissions).filter(Boolean).length} permissions</div>
                  </button>
                );
              })}
              <button className={`template-card ${userForm.role_preset === 'custom' ? 'selected' : ''}`} onClick={() => handlePresetChange('custom')}>
                <div className="tname"><Settings size={14} /> Custom</div>
                <div className="tdesc">Manually toggle individual permissions below</div>
                <div className="tperms">Custom</div>
              </button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <button className="admin-btn-ghost" style={{ width: '100%', textAlign: 'start', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }} onClick={() => setShowPermCatalog(!showPermCatalog)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Shield size={16} /> Show all 42 permissions individually</span>
                <span>{showPermCatalog ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
              </button>
            </div>

            <div className={`perm-checklist ${showPermCatalog ? 'active' : ''}`}>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '12px' }}>📋 Full permission catalog — <b style={{ color: 'var(--emerald)' }}>green</b> checked = granted. Change preset above or tick individually.</div>
              
              <div className="perm-group-title">🔐 Account</div>
              <label className="perm-check"><input type="checkbox" checked={true} disabled /><span>Can log in to ETeams</span></label>
              
              <div className="perm-group-title">💬 Messaging</div>
              <label className="perm-check"><input type="checkbox" checked={userForm.permissions['edit-own']} onChange={() => togglePerm('edit-own')} /><span>Edit own messages</span></label>
              <label className="perm-check"><input type="checkbox" checked={userForm.permissions['delete-own']} onChange={() => togglePerm('delete-own')} /><span>Delete own messages</span></label>
              <label className="perm-check"><input type="checkbox" checked={userForm.permissions['react']} onChange={() => togglePerm('react')} /><span>Add emoji reactions</span></label>
              <label className="perm-check"><input type="checkbox" checked={userForm.permissions['thread']} onChange={() => togglePerm('thread')} /><span>Reply in threads</span></label>

              <div className="perm-group-title">✉️ Direct Messages</div>
              <label className="perm-check"><input type="checkbox" checked={userForm.permissions['dm-anyone']} onChange={() => togglePerm('dm-anyone')} /><span>Can DM anyone (except Execs)</span></label>
              <label className="perm-check"><input type="checkbox" checked={userForm.permissions['dm-exec']} onChange={() => togglePerm('dm-exec')} /><span>Can initiate DMs with Executives</span></label>
              <label className="perm-check"><input type="checkbox" checked={userForm.permissions['dm-ceo']} onChange={() => togglePerm('dm-ceo')} /><span>Can initiate DMs with CEO</span></label>
              <label className="perm-check"><input type="checkbox" checked={userForm.permissions['group-dm']} onChange={() => togglePerm('group-dm')} /><span>Create Group DMs (up to 9 people)</span></label>

              <div className="perm-group-title">🔔 Mentions</div>
              <label className="perm-check"><input type="checkbox" checked={userForm.permissions['at-user']} onChange={() => togglePerm('at-user')} /><span>Can @mention specific users</span></label>
              <label className="perm-check"><input type="checkbox" checked={userForm.permissions['at-here']} onChange={() => togglePerm('at-here')} /><span>Can use @here (notifies active)</span></label>
              <label className="perm-check"><input type="checkbox" checked={userForm.permissions['at-channel']} onChange={() => togglePerm('at-channel')} /><span>Can use @channel (notifies all)</span></label>
              <label className="perm-check"><input type="checkbox" checked={userForm.permissions['at-everyone']} onChange={() => togglePerm('at-everyone')} /><span>Can use @everyone (workspace wide)</span></label>


              <div className="perm-group-title">📎 Attachments</div>
              <label className="perm-check"><input type="checkbox" checked={userForm.permissions['upload']} onChange={() => togglePerm('upload')} /><span>Upload files (up to 25MB)</span></label>
              <label className="perm-check"><input type="checkbox" checked={userForm.permissions['upload-large']} onChange={() => togglePerm('upload-large')} /><span>Upload large files (up to 2GB)</span></label>

              <div className="perm-group-title">🏗️ Workspace Management</div>
              <label className="perm-check"><input type="checkbox" checked={userForm.permissions['create-public']} onChange={() => togglePerm('create-public')} /><span>Create Public Channels</span></label>
              <label className="perm-check"><input type="checkbox" checked={userForm.permissions['create-private']} onChange={() => togglePerm('create-private')} /><span>Create Private Channels</span></label>
              <label className="perm-check"><input type="checkbox" checked={userForm.permissions['create-announcement']} onChange={() => togglePerm('create-announcement')} /><span>Create Announcement Channels</span></label>
              <label className="perm-check"><input type="checkbox" checked={userForm.permissions['invite-guest']} onChange={() => togglePerm('invite-guest')} /><span>Invite Guests to workspace</span></label>
              <label className="perm-check"><input type="checkbox" checked={userForm.permissions['join-any']} onChange={() => togglePerm('join-any')} /><span>Join any Private Channel without invite</span></label>
              <label className="perm-check"><input type="checkbox" checked={userForm.permissions['be-manager']} onChange={() => togglePerm('be-manager')} /><span>Can be assigned as Channel Manager</span></label>

              <div className="perm-group-title">📂 Data & Privacy</div>
              <label className="perm-check"><input type="checkbox" checked={userForm.permissions['search-history']} onChange={() => togglePerm('search-history')} /><span>Search all workspace history (eDiscovery)</span></label>
            </div>

                <div style={{ fontSize: '11px', color: 'var(--text-mute)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', margin: '20px 0 8px' }}>Channels membership</div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px' }}>
                  Mandatory channels are automatically assigned. Select other non-mandatory channels to add or remove this user from.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '150px', overflowY: 'auto', background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                  {localChannels.map(c => (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        checked={userForm.initial_channels?.includes(c.id)} 
                        onChange={() => toggleInitialChannel(c.id)} 
                      />
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ChannelIcon type={c.type} size={12} color="var(--text-mute)" />
                        {c.name} {c.is_mandatory ? <span style={{ color: 'var(--emerald)', fontSize: '10px' }}>(Mandatory)</span> : ''}
                      </span>
                    </label>
                  ))}
                </div>

            <div className="modal-footer" style={{ marginTop: '32px' }}>
              <button className="btn-cancel" onClick={() => setShowUserModal(false)}>Cancel</button>
              {editingUser?.approval_status === 'pending' ? (
                <>
                  <button className="btn-danger" onClick={() => handleRejectUser(editingUser.id)}>Reject</button>
                  <button className="btn-primary" onClick={() => handleApproveUser(editingUser.id, userForm)}>Approve</button>
                </>
              ) : (
                <button className="btn-primary" onClick={handleSaveUser}>{editingUser ? 'Save Changes' : 'Create User'}</button>
              )}
            </div>
          </div>
        </div>
      )}

      {showResetModal && resetTargetUser && (
        <div className="modal-backdrop active" style={{ zIndex: 9999 }}>
          <div className="big-modal" style={{ position: 'relative', width: '400px' }}>
            <button 
              onClick={() => setShowResetModal(false)}
              style={{ position: 'absolute', right: '16px', top: '16px', color: 'var(--text-dim)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Lock size={20} /> Reset Password
            </h3>
            <div className="msub" style={{ marginBottom: '20px' }}>
              Set a new password for {resetTargetUser.name}. They will be forced to log out immediately.
            </div>

            <div className="form-field">
              <label>New Password</label>
              <input type="text" placeholder="Type new password..." value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
            
            <div className="modal-footer" style={{ marginTop: '32px' }}>
              <button className="btn-cancel" onClick={() => setShowResetModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={confirmResetPassword}>Confirm Reset</button>
            </div>
          </div>
        </div>
      )}

      {showEditChannelModal && editingChannel && (
        <div className="modal-backdrop active" style={{ zIndex: 9999 }}>
          <div className="big-modal" style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowEditChannelModal(false)}
              style={{ position: 'absolute', right: '16px', top: '16px', color: 'var(--text-dim)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Hash size={20} /> Edit Channel
            </h3>
            <div className="msub" style={{ marginBottom: '20px' }}>
              Update the settings for #{editingChannel.name}.
            </div>

            <div className="form-field">
              <label>Channel Name</label>
              <input type="text" placeholder="e.g. general" value={channelForm.name} onChange={e => setChannelForm({...channelForm, name: e.target.value})} />
            </div>
            
            <div className="form-field">
              <label>Description</label>
              <input type="text" placeholder="What is this channel about?" value={channelForm.description} onChange={e => setChannelForm({...channelForm, description: e.target.value})} />
            </div>
            
            <div className="form-row">
              <div className="form-field">
                <label>Type</label>
                <select value={channelForm.type} onChange={e => setChannelForm({...channelForm, type: e.target.value})}>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="announce">Announcement</option>
                </select>
              </div>
              <div className="form-field">
                <label>Access</label>
                <select value={channelForm.is_readonly ? 'true' : 'false'} onChange={e => setChannelForm({...channelForm, is_readonly: e.target.value === 'true'})}>
                  <option value="false">Anyone can post</option>
                  <option value="true">Read-only (Managers only)</option>
                </select>
              </div>
            </div>

            <div className="form-field" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
              <input 
                type="checkbox" 
                id="edit-mandatory-checkbox"
                checked={channelForm.is_mandatory} 
                onChange={e => setChannelForm({...channelForm, is_mandatory: e.target.checked})} 
                style={{ margin: 0, cursor: 'pointer' }}
              />
              <label htmlFor="edit-mandatory-checkbox" style={{ margin: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column' }}>
                <span>Make this channel mandatory for everyone</span>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Automatically adds all active users in the system to this channel.</span>
              </label>
            </div>
            
            <div className="modal-footer" style={{ marginTop: '32px' }}>
              <button className="btn-cancel" onClick={() => setShowEditChannelModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveChannel}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {showCreateChannelModal && (
        <CreateChannelModal onClose={() => {
          setShowCreateChannelModal(false);
          api.admin.getChannels().then(res => setLocalChannels(res.channels || [])).catch(console.error);
        }} />
      )}

      {showAssignManagerModal && (
        <div className="modal-backdrop active" style={{ zIndex: 9999 }}>
          <div className="big-modal" style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowAssignManagerModal(false)}
              style={{ position: 'absolute', right: '16px', top: '16px', color: 'var(--text-dim)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Shield size={20} /> Assign Manager
            </h3>
            <div className="msub" style={{ marginBottom: '20px' }}>
              Delegate channel management to a user.
            </div>

            <div className="form-field">
              <label>Select User</label>
              <select value={managerForm.userId} onChange={e => setManagerForm({...managerForm, userId: e.target.value})}>
                <option value="">-- Choose User --</option>
                {localUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
            </div>

            <div className="form-field">
              <label>Select Channel</label>
              <select value={managerForm.channelId} onChange={e => setManagerForm({...managerForm, channelId: e.target.value})}>
                <option value="">-- Choose Channel --</option>
                {localChannels.map(c => <option key={c.id} value={c.id}>#{c.name} {c.type === 'announce' ? '(Announcement)' : ''}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div style={{ background: 'var(--panel-2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text)', fontWeight: 'bold' }}>
                  <Shield size={18} style={{ color: '#F59E0B' }}/>
                  Channel Management
                </div>
                <label className="perm-check" style={{ display: 'flex', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
                  <input type="checkbox" checked={managerForm.is_manager} onChange={() => setManagerForm({...managerForm, is_manager: !managerForm.is_manager})} />
                  <span>Channel Manager (Full Access)</span>
                </label>
                <label className="perm-check" style={{ display: 'flex', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
                  <input type="checkbox" checked={managerForm.can_add_members} onChange={() => setManagerForm({...managerForm, can_add_members: !managerForm.can_add_members})} disabled={managerForm.is_manager} />
                  <span style={{ opacity: managerForm.is_manager ? 0.5 : 1 }}>Can Add Members</span>
                </label>
                <label className="perm-check" style={{ display: 'flex', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={managerForm.can_remove_members} onChange={() => setManagerForm({...managerForm, can_remove_members: !managerForm.can_remove_members})} disabled={managerForm.is_manager} />
                  <span style={{ opacity: managerForm.is_manager ? 0.5 : 1 }}>Can Remove Members</span>
                </label>
              </div>

              <div style={{ background: 'var(--panel-2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text)', fontWeight: 'bold' }}>
                  <MessageSquare size={18} style={{ color: '#10B981' }}/>
                  Messaging & Moderation
                </div>
                <label className="perm-check" style={{ display: 'flex', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
                  <input type="checkbox" checked={managerForm.can_post} onChange={() => setManagerForm({...managerForm, can_post: !managerForm.can_post})} disabled={managerForm.is_manager} />
                  <span style={{ opacity: managerForm.is_manager ? 0.5 : 1 }}>Can Send Messages</span>
                </label>
                <label className="perm-check" style={{ display: 'flex', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
                  <input type="checkbox" checked={managerForm.can_pin_messages} onChange={() => setManagerForm({...managerForm, can_pin_messages: !managerForm.can_pin_messages})} disabled={managerForm.is_manager} />
                  <span style={{ opacity: managerForm.is_manager ? 0.5 : 1 }}>Can Pin Messages</span>
                </label>
                <label className="perm-check" style={{ display: 'flex', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={managerForm.can_delete_messages} onChange={() => setManagerForm({...managerForm, can_delete_messages: !managerForm.can_delete_messages})} disabled={managerForm.is_manager} />
                  <span style={{ opacity: managerForm.is_manager ? 0.5 : 1 }}>Can Delete Others' Messages</span>
                </label>
              </div>
            </div>
            
            <div className="modal-footer" style={{ marginTop: '32px' }}>
              <button className="btn-cancel" onClick={() => setShowAssignManagerModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleAssignManager}>Assign</button>
            </div>
          </div>
        </div>
      )}
      
      <div className="admin-content" style={{ overflowY: 'auto', padding: '24px' }}>
        
        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <DashboardTab stats={stats} getRelativeTime={getRelativeTime} />
        )}

        {/* USERS */}
        {activeTab === 'users' && (
          <UsersTab 
            enrichedUsers={enrichedUsers}
            handleImportCSV={handleImportCSV}
            handleExportUsers={handleExportUsers}
            openInviteModal={openInviteModal}
            openCreateUser={openCreateUser}
            handleResetPassword={handleResetPassword}
            handleForceLogout={handleForceLogout}
            openEditUser={openEditUser}
            handleDeactivate={handleDeactivate}
            handleReactivate={handleReactivate}
          />
        )}

        {/* PENDING APPROVALS */}
        {activeTab === 'pending' && (
          <PendingTab 
            pendingUsers={pendingUsers}
            openReviewUser={openReviewUser}
            handleApproveUser={handleApproveUser}
            handleRejectUser={handleRejectUser}
          />
        )}

        {/* ROLE PRESETS */}
        {activeTab === 'presets' && (
          <PresetsTab 
            rolePresets={rolePresets}
            openCreatePreset={() => {
              setEditingPreset(null);
              setPresetForm({ name: '', description: '', permissions: { ...defaultPermissions } });
              setShowPresetModal(true);
            }}
            openEditPreset={(p) => {
              setEditingPreset(p);
              setPresetForm({ name: p.name, description: p.description, permissions: p.permissions });
              setShowPresetModal(true);
            }}
            handleDeletePreset={async (p) => {
              if (window.confirm('Delete preset?')) {
                await api.admin.deleteRolePreset(p.id);
                loadPresets();
              }
            }}
          />
        )}

        {/* CHANNELS */}
        {activeTab === 'channels' && (
          <ChannelsTab 
            localChannels={localChannels}
            handleExportChannels={handleExportChannels}
            setShowCreateChannelModal={setShowCreateChannelModal}
            openEditChannel={openEditChannel}
            handleArchiveChannel={handleArchiveChannel}
          />
        )}

        {/* CHANNEL PERMISSIONS */}
        {activeTab === 'channel_permissions' && (
          <ChannelPermissionsTab 
            channelManagers={channelManagers}
            setShowAssignManagerModal={setShowAssignManagerModal}
            handleRevokeManager={handleRevokeManager}
          />
        )}

        {/* AUDIT LOG */}
        {activeTab === 'audit' && (
          <AuditTab 
            auditSearchQuery={auditSearchQuery}
            setAuditSearchQuery={setAuditSearchQuery}
            auditActionFilter={auditActionFilter}
            setAuditActionFilter={setAuditActionFilter}
            filteredAuditLogs={filteredAuditLogs}
          />
        )}

        {/* BROADCAST */}
        {activeTab === 'broadcast' && (
          <BroadcastTab 
            broadcastType={broadcastType}
            setBroadcastType={setBroadcastType}
            broadcastRecipients={broadcastRecipients}
            setBroadcastRecipients={setBroadcastRecipients}
            broadcastMessage={broadcastMessage}
            setBroadcastMessage={setBroadcastMessage}
            isSending={isSending}
            handleSendBroadcast={handleSendBroadcast}
            broadcastsHistory={broadcastsHistory}
          />
        )}



      </div>

      {showPresetModal && (
        <div className="modal-backdrop active" style={{ zIndex: 9999 }}>
          <div className="big-modal" style={{ position: 'relative', width: '640px' }}>
            <button 
              onClick={() => setShowPresetModal(false)}
              style={{ position: 'absolute', right: '16px', top: '16px', color: 'var(--text-dim)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Settings size={20} /> {editingPreset ? 'Edit Preset' : 'Create new preset'}
            </h3>
            
            <div className="form-field">
              <label>Preset name <span style={{ color: 'var(--danger)' }}>*</span></label>
              <input type="text" placeholder="e.g. Intern" value={presetForm.name} onChange={e => setPresetForm({...presetForm, name: e.target.value})} />
            </div>

            <div className="form-field">
              <label>Description</label>
              <input type="text" placeholder="What does this preset do?" value={presetForm.description} onChange={e => setPresetForm({...presetForm, description: e.target.value})} />
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-mute)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', margin: '20px 0 8px' }}>Permissions Definition</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '16px' }}>Check the permissions this preset should grant.</div>
            
            <div style={{ maxHeight: '300px', overflowY: 'auto', background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px' }}>
              <div className="perm-group-title" style={{ marginTop: 0 }}>💬 Messaging & Posting</div>
              <label className="perm-check"><input type="checkbox" checked={presetForm.permissions['edit-own']} onChange={() => setPresetForm(prev => ({...prev, permissions: {...prev.permissions, 'edit-own': !prev.permissions['edit-own']}}))} /><span>Edit own messages</span></label>
              <label className="perm-check"><input type="checkbox" checked={presetForm.permissions['delete-own']} onChange={() => setPresetForm(prev => ({...prev, permissions: {...prev.permissions, 'delete-own': !prev.permissions['delete-own']}}))} /><span>Delete own messages</span></label>
              <label className="perm-check"><input type="checkbox" checked={presetForm.permissions['react']} onChange={() => setPresetForm(prev => ({...prev, permissions: {...prev.permissions, 'react': !prev.permissions['react']}}))} /><span>Add Emoji Reactions</span></label>
              <label className="perm-check"><input type="checkbox" checked={presetForm.permissions['thread']} onChange={() => setPresetForm(prev => ({...prev, permissions: {...prev.permissions, 'thread': !prev.permissions['thread']}}))} /><span>Reply in Threads</span></label>

              <div className="perm-group-title">✉️ Direct Messaging</div>
              <label className="perm-check"><input type="checkbox" checked={presetForm.permissions['dm-anyone']} onChange={() => setPresetForm(prev => ({...prev, permissions: {...prev.permissions, 'dm-anyone': !prev.permissions['dm-anyone']}}))} /><span>Start DMs with anyone</span></label>
              <label className="perm-check"><input type="checkbox" checked={presetForm.permissions['dm-exec']} onChange={() => setPresetForm(prev => ({...prev, permissions: {...prev.permissions, 'dm-exec': !prev.permissions['dm-exec']}}))} /><span>Start DMs with Executives (C-level)</span></label>
              <label className="perm-check"><input type="checkbox" checked={presetForm.permissions['dm-ceo']} onChange={() => setPresetForm(prev => ({...prev, permissions: {...prev.permissions, 'dm-ceo': !prev.permissions['dm-ceo']}}))} /><span>Can initiate DMs with CEO</span></label>
              <label className="perm-check"><input type="checkbox" checked={presetForm.permissions['group-dm']} onChange={() => setPresetForm(prev => ({...prev, permissions: {...prev.permissions, 'group-dm': !prev.permissions['group-dm']}}))} /><span>Create Group DMs (up to 9 people)</span></label>

              <div className="perm-group-title">🔔 Mentions & Notifications</div>
              <label className="perm-check"><input type="checkbox" checked={presetForm.permissions['at-user']} onChange={() => setPresetForm(prev => ({...prev, permissions: {...prev.permissions, 'at-user': !prev.permissions['at-user']}}))} /><span>Mention specific users (@user)</span></label>
              <label className="perm-check"><input type="checkbox" checked={presetForm.permissions['at-here']} onChange={() => setPresetForm(prev => ({...prev, permissions: {...prev.permissions, 'at-here': !prev.permissions['at-here']}}))} /><span>Mention active users (@here)</span></label>
              <label className="perm-check"><input type="checkbox" checked={presetForm.permissions['at-channel']} onChange={() => setPresetForm(prev => ({...prev, permissions: {...prev.permissions, 'at-channel': !prev.permissions['at-channel']}}))} /><span>Mention all channel members (@channel)</span></label>
              <label className="perm-check"><input type="checkbox" checked={presetForm.permissions['at-everyone']} onChange={() => setPresetForm(prev => ({...prev, permissions: {...prev.permissions, 'at-everyone': !prev.permissions['at-everyone']}}))} /><span>Mention everyone in workspace (@everyone)</span></label>

              <div className="perm-group-title">📎 Attachments</div>
              <label className="perm-check"><input type="checkbox" checked={presetForm.permissions['upload']} onChange={() => setPresetForm(prev => ({...prev, permissions: {...prev.permissions, 'upload': !prev.permissions['upload']}}))} /><span>Upload files (up to 25MB)</span></label>
              <label className="perm-check"><input type="checkbox" checked={presetForm.permissions['upload-large']} onChange={() => setPresetForm(prev => ({...prev, permissions: {...prev.permissions, 'upload-large': !prev.permissions['upload-large']}}))} /><span>Upload large files (up to 2GB)</span></label>
              <div className="perm-group-title">🏗️ Workspace Management</div>
              <label className="perm-check"><input type="checkbox" checked={presetForm.permissions['create-public']} onChange={() => setPresetForm(prev => ({...prev, permissions: {...prev.permissions, 'create-public': !prev.permissions['create-public']}}))} /><span>Create Public Channels</span></label>
              <label className="perm-check"><input type="checkbox" checked={presetForm.permissions['create-private']} onChange={() => setPresetForm(prev => ({...prev, permissions: {...prev.permissions, 'create-private': !prev.permissions['create-private']}}))} /><span>Create Private Channels</span></label>
              <label className="perm-check"><input type="checkbox" checked={presetForm.permissions['create-announcement']} onChange={() => setPresetForm(prev => ({...prev, permissions: {...prev.permissions, 'create-announcement': !prev.permissions['create-announcement']}}))} /><span>Create Announcement Channels</span></label>
              <label className="perm-check"><input type="checkbox" checked={presetForm.permissions['invite-guest']} onChange={() => setPresetForm(prev => ({...prev, permissions: {...prev.permissions, 'invite-guest': !prev.permissions['invite-guest']}}))} /><span>Invite Guests to workspace</span></label>
              <label className="perm-check"><input type="checkbox" checked={presetForm.permissions['join-any']} onChange={() => setPresetForm(prev => ({...prev, permissions: {...prev.permissions, 'join-any': !prev.permissions['join-any']}}))} /><span>Join any Private Channel without invite</span></label>
              <label className="perm-check"><input type="checkbox" checked={presetForm.permissions['be-manager']} onChange={() => setPresetForm(prev => ({...prev, permissions: {...prev.permissions, 'be-manager': !prev.permissions['be-manager']}}))} /><span>Can be assigned as Channel Manager</span></label>

              <div className="perm-group-title">📂 Data & Privacy</div>
              <label className="perm-check"><input type="checkbox" checked={presetForm.permissions['search-history']} onChange={() => setPresetForm(prev => ({...prev, permissions: {...prev.permissions, 'search-history': !prev.permissions['search-history']}}))} /><span>Search all workspace history (eDiscovery)</span></label>
            </div>
            
            <div className="modal-footer" style={{ marginTop: '32px' }}>
              <button className="btn-cancel" onClick={() => setShowPresetModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={async () => {
                if (!presetForm.name.trim()) return alert('Name is required');
                if (editingPreset) {
                  await api.admin.updateRolePreset(editingPreset.id, presetForm);
                } else {
                  await api.admin.createRolePreset(presetForm);
                }
                setShowPresetModal(false);
                loadPresets();
              }}>{editingPreset ? 'Save Changes' : 'Create Preset'}</button>
            </div>
          </div>
        </div>
      )}
      {showInviteModal && (
        <div className="modal-backdrop active" onClick={() => setShowInviteModal(false)} style={{ zIndex: 9999 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: '400px' }}>
            <h2>Invite Guest</h2>
            <div style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '16px' }}>Generate a secure invitation link to allow an external guest to join ETeams.</div>
            
            <div className="form-field">
              <label>Guest Email Address</label>
              <input type="email" placeholder="guest@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            </div>

            {inviteLink && (
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--emerald)', borderRadius: '8px', padding: '16px', marginTop: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--emerald)', marginBottom: '8px' }}>Invitation Link Generated!</div>
                <input type="text" readOnly value={inviteLink} style={{ width: '100%', padding: '8px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text)' }} onClick={e => e.target.select()} />
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '8px' }}>Copy and send this link to the guest.</div>
              </div>
            )}

            <div className="modal-footer" style={{ marginTop: '24px' }}>
              <button className="btn-cancel" onClick={() => setShowInviteModal(false)}>Close</button>
              {!inviteLink && <button className="btn-primary" onClick={submitInviteGuest}>Generate Link</button>}
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
