import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Send, MoreHorizontal, Smile, Paperclip } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../api/client';
import MessageInput from './MessageInput';
import Message from './Message';

export default function ThreadPanel({ activeThreadMsg, messages, channel, onClose }) {
  const { t } = useLanguage();
  const { users } = useWorkspace();
  const { user } = useAuth();
  const socket = useSocket();
  const [replies, setReplies] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const scrollRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    setReplies([]);
    setHasMore(true);
    setTypingUsers({});
    
    const loadInitial = async () => {
      setLoading(true);
      try {
        const res = await api.messages.listReplies(activeThreadMsg.id, null, 50);
        if (!mounted) return;
        setReplies(res.messages || []);
        if (res.messages?.length < 50) setHasMore(false);
      } catch (e) {
        console.error('Failed to load thread replies:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadInitial();
    return () => { mounted = false; };
  }, [activeThreadMsg.id]);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (msg) => {
      if (msg.parent_id === activeThreadMsg.id) {
        setReplies(prev => [...prev, msg]);
      }
    };
    const handleUpdateMessage = (updatedMsg) => {
      if (updatedMsg.parent_id === activeThreadMsg.id) {
        setReplies(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
      }
    };
    const handleDeleteMessage = (data) => {
      setReplies(prev => prev.filter(m => m.id !== data.id));
    };
    const handleReactions = (data) => {
      setReplies(prev => prev.map(m => m.id === data.id ? { ...m, reactions: data.reactions } : m));
    };
    const handleTypingStart = ({ userId, name, parentId }) => {
      if (parentId === activeThreadMsg.id) {
        setTypingUsers(prev => ({ ...prev, [userId]: name }));
      }
    };
    const handleTypingStop = ({ userId, parentId }) => {
      if (parentId === activeThreadMsg.id) {
        setTypingUsers(prev => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:updated', handleUpdateMessage);
    socket.on('message:deleted', handleDeleteMessage);
    socket.on('message:reactions', handleReactions);
    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    
    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:updated', handleUpdateMessage);
      socket.off('message:deleted', handleDeleteMessage);
      socket.off('message:reactions', handleReactions);
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
    };
  }, [socket, activeThreadMsg.id]);

  const handleScroll = async (e) => {
    const el = e.target;
    if (el.scrollTop === 0 && !loading && hasMore && replies.length > 0) {
      setLoading(true);
      const oldScrollHeight = el.scrollHeight;
      try {
        const oldestMsg = replies[0];
        const res = await api.messages.listReplies(activeThreadMsg.id, oldestMsg.created_at, 50);
        if (res.messages?.length > 0) {
          setReplies(prev => [...res.messages, ...prev]);
        }
        if (!res.messages || res.messages.length < 50) {
          setHasMore(false);
        }
        // Restore scroll position
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight - oldScrollHeight;
        });
      } catch (err) {
        console.error('Failed to load older replies:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const author = users.find(u => u.id === activeThreadMsg.user_id) || { name: 'Unknown User' };
  
  return (
    <aside className="right-panel active" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="right-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <div className="thread-title">
          <div className="title-text">{t('threadTitle')}</div>
          <div className="title-sub"># {channel?.name || channel?.slug || 'channel'}</div>
        </div>
        <button className="chat-icon-btn" onClick={onClose} style={{ cursor: 'pointer' }}>
          <X size={18} />
        </button>
      </div>
      
      <div className="right-scroll" ref={scrollRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {/* Original Message */}
        <Message 
          message={activeThreadMsg} 
          author={author} 
          currentUser={user} 
        />
        
        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: 'var(--text-dim)', fontSize: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
          <span style={{ margin: '0 10px' }}>{replies.length} {t('replies')}</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
        </div>
        
        {loading && <div style={{ textAlign: 'center', padding: '10px', color: 'var(--text-dim)', fontSize: '12px' }}>Loading...</div>}

        {/* Replies */}
        {replies.map(msg => {
          const replyAuthor = users.find(u => u.id === msg.user_id) || { name: 'Unknown User' };
          return (
            <Message 
              key={msg.id} 
              message={msg} 
              author={replyAuthor} 
              currentUser={user} 
            />
          );
        })}
      </div>
      
      <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
        {Object.keys(typingUsers).length > 0 && (
          <div className="typing-indicator" style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px', paddingLeft: '8px' }}>
            <div className="dots"><span>.</span><span>.</span><span>.</span></div>
            {Object.values(typingUsers).join(', ')} {Object.keys(typingUsers).length > 1 ? 'are' : 'is'} typing...
          </div>
        )}
        <MessageInput channelId={channel?.id} parentId={activeThreadMsg.id} />
      </div>
    </aside>
  );
}
