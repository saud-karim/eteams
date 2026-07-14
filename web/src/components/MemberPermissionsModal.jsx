import React, { useState } from 'react';
import { X, Shield, MessageSquare, Pin, Trash2, UserPlus, UserMinus } from 'lucide-react';
import { api } from '../api/client';

export default function MemberPermissionsModal({ isOpen, onClose, channel, member, onPermissionsUpdated }) {
  const [permissions, setPermissions] = useState({
    is_manager: !!member.is_manager && member.is_manager !== 0,
    can_post: !!member.can_post && member.can_post !== 0,
    can_pin_messages: !!member.can_pin_messages && member.can_pin_messages !== 0,
    can_delete_messages: !!member.can_delete_messages && member.can_delete_messages !== 0,
    can_add_members: !!member.can_add_members && member.can_add_members !== 0,
    can_remove_members: !!member.can_remove_members && member.can_remove_members !== 0,
  });

  const [saving, setSaving] = useState(false);

  const togglePerm = (key) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.channels.updateMemberPermissions(channel.id, member.id, permissions);
      onPermissionsUpdated(member.id, permissions);
      onClose();
    } catch (e) {
      alert(e.error || 'Failed to update permissions');
    }
    setSaving(false);
  };

  return (
    <div className="modal-backdrop active" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="big-modal" style={{ width: '400px', position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
        
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', color: 'var(--text)' }}>Edit Role: {member.name}</h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Admin Rights */}
          <div style={{ background: 'var(--panel-2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text)', fontWeight: 'bold' }}>
              <Shield size={18} style={{ color: '#F59E0B' }}/>
              Channel Management
            </div>
            <label className="perm-check" style={{ display: 'flex', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
              <input type="checkbox" checked={permissions.is_manager} onChange={() => togglePerm('is_manager')} />
              <span>Channel Manager (Full Access)</span>
            </label>
            <label className="perm-check" style={{ display: 'flex', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
              <input type="checkbox" checked={permissions.can_add_members} onChange={() => togglePerm('can_add_members')} disabled={permissions.is_manager} />
              <span style={{ opacity: permissions.is_manager ? 0.5 : 1 }}>Can Add Members</span>
            </label>
            <label className="perm-check" style={{ display: 'flex', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={permissions.can_remove_members} onChange={() => togglePerm('can_remove_members')} disabled={permissions.is_manager} />
              <span style={{ opacity: permissions.is_manager ? 0.5 : 1 }}>Can Remove Members</span>
            </label>
          </div>

          {/* Messaging Rights */}
          <div style={{ background: 'var(--panel-2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text)', fontWeight: 'bold' }}>
              <MessageSquare size={18} style={{ color: '#10B981' }}/>
              Messaging & Moderation
            </div>
            <label className="perm-check" style={{ display: 'flex', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
              <input type="checkbox" checked={permissions.can_post} onChange={() => togglePerm('can_post')} disabled={permissions.is_manager} />
              <span style={{ opacity: permissions.is_manager ? 0.5 : 1 }}>Can Send Messages</span>
            </label>
            <label className="perm-check" style={{ display: 'flex', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
              <input type="checkbox" checked={permissions.can_pin_messages} onChange={() => togglePerm('can_pin_messages')} disabled={permissions.is_manager} />
              <span style={{ opacity: permissions.is_manager ? 0.5 : 1 }}>Can Pin Messages</span>
            </label>
            <label className="perm-check" style={{ display: 'flex', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={permissions.can_delete_messages} onChange={() => togglePerm('can_delete_messages')} disabled={permissions.is_manager} />
              <span style={{ opacity: permissions.is_manager ? 0.5 : 1 }}>Can Delete Others' Messages</span>
            </label>
          </div>

        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
}
