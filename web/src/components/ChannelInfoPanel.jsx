import React, { useEffect, useState } from 'react';
import { Hash, Lock, Megaphone, User, Settings, X, Plus, Clock, Info, Users, Shield, LogOut, UserMinus, Download } from 'lucide-react';
import { api } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import MemberPermissionsModal from './MemberPermissionsModal';
import Avatar from './Avatar';
import ChannelIcon from './ChannelIcon';

export default function ChannelInfoPanel({ channel, onClose, onLeft }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const confirm = useConfirm();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  const handleExport = async () => {
    try {
      setExportLoading(true);
      const blob = await api.channels.export(channel.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${channel.slug || channel.name}-export.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Export failed');
    } finally {
      setExportLoading(false);
    }
  };

  const fetchMembers = () => {
    if (!channel) return;
    setLoading(true);
    api.channels.get(channel.slug).then(res => {
      setMembers(res.members || []);
      setLoading(false);
    }).catch(console.error);
  };

  useEffect(() => {
    fetchMembers();
  }, [channel]);

  const handleToggleAddMember = async () => {
    if (!showAddMember) {
      try {
        const res = await api.users.list();
        setAllUsers(res.users || []);
      } catch (err) {
        console.error(err);
      }
    }
    setShowAddMember(!showAddMember);
  };

  const handleSelectAll = () => {
    const availableUsers = allUsers.filter(u => !members.find(m => m.id === u.id));
    if (selectedUsers.size === availableUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(availableUsers.map(u => u.id)));
    }
  };

  const handleToggleUser = (userId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleAddMember = async () => {
    if (selectedUsers.size === 0) return;
    setIsAddingMember(true);
    try {
      for (const userId of selectedUsers) {
        await api.channels.addMember(channel.id, userId);
      }
      setShowAddMember(false);
      setSelectedUsers(new Set());
      fetchMembers(); // refresh list
    } catch (err) {
      alert(err.message || 'Error adding members');
    } finally {
      setIsAddingMember(false);
    }
  };
  const handleLeaveChannel = async () => {
    const ok = await confirm({ title: 'Leave Channel', message: `Are you sure you want to leave #${channel?.name}?` });
    if (!ok) return;
    try {
      await api.channels.leave(channel.id);
      onClose();
      if (onLeft) onLeft();
    } catch (err) {
      alert(err.message || 'Failed to leave channel');
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    const ok = await confirm({ title: 'Remove Member', message: `Remove ${memberName} from #${channel?.name}?`, isDanger: true });
    if (!ok) return;
    try {
      await api.channels.removeMember(channel.id, memberId);
      fetchMembers();
    } catch (err) {
      alert(err.message || 'Failed to remove member');
    }
  };

  const getIcon = (size = 20) => {
    return <ChannelIcon type={channel?.type} name={channel?.name} color={channel?.color} size={size} />;
  };

  const currentUserMem = members.find(m => m.id === user?.id);
  const isManager = (!!currentUserMem?.is_manager && currentUserMem.is_manager !== 0 && currentUserMem.is_manager !== false) || user?.role === 'superadmin';

  return (
    <div className="thread-panel info-panel" style={{ width: '420px', minWidth: '420px', background: 'var(--panel)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--panel-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600', fontSize: '15px', color: 'var(--text)' }}>
          <div style={{ background: 'var(--bg-hover)', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {getIcon(18)}
          </div>
          {channel?.name}
        </div>
        <button className="icon-btn" onClick={onClose} style={{ background: 'var(--bg-hover)', borderRadius: '50%' }}><X size={18} /></button>
      </div>

      <div className="right-scroll" style={{ padding: '24px 20px', overflowY: 'auto', flex: 1 }}>
        {/* Actions Card */}
        <div style={{ 
          background: 'var(--panel-2)', borderRadius: '12px', padding: '16px', marginBottom: '24px',
          border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '8px'
        }}>
          <button onClick={handleExport} disabled={exportLoading} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', cursor: exportLoading ? 'default' : 'pointer', fontWeight: '600', transition: 'background 0.2s' }} onMouseEnter={e => !exportLoading && (e.currentTarget.style.background = 'var(--bg-hover)')} onMouseLeave={e => !exportLoading && (e.currentTarget.style.background = 'var(--panel)')}>
            <Download size={18} style={{ color: '#3BA7D6' }} />
            <span style={{ flex: 1, textAlign: 'left' }}>{exportLoading ? 'Exporting...' : 'Export Chat (Visual HTML)'}</span>
          </button>
        </div>

        {/* About Card */}
        <div style={{ 
          background: 'var(--panel-2)', 
          borderRadius: '12px', 
          padding: '20px', 
          marginBottom: '24px',
          border: '1px solid var(--border)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          <h4 style={{ marginBottom: '12px', color: 'var(--text-dim)', fontSize: '12px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', letterSpacing: '0.5px' }}>
            <Info size={14} /> About Channel
          </h4>
          <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text)', marginBottom: '16px' }}>
            {channel?.description || 'No description provided for this channel.'}
          </p>
          <div style={{ paddingTop: '16px', borderTop: '1px dashed var(--border)', fontSize: '12px', color: 'var(--text-mute)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={14} /> Created {new Date(channel?.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
          </div>
        </div>

        {/* Members Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h4 style={{ color: 'var(--text-dim)', fontSize: '12px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', letterSpacing: '0.5px' }}>
            <Users size={14} /> Members
          </h4>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', background: 'var(--panel-2)', padding: '2px 8px', borderRadius: '12px', color: 'var(--text-dim)', border: '1px solid var(--border)' }}>
              {members.length} Total
            </span>
            {(isManager || !!currentUserMem?.can_add_members) && (
              <button onClick={handleToggleAddMember} style={{ background: 'var(--bg-hover)', color: 'var(--text)', border: 'none', borderRadius: '4px', padding: '2px 8px', fontSize: '12px', cursor: 'pointer' }}>
                + Add
              </button>
            )}
          </div>
        </div>

        {showAddMember && (
          <div style={{ background: 'var(--panel-2)', border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Select users to add:</div>
              <button 
                onClick={handleSelectAll} 
                disabled={isAddingMember}
                style={{ background: 'var(--panel)', color: 'var(--text)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
              >
                {selectedUsers.size > 0 && selectedUsers.size === allUsers.filter(u => !members.find(m => m.id === u.id)).length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto', marginBottom: '12px', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px' }}>
              {allUsers.filter(u => !members.find(m => m.id === u.id)).length === 0 ? (
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center', padding: '8px' }}>No users available</div>
              ) : (
                allUsers.filter(u => !members.find(m => m.id === u.id)).map(u => (
                  <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedUsers.has(u.id)} 
                      onChange={() => handleToggleUser(u.id)} 
                      disabled={isAddingMember}
                    />
                    <span style={{ fontSize: '13px', color: 'var(--text)' }}>{u.name} ({u.username})</span>
                  </label>
                ))
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={handleAddMember} 
                disabled={isAddingMember || selectedUsers.size === 0}
                style={{ background: 'var(--emerald)', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '4px', cursor: selectedUsers.size === 0 ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 'bold', opacity: selectedUsers.size === 0 || isAddingMember ? 0.5 : 1 }}
              >
                {isAddingMember ? 'Adding...' : `Add (${selectedUsers.size})`}
              </button>
            </div>
          </div>
        )}

        {/* Members List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
            <div className="loader" style={{ width: '20px', height: '20px', border: '2px solid var(--border)', borderTopColor: 'var(--emerald)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {members.map(m => (
              <div key={m.id} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                padding: '10px 12px', 
                borderRadius: '8px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Avatar user={m} size={36} showPresence={true} style={{ borderRadius: '50%', flexShrink: 0 }} />
                
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.name}
                    </span>
                    {m.is_manager ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '9px', background: 'rgba(59, 167, 214, 0.15)', color: '#3BA7D6', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: '700' }}>
                        <Shield size={10} /> Admin
                      </span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                    {m.job_title || m.role}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  {/* Permissions button */}
                  {isManager && (
                    <button
                      title={`Edit ${m.name}'s Role`}
                      onClick={() => setEditingMember(m)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
                    >
                      <Settings size={14} />
                    </button>
                  )}
                  {/* Remove member button - show only if not self and user is manager/admin */}
                  {m.id !== user?.id && (isManager || !!currentUserMem?.can_remove_members) && (
                    <button
                      title={`Remove ${m.name}`}
                      onClick={() => handleRemoveMember(m.id, m.name)}
                      style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                    >
                      <UserMinus size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leave channel button - not for announcement channels */}
      {channel?.type !== 'announcement' && (
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={handleLeaveChannel}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
          >
            <LogOut size={14} /> Leave Channel
          </button>
        </div>
      )}

      {/* Permissions Modal */}
      {editingMember && (
        <MemberPermissionsModal
          isOpen={true}
          onClose={() => setEditingMember(null)}
          channel={channel}
          member={editingMember}
          onPermissionsUpdated={(memberId, newPerms) => {
            setMembers(prev => prev.map(m => m.id === memberId ? { ...m, ...newPerms } : m));
          }}
        />
      )}
    </div>
  );
}
