import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Avatar from './Avatar';

const isCEO = (u) => u.department?.toLowerCase() === 'ceo';
const isExec = (u) => u.role_preset === 'executive' || u.role === 'superadmin' || u.department?.toLowerCase() === 'executive';

export default function NewDmModal({ onClose, onDMCreated }) {
  const { t } = useLanguage();
  const { users } = useWorkspace();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const [selectedUsers, setSelectedUsers] = useState([]);
  const perms = user?.permissions || {};
  const isSuperadmin = user?.role === 'superadmin';
  const canDMAnyone = isSuperadmin || perms['dm-anyone'];
  const canDMExec = isSuperadmin || perms['dm-exec'];
  const canDMCEO = isSuperadmin || perms['dm-ceo'];
  const canGroupDM = isSuperadmin || perms['group-dm'];

  const filteredUsers = users.filter(u => {
    if (u.id === user?.id) return false;
    
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    const isUCEO = isCEO(u);
    const isUExec = isExec(u);

    if (isUCEO && !canDMCEO) return false;
    if (isUExec && !canDMExec) return false;

    return true;
  });

  const handleToggleUser = (u) => {
    if (!canDMAnyone) return alert("You don't have permission to start direct messages.");
    
    const isUCEO = isCEO(u);
    const isUExec = isExec(u);
    
    if (isUCEO && !canDMCEO) return alert("You don't have permission to message the CEO directly.");
    if (isUExec && !canDMExec) return alert("You don't have permission to message executives directly.");
    
    if (selectedUsers.some(su => su.id === u.id)) {
      setSelectedUsers(selectedUsers.filter(su => su.id !== u.id));
    } else {
      if (!canGroupDM && selectedUsers.length >= 1) return alert("You don't have permission to create group DMs.");
      if (selectedUsers.length >= 9) return;
      setSelectedUsers([...selectedUsers, u]);
    }
  };

  const handleSubmit = async () => {
    if (selectedUsers.length === 0) return;
    setLoading(true);
    try {
      const targetUserIds = selectedUsers.map(u => u.id);
      const res = await api.channels.createDM(targetUserIds);
      onDMCreated(res.channel.slug);
      onClose();
    } catch (err) {
      alert(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop active" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="big-modal" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', right: '16px', top: '16px', color: 'var(--text-dim)', background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
        <h2 style={{ marginBottom: '24px' }}>{t('newDirectMessage') || 'New Direct Message'}</h2>
        
        <div style={{ padding: '0', background: 'var(--bg-elevated)', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
          
          {selectedUsers.length > 0 && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {selectedUsers.map(su => (
                <div key={su.id} style={{ background: 'var(--panel-2)', padding: '4px 10px', borderRadius: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {su.name}
                  <X size={14} style={{ cursor: 'pointer', color: 'var(--text-dim)' }} onClick={() => handleToggleUser(su)} />
                </div>
              ))}
            </div>
          )}

          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ color: 'var(--text-dim)', marginRight: '8px' }} />
            <input 
              type="text" 
              placeholder={t('searchUsers') || 'Search people...'} 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)' }}
              autoFocus
            />
          </div>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {filteredUsers.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)' }}>
                No users found.
              </div>
            ) : (
              filteredUsers.map(u => {
                const isSelected = selectedUsers.some(su => su.id === u.id);
                return (
                  <div 
                    key={u.id} 
                    className="nav-item dm-item" 
                    onClick={() => handleToggleUser(u)}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '12px 16px', gap: '12px', transition: 'background 0.2s', background: isSelected ? 'var(--bg-hover)' : 'transparent' }}
                  >
                    <Avatar user={u} size={32} className="avatar" style={{ borderRadius: '4px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <span style={{ fontWeight: '500' }}>{u.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{u.role || 'Member'}</span>
                    </div>
                    <div>
                       <input type="checkbox" checked={isSelected} readOnly />
                    </div>
                  </div>
                );
              })
            )}
          </div>
          
          {selectedUsers.length > 0 && (
            <div style={{ padding: '16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={handleSubmit} disabled={loading || selectedUsers.length > 9}>
                {loading ? 'Creating...' : `Create DM (${selectedUsers.length})`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
