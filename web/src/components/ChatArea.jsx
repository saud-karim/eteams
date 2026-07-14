import React, { useState, useEffect } from 'react';
import { 
  Phone, Video, MoreHorizontal, Download, Lock, Hash, Megaphone, MessageSquare, Info, Settings, UserMinus
} from 'lucide-react';
import MessageInput from './MessageInput';
import ThreadPanel from './ThreadPanel';
import ChannelInfoPanel from './ChannelInfoPanel';
import MemberPermissionsModal from './MemberPermissionsModal';
import Message from './Message';
import { useLanguage } from '../context/LanguageContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { useConfirm } from '../context/ConfirmContext';
import Avatar from './Avatar';
import ChannelIcon from './ChannelIcon';

export default function ChatArea({ activeChannel, onStartCall, targetMessageId }) {
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState('messages');
  const [messages, setMessages] = useState([]);
  const [activeThreadMsg, setActiveThreadMsg] = useState(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [channelMembers, setChannelMembers] = useState([]);
  const [editingMember, setEditingMember] = useState(null);
  
  const { t } = useLanguage();
  const { channels, users } = useWorkspace();
  const socket = useSocket();
  const { user } = useAuth();

  const channelObj = channels?.find(c => c.slug === activeChannel) || channels?.[0];

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesContainerRef = React.useRef(null);
  const messagesEndRef = React.useRef(null);
  const initialLoadRef = React.useRef(true);

  useEffect(() => {
    if (!channelObj?.id) return;
    setLoading(true);
    setHasMore(true);
    initialLoadRef.current = true;
    
    Promise.all([
      api.messages.list(channelObj.id),
      api.channels.get(channelObj.slug)
    ]).then(([msgRes, chRes]) => {
      setMessages(msgRes.messages || []);
      if ((msgRes.messages || []).length < 50) setHasMore(false);
      setChannelMembers(chRes.members || []);
      
      requestAnimationFrame(() => {
        if (messagesEndRef.current && !targetMessageId) {
          messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
      });
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, [channelObj?.id, channelObj?.slug]);

  const handleScroll = async (e) => {
    const { scrollTop, scrollHeight } = e.target;
    if (scrollTop === 0 && hasMore && !loadingMore && !loading && messages.length > 0) {
      setLoadingMore(true);
      try {
        const oldestMsg = messages[0];
        const res = await api.messages.list(channelObj.id, oldestMsg.created_at);
        const newMessages = res.messages || [];
        
        if (newMessages.length < 50) setHasMore(false);
        if (newMessages.length > 0) {
          const scrollContainer = messagesContainerRef.current;
          const oldScrollHeight = scrollContainer ? scrollContainer.scrollHeight : 0;
          
          initialLoadRef.current = false;
          setMessages(prev => [...newMessages, ...prev]);
          
          requestAnimationFrame(() => {
            if (scrollContainer) {
              scrollContainer.scrollTop = scrollContainer.scrollHeight - oldScrollHeight;
            }
          });
        }
      } catch (err) {
        console.error('Failed to load older messages', err);
      } finally {
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    if (!initialLoadRef.current) return;
    if (targetMessageId) return;
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [activeTab, targetMessageId]);

  useEffect(() => {
    if (targetMessageId && !loading && messages.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`msg-${targetMessageId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('highlight-msg');
          setTimeout(() => {
            el.classList.remove('highlight-msg');
          }, 2500);
        }
      }, 100);
    }
  }, [targetMessageId, loading, messages]);

  useEffect(() => {
    if (!socket || !channelObj?.id) return;
    
    // Join the channel room
    socket.emit('channel:join', { channelId: channelObj.id });

    const handleNewMessage = (msg) => {
      const container = messagesContainerRef.current;
      const isNearBottom = container ? (container.scrollHeight - container.scrollTop - container.clientHeight < 100) : true;
      
      setMessages(prev => [...prev, msg]);
      
      if (isNearBottom) {
        requestAnimationFrame(() => {
          if (messagesEndRef.current && !targetMessageId) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        });
      }
    };
    const handleUpdateMessage = (updatedMsg) => {
      setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
    };
    const handleDeleteMessage = (data) => {
      setMessages(prev => prev.filter(m => m.id !== data.id));
    };
    const handleReactions = (data) => {
      setMessages(prev => prev.map(m => m.id === data.id ? { ...m, reactions: data.reactions } : m));
    };
    const handleTypingStart = ({ userId, name, parentId }) => {
      if (parentId) return; // Ignore thread typing
      setTypingUsers(prev => ({ ...prev, [userId]: name }));
    };
    const handleTypingStop = ({ userId, parentId }) => {
      if (parentId) return;
      setTypingUsers(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
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
  }, [socket, channelObj?.id]);

  const getChannelIcon = () => {
    return <ChannelIcon type={channelObj?.type} size={18} />;
  };

  const mainMessages = messages.filter(m => !m.parent_id);

  const handleExport = async () => {
    try {
      const text = await api.channels.export(channelObj.id);
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${channelObj?.name || channelObj?.slug || 'export'}-chat.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export chat history.');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowMoreMenu(false);
    alert('Link copied to clipboard!');
  };

  const handleClearHistory = async () => {
    const ok = await confirm({ title: 'Clear History', message: 'Are you sure you want to clear the chat history on your screen?' });
    if (ok) {
      setMessages([]);
      setShowMoreMenu(false);
    }
  };

  const handleRemoveMember = async (userId, name) => {
    const ok = await confirm({ title: 'Remove Member', message: `Are you sure you want to remove ${name}?`, isDanger: true });
    if (ok) {
      try {
        await api.channels.removeMember(channelObj.id, userId);
        setChannelMembers(prev => prev.filter(m => m.id !== userId));
      } catch (e) {
        alert(e.message || 'Error removing member');
      }
    }
  };

  const handleLeaveChannel = async () => {
    const ok = await confirm({ title: 'Leave Channel', message: 'Are you sure you want to leave this channel?' });
    if (ok) {
      try {
        await api.channels.leave(channelObj.id);
        window.location.reload();
      } catch (e) {
        alert(e.message || 'Error leaving channel');
      }
    }
  };

  const handleDeleteChannel = async () => {
    const ok = await confirm({ title: 'Delete Channel', message: 'Are you sure you want to DELETE this channel for everyone?', isDanger: true, confirmText: 'Delete Channel' });
    if (ok) {
      try {
        await api.channels.delete(channelObj.id);
        window.location.reload();
      } catch (e) {
        alert(e.message || 'Error deleting channel');
      }
    }
  };

  const isDM = channelObj?.type === 'dm';
  const currentMem = channelMembers.find(m => m.id === user?.id);
  const isManager = !!currentMem?.is_manager && currentMem.is_manager !== 0 && currentMem.is_manager !== false;
  const canPost = (!!currentMem?.can_post && currentMem.can_post !== 0) || isManager || user?.role === 'superadmin';
  const isReadOnly = channelObj?.is_readonly;
  const canPostInChannel = canPost && (!isReadOnly || isManager || user?.role === 'superadmin');

  return (
    <>
    <section className="chat-area">
      <div className="chat-header">
        <div className="chat-header-top">
          <div>
            <div className="chat-title">
              <span className="prefix">{getChannelIcon()}</span>
              <span className="name">{channelObj?.name || activeChannel || 'general'}</span>
              <span className="caret">▾</span>
              {channelObj?.description && (
                <div className="chat-topic">{channelObj.description}</div>
              )}
            </div>
          </div>
          
          <div className="chat-actions">
            <div className="members-mini" onClick={() => setActiveTab('people')} style={{ cursor: 'pointer' }} title="View People">
              <div className="stack">
                {channelMembers.slice(0, 3).map(u => (
                  <Avatar key={u.id} user={u} size={24} className="avatar" title={u.name} />
                ))}
              </div>
              <span className="count">{channelMembers.length}</span>
            </div>
            
            <button className="chat-icon-btn" title="Channel Info" onClick={() => { setShowInfoPanel(!showInfoPanel); setActiveThreadMsg(null); }}><Info size={15} /></button>
            
            <div style={{ position: 'relative', display: 'flex' }}>
              <button className="chat-icon-btn" title="More Options" onClick={() => setShowMoreMenu(!showMoreMenu)}>
                <MoreHorizontal size={15} />
              </button>
              {showMoreMenu && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', zIndex: 100, minWidth: 180, padding: 8 }}>
                  <div className="hover-bg" onClick={handleCopyLink} style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 4, fontSize: 13 }}>Copy Link</div>
                  <div className="hover-bg" onClick={() => { setIsMuted(!isMuted); setShowMoreMenu(false); }} style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 4, fontSize: 13 }}>{isMuted ? 'Unmute Notifications' : 'Mute Notifications'}</div>
                  <div className="hover-bg" onClick={handleClearHistory} style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 4, fontSize: 13 }}>Clear History</div>
                  {channelObj?.type !== 'announcement' && (
                    <div className="hover-bg" onClick={handleLeaveChannel} style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 4, fontSize: 13, color: 'var(--accent)' }}>Leave Channel</div>
                  )}
                  {(user?.id === channelObj?.created_by || user?.role === 'superadmin') && (
                    <div className="hover-bg" onClick={handleDeleteChannel} style={{ padding: '8px 12px', cursor: 'pointer', borderRadius: 4, fontSize: 13, color: 'var(--error)' }}>Delete Channel</div>
                  )}
                </div>
              )}
            </div>

            <button className="chat-icon-btn" title="Export conversation" onClick={handleExport}><Download size={15} /></button>
          </div>
        </div>
        
        <div className="chat-tabs">
          <div className={`chat-tab ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
            {t('tabMessages')}
          </div>
          <div className={`chat-tab ${activeTab === 'files' ? 'active' : ''}`} onClick={() => setActiveTab('files')}>
            {t('tabFiles')} {messages.filter(m => m.attachments?.length > 0).length > 0 && <span className="tab-count">{messages.filter(m => m.attachments?.length > 0).length}</span>}
          </div>
          <div className={`chat-tab ${activeTab === 'pins' ? 'active' : ''}`} onClick={() => setActiveTab('pins')}>
            {t('tabPinned')} {messages.filter(m => m.is_pinned).length > 0 && <span className="tab-count">{messages.filter(m => m.is_pinned).length}</span>}
          </div>
          <div className={`chat-tab ${activeTab === 'people' ? 'active' : ''}`} onClick={() => setActiveTab('people')}>
            {t('tabPeople')} {channelMembers.length > 0 && <span className="tab-count">{channelMembers.length}</span>}
          </div>
        </div>
      </div>

      <div className="tab-pane active" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeTab === 'messages' && (
          <>
            <div className="messages" ref={messagesContainerRef} onScroll={handleScroll}>
              {loadingMore && <div style={{ padding: 10, textAlign: 'center', fontSize: 12, color: 'var(--text-dim)' }}>Loading older messages...</div>}
              {hasMore && !loadingMore && !loading && messages.length >= 50 && (
                <div style={{ padding: 10, textAlign: 'center', fontSize: 12, color: 'var(--text-dim)', cursor: 'pointer' }} onClick={() => handleScroll({ target: messagesContainerRef.current, scrollTop: 0 })}>Load older messages</div>
              )}
              <div className="day-divider"><span>{t('today')}</span></div>
              
              {loading ? (
                <div style={{ padding: 20, color: 'var(--text-dim)', textAlign: 'center' }}>Loading messages...</div>
              ) : messages.length === 0 ? (
                <div style={{ padding: 20, color: 'var(--text-dim)', textAlign: 'center' }}>No messages yet.</div>
              ) : (
                mainMessages.map(msg => {
                  const author = users.find(u => u.id === msg.user_id) || { name: 'Unknown User' };
                  const canPin = user?.role === 'superadmin' || !!currentMem?.can_pin_messages || !!currentMem?.is_manager;
                  const canDeleteOthers = user?.role === 'superadmin' || !!currentMem?.can_delete_messages || !!currentMem?.is_manager;
                  return (
                    <Message 
                      key={msg.id} 
                      message={msg} 
                      author={author} 
                      currentUser={user} 
                      onReply={() => setActiveThreadMsg(msg)} 
                      canPin={canPin}
                      canDeleteOthers={canDeleteOthers}
                    />
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            <div style={{ padding: '0 20px 20px', position: 'relative' }}>
              {Object.keys(typingUsers).length > 0 && (
                <div style={{ position: 'absolute', top: '-25px', left: '20px', fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                  {Object.values(typingUsers).join(', ')} {Object.keys(typingUsers).length > 1 ? 'are' : 'is'} typing...
                </div>
              )}
              {canPostInChannel ? (
                <MessageInput channelId={channelObj?.id} />
              ) : (
                <div style={{ padding: '16px', background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-dim)', textAlign: 'center', fontSize: '14px', marginTop: 'auto' }}>
                  You do not have permission to post in this channel.
                </div>
              )}
            </div>
          </>
        )}
        
        {activeTab === 'files' && (
          <div className="messages" style={{ padding: '20px' }}>
            {messages.filter(m => m.attachments?.length > 0).length === 0 ? (
              <div style={{ padding: 20, color: 'var(--text-dim)', textAlign: 'center' }}>No files have been shared here yet.</div>
            ) : (
              <div className="list-group">
                {messages.filter(m => m.attachments?.length > 0).flatMap(msg => 
                  msg.attachments.map(att => (
                    <div key={att.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--panel-2)', borderRadius: 8, marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--panel-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-mute)' }}>
                          <Download size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 14 }}>{att.original_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                            Shared by {users.find(u => u.id === msg.user_id)?.name || 'Unknown'} • {(att.size_bytes / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                      <a href={`http://localhost:4000/${att.storage_key}`} download={att.original_name} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', padding: '6px 16px', fontSize: '13px', background: 'var(--emerald)', color: 'white', borderRadius: '6px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Download size={14} /> Download
                      </a>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
        {activeTab === 'pins' && (
          <div className="messages">
            {messages.filter(m => m.is_pinned).length === 0 ? (
              <div style={{ padding: 40, color: 'var(--text-dim)', textAlign: 'center' }}>No pinned messages in this channel.</div>
            ) : (
              messages.filter(m => m.is_pinned).map(msg => {
                const author = users.find(u => u.id === msg.user_id) || { name: 'Unknown User' };
                const canPin = user?.role === 'superadmin' || !!currentMem?.can_pin_messages || !!currentMem?.is_manager;
                const canDeleteOthers = user?.role === 'superadmin' || !!currentMem?.can_delete_messages || !!currentMem?.is_manager;
                return <Message key={msg.id} message={msg} author={author} currentUser={user} onReply={() => setActiveThreadMsg(msg)} canPin={canPin} canDeleteOthers={canDeleteOthers} />;
              })
            )}
          </div>
        )}
        {activeTab === 'people' && (
          <div className="messages" style={{ padding: '20px' }}>
            <div className="list-group">
              {channelMembers.map(member => (
                <div key={member.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'var(--panel-2)', borderRadius: 8, marginBottom: 8 }}>
                  <Avatar user={member} size={40} showPresence={true} style={{ borderRadius: 10 }} />
                  <div style={{ marginLeft: 16, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {member.name}
                      {member.id === channelObj?.created_by && <span style={{ fontSize: 10, background: 'var(--panel-3)', padding: '2px 6px', borderRadius: 4, color: 'var(--text-mute)' }}>Creator</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{member.role === 'superadmin' ? 'Workspace Admin' : (member.job_title || 'Member')}</div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {isManager && (
                      <button
                        title={`Edit ${member.name}'s Role`}
                        onClick={() => setEditingMember(member)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
                      >
                        <Settings size={16} />
                      </button>
                    )}
                    {member.id !== user?.id && (isManager || !!currentMem?.can_remove_members) && (
                      <button
                        title={`Remove ${member.name}`}
                        onClick={() => handleRemoveMember(member.id, member.name)}
                        style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}
                      >
                        <UserMinus size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
    
    {activeThreadMsg && (
      <ThreadPanel 
        activeThreadMsg={activeThreadMsg} 
        messages={messages} 
        channel={channelObj} 
        onClose={() => setActiveThreadMsg(null)} 
      />
    )}

    {showInfoPanel && !activeThreadMsg && (
      <ChannelInfoPanel 
        channel={channelObj}
        onClose={() => setShowInfoPanel(false)}
      />
    )}

    {editingMember && (
      <MemberPermissionsModal
        isOpen={true}
        onClose={() => setEditingMember(null)}
        channel={channelObj}
        member={editingMember}
        onPermissionsUpdated={(memberId, newPerms) => {
          setChannelMembers(prev => prev.map(m => m.id === memberId ? { ...m, ...newPerms } : m));
        }}
      />
    )}
    </>
  );
}
