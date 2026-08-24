import React from 'react';
import { Hash, MessageSquare, Bell, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import { useLanguage } from '../context/LanguageContext';

export default function SidebarRail({ activeView, setActiveView, onLogout, onOpenProfile, hasUnreadDMs }) {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="sidebar-rail">
      <div className="rail-top">
        <div 
          className={`rail-item ${activeView === 'chat' || activeView === 'threads' || activeView === 'saved' ? 'active' : ''}`}
          onClick={() => setActiveView('chat')}
          title={t('channels') || 'Channels'}
        >
          <Hash size={24} />
        </div>
        <div 
          className={`rail-item ${activeView === 'dms' ? 'active' : ''}`}
          onClick={() => setActiveView('dms')}
          title={t('directMessages') || 'Direct Messages'}
          style={{ position: 'relative' }}
        >
          <MessageSquare size={24} />
          {hasUnreadDMs && <div className="unread-dot" />}
        </div>
        <div 
          className={`rail-item ${activeView === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveView('activity')}
          title={t('activity') || 'Activity'}
        >
          <Bell size={24} />
        </div>
      </div>
      <div className="rail-bottom">
        <div className="rail-item profile" onClick={onOpenProfile} title="Profile">
          <Avatar user={user} size={32} />
        </div>
        <div className="rail-item logout" onClick={onLogout} title="Logout">
          <LogOut size={24} />
        </div>
      </div>
    </div>
  );
}
