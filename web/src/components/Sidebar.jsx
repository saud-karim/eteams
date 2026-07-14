import React, { useState } from 'react';
import { 
  MessageSquare, Bookmark, Shield, Megaphone, Hash, Plus, UserPlus, Lock 
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import ChannelIcon from './ChannelIcon';

export default function Sidebar({ activeView, activeChannel, setActiveChannel, isAdminActive, onOpenCreateChannel, onOpenNewDm, onOpenThreads, onOpenSaved, onOpenAdmin, isOpen, unreadCounts = {} }) {
  const { t } = useLanguage();
  const { channels, users } = useWorkspace();
  const { user, setUser } = useAuth();
  const socket = useSocket();
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [sections, setSections] = useState({
    announcements: true,
    channels: true,
    dms: true
  });

  const handleSetPresence = (presence) => {
    if (socket) {
      socket.emit('presence:set', { presence });
      setUser({ ...user, presence });
    }
    setStatusMenuOpen(false);
  };

  const announcementChannels = channels?.filter(c => c.type === 'announcement') || [];
  const publicPrivateChannels = channels?.filter(c => c.type === 'public' || c.type === 'private') || [];
  const dmChannels = channels?.filter(c => c.type === 'dm' || c.type === 'group_dm') || [];

  const toggleSection = (section) => {
    setSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const UnreadBadge = ({ channelId }) => {
    const data = unreadCounts[channelId];
    if (!data || data.count === 0) return null;
    return (
      <span className="badge emerald" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {data.hasMention && <span>@</span>}
        {data.count > 99 ? '99+' : data.count}
      </span>
    );
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="workspace-header">
        <div className="workspace-name">{t('workspaceName')}</div>
        <button className="compose-btn" title={t('newMessageTip')} onClick={onOpenNewDm}>
          <Plus size={16} />
        </button>
      </div>
      
      <div className="sidebar-scroll">
        <div style={{ padding: '4px 0 6px' }}>
          <div className={`nav-item ${activeView === 'threads' ? 'active' : ''}`} onClick={onOpenThreads}>
            <span className="icon"><MessageSquare size={14} /></span>
            <span className="name">{t('threads')}</span>
          </div>
          <div className={`nav-item ${activeView === 'saved' ? 'active' : ''}`} onClick={onOpenSaved}>
            <span className="icon"><Bookmark size={14} /></span>
            <span className="name">{t('saved')}</span>
          </div>
          {user?.role === 'superadmin' && (
            <div className={`nav-item ${isAdminActive ? 'active' : ''}`} style={{ borderTop: '1px solid var(--border)', marginTop: '8px', paddingTop: '12px' }} onClick={onOpenAdmin}>
              <span className="icon" style={{ color: 'var(--emerald)' }}><Shield size={14} /></span>
              <span className="name" style={{ color: 'var(--emerald)', fontWeight: 600 }}>{t('adminPanel')}</span>
              <span className="status-pill role-sa" style={{ fontSize: '9px', padding: '2px 6px' }}>{t('saBadge')}</span>
            </div>
          )}
        </div>

        {/* Announcements */}
        <div className={`section-header ${!sections.announcements ? 'collapsed' : ''}`} onClick={() => toggleSection('announcements')}>
          <span>{t('announcements')}</span>
        </div>
        {sections.announcements && (
          <div id="sec-announcements">
            {announcementChannels.map(ch => (
              <div key={ch.id} className={`nav-item ${!isAdminActive && activeView === 'chat' && activeChannel === ch.slug ? 'active' : ''}`} onClick={() => setActiveChannel(ch.slug)}>
                <span className="icon"><ChannelIcon type="announcement" size={14} /></span>
                <span className="name">{ch.name}</span>
                <UnreadBadge channelId={ch.id} />
              </div>
            ))}
          </div>
        )}

        {/* Channels */}
        <div className={`section-header ${!sections.channels ? 'collapsed' : ''}`} onClick={() => toggleSection('channels')}>
          <span>{t('channels')}</span>
          {(user?.role === 'superadmin' || user?.permissions?.['create-public'] || user?.permissions?.['create-private'] || user?.permissions?.['create-announcement']) && (
            <span className="plus" onClick={(e) => { e.stopPropagation(); onOpenCreateChannel?.(); }}><Plus size={12} /></span>
          )}
        </div>
        {sections.channels && (
          <div id="sec-channels">
            {publicPrivateChannels.map(ch => (
              <div key={ch.id} className={`nav-item ${!isAdminActive && activeView === 'chat' && activeChannel === ch.slug ? 'active' : ''}`} onClick={() => setActiveChannel(ch.slug)}>
                <span className="icon"><ChannelIcon type={ch.type} size={14} /></span>
                <span className="name">{ch.name}</span>
                <UnreadBadge channelId={ch.id} />
              </div>
            ))}
          </div>
        )}

        {/* Direct Messages */}
        <div className={`section-header ${!sections.dms ? 'collapsed' : ''}`} onClick={() => toggleSection('dms')}>
          <span>{t('directMessages')}</span>
          {(user?.role === 'superadmin' || user?.permissions?.['dm-anyone']) && (
            <span className="plus" onClick={(e) => { e.stopPropagation(); onOpenNewDm?.(); }}><Plus size={12} /></span>
          )}
        </div>
        {sections.dms && (
          <div id="sec-dms">
            {dmChannels.map(ch => {
              let otherName = ch.name;
              let otherUser = null;
              
              if (ch.slug && ch.slug.startsWith('dm-')) {
                const ids = ch.slug.replace('dm-', '').split('-');
                const otherIds = ids.filter(id => id !== user?.id?.toString());
                if (otherIds.length > 0) {
                  const otherUsers = otherIds.map(id => users?.find(u => u.id?.toString() === id)).filter(Boolean);
                  if (otherUsers.length > 0) {
                    otherName = otherUsers.map(u => u.name).join(', ');
                    if (otherUsers.length === 1) {
                      otherUser = otherUsers[0];
                    }
                  }
                }
              }
              
              // Fallback
              if (!otherUser && !otherName.includes(', ')) {
                otherName = ch.name.split(', ').find(n => n !== user?.name) || ch.name;
                otherUser = users?.find(u => u.name === otherName);
              }

              return (
                <div key={ch.id} className={`nav-item dm-item ${!isAdminActive && activeView === 'chat' && activeChannel === ch.slug ? 'active' : ''}`} onClick={() => setActiveChannel(ch.slug)}>
                  {otherUser ? (
                    <Avatar user={otherUser} size={20} className="avatar" showPresence={true} style={{ flexShrink: 0 }} />
                  ) : (
                    <Avatar user={{ name: otherName, avatar_color: 'panel-3' }} size={20} className="avatar" showPresence={false} style={{ flexShrink: 0 }} />
                  )}
                  <span className="name">{otherName}</span>
                  <UnreadBadge channelId={ch.id} />
                </div>
              );
            })}
            {(user?.role === 'superadmin' || user?.permissions?.['dm-anyone']) && (
              <div className="nav-item" onClick={onOpenNewDm} style={{ cursor: 'pointer' }}>
                <span className="icon" style={{ color: 'var(--text-mute)' }}><UserPlus size={14} /></span>
                <span className="name" style={{ color: 'var(--text-mute)' }}>{t('addTeammates')}</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="sidebar-footer" onClick={() => setStatusMenuOpen(!statusMenuOpen)} style={{ cursor: 'pointer', position: 'relative' }}>
        <Avatar user={user} size={32} className="avatar-me" showPresence={true} />
        <div className="me-info">
          <div className="me-name">{user?.name}</div>
          <div className="me-status"><span className={`dot ${user?.presence || 'online'}`}></span><span id="statusLabel">{user?.presence || 'online'}</span></div>
        </div>

        {statusMenuOpen && (
          <div className="status-menu active" style={{ position: 'absolute', bottom: '100%', left: '0', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '8px', padding: '4px', zIndex: 60, width: '200px', boxShadow: 'var(--shadow)', marginBottom: '8px' }} onClick={e => e.stopPropagation()}>
            <div className="status-item" onClick={(e) => { e.stopPropagation(); handleSetPresence('online'); }} style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '4px' }}>
              <span className="dot online"></span> Online
            </div>
            <div className="status-item" onClick={(e) => { e.stopPropagation(); handleSetPresence('away'); }} style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '4px' }}>
              <span className="dot away"></span> Away
            </div>
            <div className="status-item" onClick={(e) => { e.stopPropagation(); handleSetPresence('dnd'); }} style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderRadius: '4px' }}>
              <span className="dot dnd"></span> Do Not Disturb
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
