import React from 'react';
import { Megaphone, Clock } from 'lucide-react';

export default function BroadcastTab({
  broadcastType, setBroadcastType,
  broadcastRecipients, setBroadcastRecipients,
  broadcastMessage, setBroadcastMessage,
  isSending, handleSendBroadcast,
  broadcastsHistory
}) {
  return (
    <div>
      <h2 style={{ marginBottom: '20px' }}>System-Wide Broadcast</h2>
      
      <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}><Megaphone size={16} /> New Broadcast</div>
        <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginBottom: '16px' }}>Push a banner notification to all users. Use for emergencies or policy updates.</div>
        
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-mute)' }}>Broadcast type</label>
            <select className="admin-search-inp" style={{ width: '100%' }} value={broadcastType} onChange={(e) => setBroadcastType(e.target.value)}>
              <option value="informational">Informational</option>
              <option value="important">Important (bypasses DND)</option>
              <option value="emergency">Emergency (mandatory acknowledgment)</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-mute)' }}>Recipients</label>
            <select className="admin-search-inp" style={{ width: '100%' }} value={broadcastRecipients} onChange={(e) => setBroadcastRecipients(e.target.value)}>
              <option value="all">All users</option>
              <option value="directors">Directors only</option>
              <option value="hr_ops">HR + Operations</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-mute)' }}>Message</label>
          <textarea className="admin-search-inp" rows="3" placeholder="Type your broadcast message here..." style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }} value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)}></textarea>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button className="admin-btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> Schedule for later</button>
          <button className="admin-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} disabled={isSending || !broadcastMessage.trim()} onClick={handleSendBroadcast}>{isSending ? 'Sending...' : 'Send now'}</button>
        </div>
      </div>

      <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 'bold' }}>Recent Broadcasts</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {broadcastsHistory.map((b) => (
          <div key={b.id} style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: 'var(--panel-2)', padding: '10px', borderRadius: '50%', color: b.type === 'emergency' ? 'var(--danger)' : b.type === 'important' ? 'var(--amber)' : 'var(--blue)' }}>
              <Megaphone size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '500', fontSize: '14px', marginBottom: '4px' }}>{b.message_body}</div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-dim)' }}>
                <span><b>Sent by:</b> {b.sender_name}</span>
                <span><b>Sent to:</b> {b.recipients}</span>
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-mute)' }}>{new Date(b.created_at).toLocaleString()}</div>
          </div>
        ))}
        {broadcastsHistory.length === 0 && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dim)', fontSize: '13px' }}>No recent broadcasts found.</div>
        )}
      </div>
    </div>
  );
}
