import React from 'react';
import { Shield } from 'lucide-react';

export default function DashboardTab({ stats, getRelativeTime }) {
  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi"><div className="label">Total users</div><div className="value">{stats.totalUsers || 0}</div><div className="delta" style={{ color: 'var(--text-mute)' }}>Registered accounts</div></div>
        <div className="kpi"><div className="label">Active sessions</div><div className="value">{stats.activeSessions || 0}</div><div className="delta">Currently online</div></div>
        <div className="kpi"><div className="label">Total messages</div><div className="value">{stats.totalMessages || 0}</div><div className="delta" style={{ color: 'var(--text-mute)' }}>All time</div></div>
        <div className="kpi"><div className="label">Channels</div><div className="value">{stats.totalChannels || 0}</div><div className="delta" style={{ color: 'var(--text-mute)' }}>Public & Private</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>🔥 Most active channels this week</div>
          {(!stats.mostActiveChannels || stats.mostActiveChannels.length === 0) ? (
            <div style={{ color: 'var(--text-mute)', fontSize: '12px' }}>No active channels recently.</div>
          ) : stats.mostActiveChannels.map((ch, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
              <span style={{ fontWeight: 'bold' }}>{ch.n}</span>
              <span style={{ color: 'var(--text-dim)' }}>{ch.msgs} msgs • {ch.reacts} reactions</span>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px' }}>⚡ Recent admin actions</div>
          {(!stats.recentAdminActions || stats.recentAdminActions.length === 0) ? (
            <div style={{ color: 'var(--text-mute)', fontSize: '12px' }}>No recent actions.</div>
          ) : stats.recentAdminActions.map((act, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
              <span><Shield size={16} color="var(--emerald)" /></span>
              <span style={{ flex: 1 }}>
                <strong>{act.actor_name}</strong> performed <code>{act.action}</code>
              </span>
              <span style={{ color: 'var(--text-mute)', fontSize: '11px', whiteSpace: 'nowrap' }}>{getRelativeTime(act.created_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
