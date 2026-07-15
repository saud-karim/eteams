import React from 'react';
import { Shield } from 'lucide-react';

export default function ChannelPermissionsTab({
  channelManagers,
  setShowAssignManagerModal,
  handleRevokeManager
}) {
  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Channel Permissions</h2>
      <div style={{ marginTop: '32px' }}>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}><Shield size={16} /> Permission model</div>
          <div style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: '1.6' }}>Two roles only: <b style={{ color: 'var(--emerald)' }}>Superadmin</b> (you) with full control, and <b>User</b> for everyone else. Channel-level rights are delegated per user per channel using templates or custom checkboxes — you can revoke anytime.</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', marginTop: '24px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold' }}>Active Channel Manager assignments</h3>
          <button className="admin-btn-primary" onClick={() => setShowAssignManagerModal(true)}>+ Assign Manager</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'var(--panel-2)', borderRadius: '12px', overflow: 'hidden' }}>
          <thead style={{ background: 'var(--panel)' }}>
            <tr>
              <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>User</th>
              <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Channel</th>
              <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Template</th>
              <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Permissions granted</th>
              <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Assigned</th>
              <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {channelManagers.map((a, i) => {
              let perms = [];
              if (a.is_manager || a.can_post) perms.push('post');
              if (a.is_manager || a.can_add_members || a.can_remove_members) perms.push('manage members');
              if (a.is_manager || a.can_pin_messages) perms.push('pin');
              if (a.is_manager || a.can_edit_topic) perms.push('edit topic');
              if (a.is_manager || a.can_delete_messages) perms.push('delete');

              let tpl = 'Custom';
              if (perms.length === 5) tpl = 'Full Manager';
              else if (perms.includes('delete') && !perms.includes('manage members')) tpl = 'Moderator';
              else if (perms.length === 1 && perms[0] === 'post') tpl = 'Poster Only';
              else if (perms.length === 0) tpl = 'Read-Only / Muted';
              
              return (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{a.u}</td>
                  <td style={{ padding: '12px', color: 'var(--emerald)', fontWeight: '500' }}>#{a.ch}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ display: 'inline-block', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--emerald)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>{tpl}</span>
                  </td>
                  <td style={{ padding: '12px', fontSize: '12px', color: 'var(--text-dim)' }}>{perms.join(' • ')}</td>
                  <td style={{ padding: '12px', fontSize: '12px', color: 'var(--text-dim)' }}>{new Date(a.when).toLocaleDateString()}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="admin-btn-ghost" style={{ padding: '4px 8px' }}>Edit</button>
                      <button className="admin-btn-danger" onClick={() => handleRevokeManager(a.channel_id, a.user_id)} style={{ padding: '4px 8px' }}>Revoke</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
