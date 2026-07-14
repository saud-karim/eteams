import React from 'react';

export default function ChannelsTab({
  localChannels,
  handleExportChannels,
  setShowCreateChannelModal,
  openEditChannel,
  handleArchiveChannel
}) {
  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Channels & Permissions</h2>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input type="text" className="admin-search-inp" placeholder="Search channels..." />
        <button className="admin-btn-ghost" onClick={handleExportChannels}>Export list</button>
        <button className="admin-btn-primary" onClick={() => setShowCreateChannelModal(true)}>+ Create Channel</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'var(--panel-2)', borderRadius: '12px', overflow: 'hidden' }}>
        <thead style={{ background: 'var(--panel)' }}>
          <tr>
            <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Channel</th>
            <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Type</th>
            <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Members</th>
            <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Read Only</th>
            <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Messages</th>
            <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {localChannels.map((c, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '12px', fontWeight: 'bold', color: 'var(--accent)' }}>#{c.name}</td>
              <td style={{ padding: '12px' }}>
                <span style={{ display: 'inline-block', background: c.type === 'announce' ? 'rgba(234,179,8,0.1)' : c.type === 'private' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)', color: c.type === 'announce' ? 'var(--amber)' : c.type === 'private' ? 'var(--danger)' : 'var(--blue)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', textTransform: 'capitalize' }}>
                  {c.type}
                </span>
              </td>
              <td style={{ padding: '12px', color: 'var(--text-dim)' }}>{c.member_count}</td>
              <td style={{ padding: '12px', color: 'var(--text-dim)' }}>{c.is_readonly ? 'Yes' : 'No'}</td>
              <td style={{ padding: '12px', color: 'var(--text-dim)' }}>{c.message_count}</td>
              <td style={{ padding: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="admin-btn-ghost" onClick={() => openEditChannel(c)} style={{ padding: '4px 8px', fontSize: '11px' }}>Edit</button>
                  <button className="admin-btn-danger" onClick={() => handleArchiveChannel(c)} style={{ padding: '4px 8px', fontSize: '11px', background: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)' }}>Archive</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
