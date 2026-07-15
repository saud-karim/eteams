import React from 'react';
import { UserCheck, CheckCircle, XCircle } from 'lucide-react';
import Avatar from '../Avatar';

export default function PendingTab({ pendingUsers, openReviewUser, handleApproveUser, handleRejectUser }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2>Pending Approvals</h2>
          <div className="msub">Review and approve new signups to grant them access to the workspace.</div>
        </div>
      </div>

      {pendingUsers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-dim)', background: 'var(--panel-2)', borderRadius: '12px', marginTop: '20px' }}>
          <CheckCircle size={48} style={{ marginBottom: '16px', opacity: 0.3 }} />
          <div style={{ fontSize: '16px', fontWeight: '500' }}>No pending signups</div>
          <div style={{ fontSize: '13px', marginTop: '4px', opacity: 0.7 }}>All registration requests have been processed.</div>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'var(--panel-2)', borderRadius: '12px', overflow: 'hidden' }}>
          <thead style={{ background: 'var(--panel)' }}>
            <tr>
              <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>User</th>
              <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Department</th>
              <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Employment Type</th>
              <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pendingUsers.map((u, idx) => (
              <tr key={u.id} style={{ borderBottom: idx !== pendingUsers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Avatar user={u} name={u.name} initials={u.avatar_initials} color={u.avatar_color} size={32} style={{ borderRadius: '50%' }} />
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '14px' }}>{u.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{u.username}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '12px', color: 'var(--text-dim)', fontSize: '13px' }}>{u.department || '—'}</td>
                <td style={{ padding: '12px', color: 'var(--text-dim)', fontSize: '13px' }}>{u.employment_type || '—'}</td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="admin-btn-ghost" onClick={() => openReviewUser(u)} style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--blue)' }}>Review & Edit</button>
                    <button className="admin-btn-ghost" onClick={() => handleApproveUser(u.id, null)} style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--emerald)' }}>Approve</button>
                    <button className="admin-btn-ghost" onClick={() => handleRejectUser(u.id)} style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--danger)' }}>Reject</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
