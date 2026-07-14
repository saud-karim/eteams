import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import Message from './Message';
import ThreadPanel from './ThreadPanel';
import { MessageSquare } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';

export default function GlobalThreadsView() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeThreadMsg, setActiveThreadMsg] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const { users, channels } = useWorkspace();
  const { user } = useAuth();

  useEffect(() => {
    api.messages.getThreads().then(res => {
      setMessages(Array.isArray(res) ? res : []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const handleOpenThread = async (msg) => {
    setActiveThreadMsg(msg);
    setThreadMessages([]);
    try {
      const channelObj = channels?.find(c => c.slug === msg.channel_slug);
      if (channelObj) {
        const res = await api.messages.list(channelObj.id);
        setThreadMessages(res.messages || []);
      }
    } catch (err) {
      console.error('Failed to load thread replies:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <section className="chat-area">
        <div className="chat-header">
        <div className="chat-title">
          <MessageSquare size={20} />
          <h2>Threads</h2>
        </div>
      </div>
      <div className="messages right-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        {loading && <div style={{ padding: 20 }}>Loading threads...</div>}
        {!loading && messages.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>
            <MessageSquare size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <h3>No threads yet</h3>
            <p style={{ marginTop: 8 }}>When you reply to a message or are mentioned in a thread, it will appear here.</p>
          </div>
        )}
        {!loading && messages.map(msg => {
          const author = users.find(u => u.id === msg.user_id) || { name: 'Unknown' };
          return (
            <div key={msg.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <div style={{ padding: '8px 20px', fontSize: '11px', color: 'var(--text-dim)', background: 'var(--panel-2)' }}>
                Thread in <strong>#{msg.channel_name || msg.channel_slug}</strong>
              </div>
              <Message 
                message={msg} 
                author={author} 
                currentUser={user} 
                onReply={() => handleOpenThread(msg)} 
              />
            </div>
          );
        })}
      </div>
      </section>
        {activeThreadMsg && (
          <ThreadPanel 
            activeThreadMsg={activeThreadMsg} 
            messages={threadMessages}
            channel={{ id: channels?.find(c => c.slug === activeThreadMsg.channel_slug)?.id, slug: activeThreadMsg.channel_slug, name: activeThreadMsg.channel_name }} 
            onClose={() => { setActiveThreadMsg(null); setThreadMessages([]); }} 
          />
        )}
    </div>
  );
}
