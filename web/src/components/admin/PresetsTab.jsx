import React from 'react';

export default function PresetsTab({
  rolePresets,
  openCreatePreset,
  openEditPreset,
  handleDeletePreset
}) {
  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Role Presets</h2>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input type="text" className="admin-search-inp" placeholder="Search presets by name or description..." />
        <button className="admin-btn-ghost">Export list</button>
        <button className="admin-btn-primary" onClick={openCreatePreset}>+ Create Preset</button>
      </div>
      
      <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '10px' }}>
        Presets are templates of permissions you can assign to users when creating or editing them.
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'var(--panel-2)', borderRadius: '12px', overflow: 'hidden' }}>
        <thead style={{ background: 'var(--panel)' }}>
          <tr>
            <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Preset Name</th>
            <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Description</th>
            <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>System</th>
            <th style={{ padding: '12px', fontSize: '12px', color: 'var(--text-mute)' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rolePresets.map((p, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'var(--panel)', color: 'var(--blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ fontWeight: '500', fontSize: '14px' }}>{p.name}</div>
                </div>
              </td>
              <td style={{ padding: '12px', color: 'var(--text-dim)' }}>{p.description}</td>
              <td style={{ padding: '12px' }}>
                {p.is_system ? <span style={{ display: 'inline-block', background: 'rgba(236,72,153,0.1)', color: 'var(--pink)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>System Built-in</span> : <span style={{ display: 'inline-block', background: 'rgba(16,185,129,0.1)', color: 'var(--emerald)', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>Custom</span>}
              </td>
              <td style={{ padding: '12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="admin-btn-ghost" onClick={() => openEditPreset(p)} style={{ padding: '4px 8px', fontSize: '11px' }}>Edit</button>
                  {!p.is_system && <button onClick={() => handleDeletePreset(p)} className="admin-btn-danger" style={{ padding: '4px 8px', fontSize: '11px' }}>Delete</button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
