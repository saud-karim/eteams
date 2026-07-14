import React from 'react';
import { Lock, Download, Info, AlertTriangle, XCircle } from 'lucide-react';

export default function AuditTab({
  auditSearchQuery,
  setAuditSearchQuery,
  auditActionFilter,
  setAuditActionFilter,
  filteredAuditLogs
}) {
  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>Immutable Audit Log</h2>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
        <input type="text" className="admin-search-inp" placeholder="Search actions, users, IPs..." value={auditSearchQuery} onChange={e => setAuditSearchQuery(e.target.value)} />
        <select className="admin-search-inp" style={{ maxWidth: '180px', flex: '0 0 auto' }} value={auditActionFilter} onChange={e => setAuditActionFilter(e.target.value)}>
          <option>All action types</option>
          <option>User management</option>
          <option>Channel management</option>
          <option>Message deletions</option>
        </select>
        <button className="admin-btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Download size={16} /> Export log
        </button>
      </div>
      <div style={{ background: 'var(--panel-2)', padding: '10px 14px', borderRadius: '8px', fontSize: '12px', color: 'var(--text-dim)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Lock size={14} color="var(--emerald)" />
        <span><b>Immutable log</b> — every superadmin action is recorded permanently. Retention: forever.</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredAuditLogs.length > 0 ? filteredAuditLogs.map((log, idx) => {
          let icon = <Info size={18} color="var(--emerald)" />;
          let cssClass = 'normal';
          if (log.action.includes('delete') || log.action.includes('force_logout') || log.action.includes('deactivate')) {
            icon = <XCircle size={18} color="var(--danger)" />;
            cssClass = 'danger';
          } else if (log.action.includes('export') || log.action.includes('reset')) {
            icon = <AlertTriangle size={18} color="var(--amber)" />;
            cssClass = 'warn';
          }

          return (
            <div key={idx} className={`audit-item ${cssClass}`}>
              <div className="a-icon">{icon}</div>
              <div className="a-body">
                <div className="a-action"><b>{log.actor_name}</b> performed <b>{log.action}</b> on {log.entity_type} {log.entity_id}</div>
                <div className="a-meta">{log.metadata ? JSON.stringify(log.metadata) : 'No additional metadata'}</div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-mute)' }}>
                {new Date(log.created_at).toLocaleString()} • IP {log.ip_address}
              </div>
            </div>
          );
        }) : <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)' }}>No audit logs found</div>}
      </div>
    </div>
  );
}
