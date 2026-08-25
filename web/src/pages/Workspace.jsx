import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useWorkspace } from '../context/WorkspaceContext.jsx';
import { useSocket } from '../context/SocketContext.jsx';
import Topbar from '../components/Topbar';
import SidebarRail from '../components/SidebarRail';
import Sidebar from '../components/Sidebar';
import ChatArea from '../components/ChatArea';
import CreateChannelModal from '../components/CreateChannelModal';
import ProfileSettingsModal from '../components/ProfileSettingsModal';
import AdminPanel from '../components/AdminPanel';
import NewDmModal from '../components/NewDmModal';
import GlobalThreadsView from '../components/GlobalThreadsView';
import GlobalSavedView from '../components/GlobalSavedView';
import GlobalSearchView from '../components/GlobalSearchView';
import GlobalBanner from '../components/GlobalBanner';
import NotificationPromptModal from '../components/NotificationPromptModal';
import ActivityFeed from '../components/ActivityFeed';
import { api } from '../api/client';
import { requestFirebaseNotificationPermission } from '../firebase';
const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    console.error('Audio play failed', e);
  }
};

export default function Workspace() {
  const { user, setUser } = useAuth();
  const { channels, setChannels } = useWorkspace();
  const socket = useSocket();
  const [unreadCounts, setUnreadCounts] = useState({}); // { channelId: { count, hasMention } }
  const activeChannelRef = useRef('');
  const channelsRef = useRef([]);
  const userRef = useRef(null);

  // Keep refs in sync and initialize unreadCounts from backend data when channels load
  useEffect(() => { 
    channelsRef.current = channels || []; 
    // Initialize unread counts only once or when channels completely change
    if (channels?.length > 0) {
      setUnreadCounts(prev => {
        const newCounts = { ...prev };
        let hasChanges = false;
        channels.forEach(ch => {
          if (ch.unread_count > 0 && newCounts[ch.id] === undefined) {
            newCounts[ch.id] = {
              count: ch.unread_count,
              hasMention: ch.mention_count > 0
            };
            hasChanges = true;
          }
        });
        return hasChanges ? newCounts : prev;
      });
    }
  }, [channels]);
  
  useEffect(() => { userRef.current = user; }, [user]);
  
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);

  useEffect(() => {
    const initNotifications = async () => {
      if (!('Notification' in window)) return;
      
      if (Notification.permission === 'granted') {
        // Automatically fetch and update token on load if already granted
        const token = await requestFirebaseNotificationPermission();
        if (token) {
          api.users.saveFcmToken(token).catch(e => console.error('Auto FCM Error:', e));
        }
      } else if (Notification.permission === 'default') {
        // Prompt new users with our custom modal once
        const hasPrompted = localStorage.getItem('hasPromptedNotifications');
        if (!hasPrompted) {
          setShowNotifPrompt(true);
        }
      }
    };
    initNotifications();
  }, []);

  const [activeView, setActiveView] = useState(() => localStorage.getItem('eteams_view') || 'chat'); // 'chat', 'threads', 'saved', 'search'
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [activeChannel, setActiveChannel] = useState(() => localStorage.getItem('eteams_channel') || '');
  
  useEffect(() => { localStorage.setItem('eteams_view', activeView); }, [activeView]);
  useEffect(() => { 
    localStorage.setItem('eteams_channel', activeChannel); 
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showNewDm, setShowNewDm] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [targetMessageId, setTargetMessageId] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const showAdminPanel = searchParams.get('admin') === 'true';

  const setShowAdminPanel = (val) => {
    setSearchParams(prev => {
      if (val) prev.set('admin', 'true');
      else prev.delete('admin');
      return prev;
    });
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-select first channel on load
  useEffect(() => {
    if (!activeChannel && channels?.length > 0) {
      const firstSlug = channels[0].slug;
      setActiveChannel(firstSlug);
      activeChannelRef.current = firstSlug;
    }
  }, [channels, activeChannel]);

  // Mark channel as read whenever the active channel changes
  useEffect(() => {
    if (activeChannel && channels?.length > 0) {
      const ch = channels.find(c => c.slug === activeChannel);
      if (ch) {
        setUnreadCounts(prev => ({ ...prev, [ch.id]: { count: 0, hasMention: false } }));
        api.channels.markRead(ch.id).catch(console.error);
      }
    }
  }, [activeChannel, channels]);

  const handleChannelSelect = (slug, messageId = null) => {
    setActiveChannel(slug);
    setTargetMessageId(messageId);
    
    const ch = channelsRef.current.find(c => c.slug === slug);
    if (ch && (ch.type === 'dm' || ch.type === 'group_dm' || ch.type === 'direct')) {
      setActiveView('dms');
    } else {
      setActiveView('chat');
    }
    
    setShowAdminPanel(false);
    setSidebarOpen(false);
    // Unread badge is cleared by the useEffect above
  };

  // Listen for new messages to update unread badges — registered ONCE per socket
  useEffect(() => {
    if (!socket) return;
    console.log('[badge] socket listener registered, socket id:', socket.id);
    const handleNewMsg = (msg) => {
      // Ignore thread replies for global channel notifications and sounds
      if (msg.parent_id) return;

      const currentChannels = channelsRef.current || [];
      const currentUser = userRef.current;
      const activeChannelObj = currentChannels.find(c => c.slug === activeChannelRef.current);
      console.log('[badge] message:new received', {
        msg_channel: msg.channel_id,
        msg_user: msg.user_id,
        current_user: currentUser?.id,
        active_channel: activeChannelObj?.id,
        will_badge: msg.user_id !== currentUser?.id && msg.channel_id !== activeChannelObj?.id
      });
      // Only show badge if: message from someone else AND channel is not currently open
      if (msg.user_id !== currentUser?.id && msg.channel_id !== activeChannelObj?.id) {
        let isMentioned = false;
        try {
          const mObj = typeof msg.mentions === 'string' ? JSON.parse(msg.mentions) : (msg.mentions || {});
          isMentioned = (mObj.users && mObj.users.includes(currentUser?.id)) || 
                        (mObj.special && (mObj.special.includes('channel') || mObj.special.includes('everyone')));
        } catch(e) {}
        const msgChannelObj = currentChannels.find(c => c.id === msg.channel_id);
        const isHidden = document.hidden;
        const isOtherChannel = activeChannelObj?.id !== msg.channel_id;

        // Play sound if not active
        if (msg.user_id !== currentUser?.id && isOtherChannel) {
          playNotificationSound();
        }

        // Firebase Cloud Messaging automatically shows notifications when the app is in the background (hidden).
        // To prevent duplicate notifications, we only show native notifications manually if the app is in the foreground
        // (not hidden) BUT the user is in a different channel.
        if (!isHidden && isOtherChannel && (isMentioned || msgChannelObj?.type === 'direct' || msgChannelObj?.type === 'dm' || msgChannelObj?.type === 'group_dm')) {
          if ('Notification' in window && Notification.permission === 'granted') {
             let title = `New message from ${msg.author_name || 'someone'}`;
             if (isMentioned) title = `New mention in #${msgChannelObj?.name || 'channel'}`;
             else if (msgChannelObj?.type === 'direct' || msgChannelObj?.type === 'dm' || msgChannelObj?.type === 'group_dm') title = `New DM from ${msg.author_name || 'someone'}`;
             else title = `New message in #${msgChannelObj?.name || 'channel'}`;

             new Notification(title, {
               body: msg.body ? msg.body.substring(0, 100) : 'Sent an attachment',
             });
          }
        }
        
        setUnreadCounts(prev => {
          const current = prev[msg.channel_id] || { count: 0, hasMention: false };
          return {
            ...prev,
            [msg.channel_id]: {
              count: current.count + 1,
              hasMention: current.hasMention || isMentioned
            }
          };
        });
      } else if (msg.channel_id === activeChannelObj?.id) {
        // Message arrived in the currently active channel, so we read it immediately
        api.channels.markRead(activeChannelObj.id).catch(console.error);
      }
    };
    socket.on('message:new', handleNewMsg);
    return () => { console.log('[badge] socket listener removed'); socket.off('message:new', handleNewMsg); };
  }, [socket]); // Only depends on socket — refs handle the rest

  useEffect(() => {
    if (!socket) return;
    const handlePermissionsUpdated = (data) => {
      console.log('[permissions] Syncing updated permissions');
      setUser(prev => prev ? { ...prev, ...data } : prev);
    };
    socket.on('user:permissions_updated', handlePermissionsUpdated);
    return () => {
      socket.off('user:permissions_updated', handlePermissionsUpdated);
    };
  }, [socket, setUser]);



  const handleOpenThreads = () => {
    setActiveView('threads');
    setShowAdminPanel(false);
    setSidebarOpen(false);
  };

  const handleOpenSaved = () => {
    setActiveView('saved');
    setShowAdminPanel(false);
    setSidebarOpen(false);
  };

  const handleDMCreated = async (slug) => {
    const data = await api.channels.mine();
    setChannels(data.channels); 
    setActiveChannel(slug);
  };

  const handleGlobalSearch = (query) => {
    setGlobalSearchQuery(query);
    setActiveView('search');
    setShowAdminPanel(false);
    setSidebarOpen(false);
  };

  const hasUnreadDMs = channels?.some(ch => ch.type === 'direct' && unreadCounts[ch.id]?.count > 0) || false;

  return (
    <div className="workspace active">
      <GlobalBanner />
      <Topbar 
        user={user} 
        onOpenProfile={() => setShowProfileSettings(true)}
        onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        onJumpToChannel={(slug, msgId) => { handleChannelSelect(slug, msgId); }}
        onGlobalSearch={handleGlobalSearch}
      />
      
      <div className="main">
        <SidebarRail 
          activeView={activeView} 
          setActiveView={setActiveView} 
          onLogout={() => { localStorage.clear(); window.location.href = '/login'; }}
          onOpenProfile={() => setShowProfileSettings(true)}
          hasUnreadDMs={hasUnreadDMs}
        />
        <Sidebar 
          user={user} 
          activeView={activeView}
          activeChannel={activeChannel} 
          setActiveChannel={handleChannelSelect} 
          isAdminActive={showAdminPanel}
          onOpenCreateChannel={() => setShowCreateChannel(true)}
          onOpenNewDm={() => setShowNewDm(true)}
          onOpenThreads={handleOpenThreads}
          onOpenSaved={handleOpenSaved}
          onOpenAdmin={() => { setShowAdminPanel(true); setActiveView('chat'); setSidebarOpen(false); }}
          isOpen={sidebarOpen}
          unreadCounts={unreadCounts}
        />
        
        {!showAdminPanel ? (
          (activeView === 'chat' || activeView === 'dms') ? (
            <ChatArea 
              activeChannel={activeChannel} 
              targetMessageId={targetMessageId}
              setActiveChannel={handleChannelSelect}
            />
          ) : activeView === 'threads' ? (
            <GlobalThreadsView />
          ) : activeView === 'saved' ? (
            <GlobalSavedView />
          ) : activeView === 'search' ? (
            <GlobalSearchView 
              searchQuery={globalSearchQuery} 
              onJumpToChannel={(slug, msgId) => handleChannelSelect(slug, msgId)}
            />
          ) : activeView === 'activity' ? (
            <ActivityFeed onMessageSelect={handleChannelSelect} />
          ) : null
        ) : (
          <AdminPanel 
            onClose={() => setShowAdminPanel(false)} 
            onJumpToChannel={(slug, msgId) => handleChannelSelect(slug, msgId)}
          />
        )}
      </div>
      
      {showCreateChannel && <CreateChannelModal onClose={() => setShowCreateChannel(false)} />}
      {showNewDm && (
        <NewDmModal 
          onClose={() => setShowNewDm(false)} 
          onDMCreated={handleDMCreated} 
        />
      )}
      {showProfileSettings && <ProfileSettingsModal user={user} onClose={() => setShowProfileSettings(false)} />}
      
      {showNotifPrompt && (
        <NotificationPromptModal 
          onClose={() => {
            localStorage.setItem('hasPromptedNotifications', 'true');
            setShowNotifPrompt(false);
          }} 
        />
      )}
    </div>
  );
}
