import React, { useState, useEffect } from 'react';
import { Search, X, Forward as ForwardIcon } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { api } from '../api/client';

export default function ForwardModal({ message, isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  
  const { channels, users } = useWorkspace();

  if (!isOpen || !message) return null;

  const filteredChannels = channels?.filter(c => c.name.toLowerCase().includes(query.toLowerCase())) || [];
  
  const handleForward = async (targetChannelId) => {
    if (sending) return;
    setSending(true);
    try {
      const forwardedContent = `> **Forwarded message from @${message.author_name}**\n> ${message.body.split('\n').join('\n> ')}`;
      const finalBody = comment.trim() ? `${comment}\n\n${forwardedContent}` : forwardedContent;
      
      await api.messages.send(targetChannelId, finalBody);
      onClose();
    } catch (err) {
      console.error('Failed to forward message:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-backdrop active" onClick={onClose}>
      <div className="big-modal" onClick={e => e.stopPropagation()} style={{ width: 450, position: 'relative' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', right: '16px', top: '16px', color: 'var(--text-dim)', background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
        
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <ForwardIcon size={20} /> Forward Message
        </h3>
        
        <div style={{ padding: '12px', background: 'var(--panel-2)', borderRadius: 8, marginBottom: 16, fontSize: 13, borderLeft: '3px solid var(--border)' }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{message.author_name}</div>
          <div>{message.body.substring(0, 100)}{message.body.length > 100 ? '...' : ''}</div>
        </div>
        
        <div className="form-field">
          <label>Add a comment (optional)</label>
          <input 
            type="text" 
            value={comment} 
            onChange={e => setComment(e.target.value)} 
            placeholder="What do you want to say about this?" 
          />
        </div>

        <div className="form-field" style={{ marginTop: 16 }}>
          <label>Forward to...</label>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-mute)' }} />
            <input 
              type="text" 
              placeholder="Search channels..." 
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ paddingLeft: 30 }}
            />
          </div>
        </div>
        
        <div className="list-group" style={{ maxHeight: 200, overflowY: 'auto', marginTop: 8, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--panel-2)' }}>
          {filteredChannels.length === 0 ? (
            <div style={{ padding: 12, textAlign: 'center', color: 'var(--text-mute)', fontSize: 13 }}>No channels found</div>
          ) : (
            filteredChannels.map(ch => (
              <div key={ch.id} style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} className="hover-bg">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <span style={{ color: 'var(--text-mute)' }}>#</span>
                  {ch.name}
                </div>
                <button 
                  className="form-btn primary" 
                  style={{ padding: '4px 12px', fontSize: 12, minWidth: 0, height: 'auto' }}
                  onClick={() => handleForward(ch.id)}
                  disabled={sending}
                >
                  Forward
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
