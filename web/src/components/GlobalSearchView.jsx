import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import Message from './Message';
import ThreadPanel from './ThreadPanel';
import { Search } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';

export default function GlobalSearchView({ searchQuery, onJumpToChannel }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeThreadMsg, setActiveThreadMsg] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const { users, channels } = useWorkspace();
  const { user } = useAuth();

  useEffect(() => {
    if (!searchQuery) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.messages.search(searchQuery).then(res => {
      setMessages(res.messages || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [searchQuery]);

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
    <section className="chat-area">
      <div className="chat-header">
        <div className="chat-title">
          <Search size={20} />
          <h2>Search Results for "{searchQuery}"</h2>
        </div>
      </div>
      <div className="messages right-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        {loading && <div style={{ padding: 20 }}>Searching...</div>}
        {!loading && messages.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>
            <Search size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <h3>No results found</h3>
            <p style={{ marginTop: 8 }}>Try adjusting your search terms.</p>
          </div>
        )}
        {!loading && messages.map(msg => {
          const author = users.find(u => u.id === msg.user_id) || { name: 'Unknown' };
          return (
            <div 
              key={msg.id} 
              onClick={() => onJumpToChannel && onJumpToChannel(msg.channel_slug, msg.id)}
              style={{ cursor: 'pointer' }}
              className="search-result-message-wrapper"
            >
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

      {activeThreadMsg && (
        <ThreadPanel
          parentMsg={activeThreadMsg}
          messages={threadMessages}
          users={users}
          currentUserId={user?.id}
          onClose={() => setActiveThreadMsg(null)}
          onSend={(body, file) => {
            // Note: Sending from global search thread panel goes to the specific channel
            const channelObj = channels?.find(c => c.slug === activeThreadMsg.channel_slug);
            if (channelObj) {
              return api.messages.sendWithFile(channelObj.id, body, activeThreadMsg.id, file).then(() => {
                handleOpenThread(activeThreadMsg);
              });
            }
          }}
        />
      )}
    </section>
  );
}
