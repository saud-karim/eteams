import React from 'react';
import Avatar from '../Avatar';

export default function UsersTab({
  enrichedUsers,
  handleImportCSV,
  handleExportUsers,
  openInviteModal,
  openCreateUser,
  handleResetPassword,
  handleForceLogout,
  openEditUser,
  handleDeactivate,
  handleReactivate
}) {
  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>User Management</h2>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input type="text" className="admin-search-inp" placeholder="Search users by name, email, or department..." />
        <label className="admin-btn-ghost" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          Import from HR CSV
          <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCSV} />
        </label>
        <button className="admin-btn-ghost" onClick={handleExportUsers}>Export list</button>

        <button className="admin-btn-primary" onClick={openInviteModal}>+ Invite Guest</button>
        <button className="admin-btn-primary" onClick={openCreateUser}>+ Create user</button>
      </div>
      
      <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '10px' }}>
        Showing {enrichedUsers.length} of 487 users • <a style={{ color: 'var(--emerald)', cursor: 'pointer' }}>View all</a>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'var(--panel-2)', borderRadius: '12px', overflow: 'hidden' }}>
        <thead style={{ background: 'var(--panel)' }}>
          <tr>
            <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>User</th>
            <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Department</th>
            <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Role</th>
            <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Status</th>
            <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Last active</th>
            <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {enrichedUsers.map((u, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Avatar user={u} size={32} style={{ borderRadius: '50%' }} />
                  <div>
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>{u.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{u.email}</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: '12px', color: 'var(--text-dim)' }}>{u.dept}</td>
              <td style={{ padding: '12px' }}>
                <span style={{ display: 'inline-block', background: u.role === 'superadmin' ? 'rgba(236,72,153,0.1)' : 'rgba(59,130,246,0.1)', color: u.role === 'superadmin' ? 'var(--pink)' : 'var(--blue)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {u.role === 'superadmin' ? 'Superadmin' : 'User'}
                </span>
              </td>
              <td style={{ padding: '12px' }}>
                <span style={{ display: 'inline-block', background: !u.is_active ? 'rgba(239,68,68,0.1)' : u.presence !== 'offline' ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)', color: !u.is_active ? 'var(--danger)' : u.presence !== 'offline' ? 'var(--emerald)' : 'var(--text-mute)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                  {!u.is_active ? 'Deactivated' : (u.presence === 'online' ? 'Online' : 'Offline')}
                </span>
              </td>
              <td style={{ padding: '12px', fontSize: '12px', color: 'var(--text-dim)' }}>{u.last}</td>
              <td style={{ padding: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="admin-btn-ghost" onClick={() => handleResetPassword(u)} style={{ padding: '4px 8px', fontSize: '11px' }}>Reset Pass</button>
                  <button className="admin-btn-ghost" onClick={() => handleForceLogout(u)} style={{ padding: '4px 8px', fontSize: '11px' }}>Logout</button>
                  <button className="admin-btn-ghost" onClick={() => openEditUser(u)} style={{ padding: '4px 8px', fontSize: '11px' }}>Edit</button>
                  {u.role !== 'superadmin' && (
                    u.is_active ? (
                      <button onClick={() => handleDeactivate(u)} className="admin-btn-danger" style={{ padding: '4px 8px', fontSize: '11px' }}>Deactivate</button>
                    ) : (
                      <button onClick={() => handleReactivate(u)} className="admin-btn-outline" style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--emerald)', borderColor: 'var(--emerald)' }}>Reactivate</button>
                    )
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
