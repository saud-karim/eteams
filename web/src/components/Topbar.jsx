import React, { useState, useEffect } from 'react';
import { Search, Moon, Sun, Bell, MessageSquare, LogOut, Settings, User, Menu } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../api/client';
import { requestFirebaseNotificationPermission } from '../firebase';
import Avatar from './Avatar';

export default function Topbar({ user, onOpenProfile, onToggleSidebar, onJumpToChannel, onGlobalSearch }) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ messages: [], channels: [], users: [] });
  const [searchOpen, setSearchOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mentions, setMentions] = useState([]);
  const [mentionsLoading, setMentionsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPreferences, setShowPreferences] = useState(false);
  const [notifSound, setNotifSound] = useState(() => localStorage.getItem('notifSound') !== 'off');
  const [desktopNotif, setDesktopNotif] = useState(() => typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted');
  
  const { lang, toggleLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { setUser, logout } = useAuth();
  const socket = useSocket();

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults({ messages: [], channels: [], users: [] });
      return;
    }
    const timer = setTimeout(() => {
      api.messages.search(searchQuery).then(res => {
        setSearchResults({
          messages: res.messages || [],
          channels: res.channels || [],
          users: res.users || []
        });
        setSearchOpen(true);
      }).catch(console.error);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!socket) return;
    const handleMention = (payload) => {
      setUnreadCount(prev => prev + 1);
      if (notifSound) {
        const audio = new Audio('/notif.mp3');
        audio.volume = 0.5;
        audio.play().catch(e=>console.log(e));
      }
    };
    socket.on('notification:mention', handleMention);
    return () => socket.off('notification:mention', handleMention);
  }, [socket, notifSound]);

  const handleSetPresence = (presence) => {
    if (socket) {
      socket.emit('presence:set', { presence });
      setUser({ ...user, presence });
    }
    setStatusOpen(false);
  };

  const handleGlobalSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim().length >= 2) {
      setSearchOpen(false);
      if (onGlobalSearch) onGlobalSearch(searchQuery);
    }
  };

  const handleOpenNotifications = async () => {
    const next = !showNotifications;
    setShowNotifications(next);
    if (next && mentions.length === 0) {
      setMentionsLoading(true);
      try {
        const res = await api.messages.getMentions();
        setMentions(res.mentions || []);
        setUnreadCount(0);
      } catch (err) { console.error(err); }
      setMentionsLoading(false);
    } else if (!next) {
      setUnreadCount(0);
    }
  };


  return (
    <>
      <div className="topbar">
        <div className="topbar-brand">
          <button className="mobile-menu-btn" onClick={onToggleSidebar} style={{ display: 'none', background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
            <Menu size={20} />
          </button>
          <div className="edara-logo-container" style={{ marginBottom: 0, justifyContent: 'flex-start', transform: 'scale(0.8)', transformOrigin: 'left center' }}>
            <div className="edara-logo-mark"><span className="edara-lm1" style={{ height: '8px' }}></span><span className="edara-lm2"></span><span className="edara-lm3"></span></div>
            <div className="edara-logo-text" style={{ 
              display: 'flex', flexDirection: 'row', alignItems: 'baseline',
              background: 'var(--panel-2)', padding: '6px 12px', borderRadius: '8px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.15)', marginLeft: '10px', border: '1px solid var(--border)'
            }}>
              <span style={{ color: 'var(--emerald)', fontWeight: '900', fontSize: '24px', lineHeight: '1' }}>E</span>
              <span style={{ color: 'var(--text)', fontWeight: '700', fontSize: '20px', letterSpacing: '0.5px', lineHeight: '1' }}>teams</span>
            </div>
          </div>
        </div>

        <div className="search-wrap" style={{ position: 'relative' }}>
          <div className="search-bar">
            <Search size={14} />
            <input
              type="text"
              placeholder={t('searchPlaceholder') || 'Search workspace (Press Enter for global search)'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleGlobalSearch}
              onFocus={() => { if (searchResults.length > 0) setSearchOpen(true); }}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            />
            <span className="search-shortcut">⌘K</span>
          </div>

          <div className={`search-dropdown ${searchOpen && searchQuery.trim().length >= 2 ? 'active' : ''}`}>
            {(searchResults.messages?.length > 0 || searchResults.channels?.length > 0 || searchResults.users?.length > 0) ? (
              <>
                {searchResults.channels?.length > 0 && (
                  <>
                    <div className="search-section">Channels</div>
                    {searchResults.channels.map(ch => (
                      <div key={`ch-${ch.id}`} className="search-result" onMouseDown={(e) => {
                        e.preventDefault();
                        if (onJumpToChannel) onJumpToChannel(ch.slug);
                        setSearchOpen(false);
                        setSearchQuery('');
                      }}>
                        <div className="icon" style={{ background: 'var(--panel-2)' }}>
                          <span style={{ fontSize: 16, color: 'var(--text-mute)' }}>#</span>
                        </div>
                        <div className="info">
                          <div className="title">{ch.name}</div>
                          <div className="sub">{ch.type}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {searchResults.users?.length > 0 && (
                  <>
                    <div className="search-section">Users</div>
                    {searchResults.users.map(u => (
                      <div key={`u-${u.id}`} className="search-result" onMouseDown={async (e) => {
                        e.preventDefault();
                        try {
                           const dm = await api.channels.createDM([u.id]);
                           if (onJumpToChannel) onJumpToChannel(dm.channel.slug);
                        } catch (err) { console.error(err); }
                        setSearchOpen(false);
                        setSearchQuery('');
                      }}>
                        <div className="icon" style={{ background: 'transparent' }}>
                           <Avatar user={u} size={24} />
                        </div>
                        <div className="info">
                          <div className="title">{u.name}</div>
                          <div className="sub">{u.job_title || '@'+u.username}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {searchResults.messages?.length > 0 && (
                  <>
                    <div className="search-section">Messages</div>
                    {searchResults.messages.map(msg => (
                      <div key={msg.id} className="search-result" onMouseDown={(e) => {
                        e.preventDefault();
                        if (onJumpToChannel) onJumpToChannel(msg.channel_slug, msg.id);
                        setSearchOpen(false);
                        setSearchQuery('');
                      }}>
                        <div className="icon" style={{ background: 'var(--panel-2)' }}>
                          <MessageSquare size={16} />
                        </div>
                        <div className="info">
                          <div className="title">{msg.body}</div>
                          <div className="sub">#{msg.channel_slug} • {msg.author_name}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-mute)' }}>
                No results for "{searchQuery}"
              </div>
            )}
          </div>
        </div>

        <div className="topbar-actions">
          <button className="lang-toggle" onClick={toggleLang}>{t('langToggle')}</button>
          <button className="topbar-btn" title="Toggle theme" onClick={toggleTheme}>
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* Bell notifications */}
          <div style={{ position: 'relative' }}>
            <button className="topbar-btn" title="Notifications" onClick={handleOpenNotifications}>
              <Bell size={16} />
              {unreadCount > 0 && <span className="dot" style={{ background: 'var(--dnd)' }}></span>}
            </button>
            {showNotifications && (
              <div style={{ position: 'absolute', top: '40px', ...(lang === 'ar' ? { left: 0 } : { right: 0 }), width: '340px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: 'var(--shadow)', zIndex: 200, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>🔔 Mentions & Notifications</span>
                  <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '16px' }}>×</button>
                </div>
                <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                  {mentionsLoading && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>}
                  {!mentionsLoading && mentions.length === 0 && (
                    <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-dim)' }}>
                      <Bell size={32} style={{ opacity: 0.3, margin: '0 auto 8px', display: 'block' }} />
                      <div style={{ fontSize: '13px' }}>No mentions yet</div>
                    </div>
                  )}
                  {!mentionsLoading && mentions.map(m => (
                    <div key={m.id} onClick={() => { if (onJumpToChannel) onJumpToChannel(m.channel_slug); setShowNotifications(false); }}
                      style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ fontSize: '11px', color: 'var(--text-mute)', marginBottom: '4px' }}>#{m.channel_name} · {m.author_name}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.body}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-mute)', marginTop: '4px' }}>{new Date(m.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>


          {/* Avatar + status menu */}
          <div style={{ position: 'relative' }}>
            <Avatar 
              user={user} 
              size={32} 
              className="avatar-me" 
              showPresence={true} 
              onClick={e => { e.stopPropagation(); setStatusOpen(prev => !prev); }} 
            />

            {statusOpen && (
              <div
                style={{ position: 'absolute', top: '40px', ...(lang === 'ar' ? { left: 0 } : { right: 0 }), minWidth: '260px', background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '10px', boxShadow: 'var(--shadow)', zIndex: 200, overflow: 'hidden' }}
                onClick={e => e.stopPropagation()}
              >
                <div className="status-me-head">
                  <Avatar user={user} size={40} className="avatar" />
                  <div className="info">
                    <div className="name">{user?.name}</div>
                    <div className="role">{user?.job_title || 'User'}</div>
                  </div>
                </div>
                <div className="status-list">
                  <button className={`status-opt ${(user?.presence || 'online') === 'online' ? 'active-status' : ''}`} onClick={e => { e.stopPropagation(); handleSetPresence('online'); }}>
                    <span className="dot online"></span><span>{t('active')}</span>
                  </button>
                  <button className={`status-opt ${user?.presence === 'away' ? 'active-status' : ''}`} onClick={e => { e.stopPropagation(); handleSetPresence('away'); }}>
                    <span className="dot away"></span><span>{t('away')}</span>
                  </button>
                  <button className={`status-opt ${user?.presence === 'dnd' ? 'active-status' : ''}`} onClick={e => { e.stopPropagation(); handleSetPresence('dnd'); }}>
                    <span className="dot dnd"></span><span>{t('dnd')}</span>
                  </button>
                  <div className="status-divider"></div>
                  <button className="status-action" onClick={e => { e.stopPropagation(); setStatusOpen(false); onOpenProfile?.(); }}>
                    <User size={14} /><span>{t('viewProfile')}</span>
                  </button>
                  <button className="status-action" onClick={e => { e.stopPropagation(); setStatusOpen(false); setShowPreferences(true); }}>
                    <Settings size={14} /><span>{t('preferences')}</span>
                  </button>
                  <button className="status-action" onClick={e => { e.stopPropagation(); setStatusOpen(false); logout(); }}>
                    <LogOut size={14} /><span>{t('signOut')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preferences Modal — outside topbar div so z-index and fixed positioning works */}
      {showPreferences && (
        <div className="modal-backdrop active" onClick={() => setShowPreferences(false)}>
          <div className="big-modal" style={{ width: '440px', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowPreferences(false)} style={{ position: 'absolute', right: '16px', top: '16px', background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '20px' }}>×</button>
            <h3 style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={18} /> Preferences</h3>
            <div className="msub" style={{ marginBottom: '24px' }}>Customize your Eteams experience</div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Theme</div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>Switch between dark and light mode</div>
              </div>
              <button onClick={toggleTheme} style={{ background: theme === 'dark' ? 'var(--panel-2)' : 'var(--gold)', color: theme === 'dark' ? 'var(--text)' : '#fff', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {theme === 'dark' ? <><Moon size={14} /> Dark</> : <><Sun size={14} /> Light</>}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Language / اللغة</div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>Toggle between Arabic and English</div>
              </div>
              <button onClick={toggleLang} style={{ background: 'var(--panel-2)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
                {lang === 'ar' ? '🇺🇸 English' : '🇸🇦 العربية'}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Notification Sounds</div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>Play a sound when you receive a message</div>
              </div>
              <button
                onClick={() => { const n = !notifSound; setNotifSound(n); localStorage.setItem('notifSound', n ? 'on' : 'off'); }}
                style={{ background: notifSound ? 'var(--emerald)' : 'var(--panel-2)', color: notifSound ? 'white' : 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: '20px', padding: '4px 18px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', transition: 'all 0.2s' }}
              >
                {notifSound ? 'ON' : 'OFF'}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>Desktop Notifications</div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '2px' }}>Show native notifications in background</div>
              </div>
              <button
                onClick={async () => {
                  if ('Notification' in window) {
                    if (Notification.permission === 'denied') {
                      alert("You have blocked notifications in your browser settings. Please click the lock icon in the address bar to allow them.");
                      return;
                    }
                    const token = await requestFirebaseNotificationPermission();
                    if (token) {
                      try {
                        await api.users.saveFcmToken(token);
                        setDesktopNotif(true);
                        new Notification("Enabled", { body: "You will now receive desktop notifications!" });
                      } catch (err) {
                        console.error('Error saving FCM token:', err);
                        alert("Failed to save notification token. Please try again.");
                      }
                    } else {
                      alert("Please allow notifications in your browser settings.");
                    }
                  } else {
                    alert("Your browser does not support desktop notifications.");
                  }
                }}
                style={{ background: desktopNotif ? 'var(--emerald)' : 'var(--panel-2)', color: desktopNotif ? 'white' : 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: '20px', padding: '4px 18px', cursor: 'pointer', fontWeight: 700, fontSize: '13px', transition: 'all 0.2s' }}
              >
                {desktopNotif ? 'ON' : 'OFF'}
              </button>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-primary" onClick={() => setShowPreferences(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

