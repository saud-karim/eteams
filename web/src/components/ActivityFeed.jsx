import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare, AtSign, Loader2 } from 'lucide-react';
import Avatar from './Avatar';
import { api } from '../api/client';

export default function ActivityFeed({ onMessageSelect }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const res = await api.messages.getMentions();
        setActivities(res.mentions || []);
      } catch (err) {
        console.error('Failed to fetch activities:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, []);

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="chat-area" style={{ backgroundColor: 'var(--bg)', padding: '24px', overflowY: 'auto' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', color: 'var(--text)' }}>
          <Bell size={24} color="var(--emerald)" /> Activity
        </h2>
        
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', marginTop: '48px', display: 'flex', justifyContent: 'center' }}>
            <Loader2 className="spinner" size={24} />
          </div>
        ) : activities.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', marginTop: '48px' }}>
            No recent activity.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {activities.map(activity => (
              <div key={activity.id} style={{ 
                backgroundColor: 'var(--panel)', 
                borderRadius: '12px', 
                padding: '16px', 
                border: '1px solid var(--border)',
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start',
                cursor: 'pointer'
              }} onClick={() => onMessageSelect?.(activity.channel_slug, activity.id)}>
                <div style={{ position: 'relative' }}>
                  <Avatar user={{ name: activity.author_name || 'Unknown', avatar: activity.author_avatar }} size={40} />
                  <div style={{ 
                    position: 'absolute', bottom: -4, right: -4, 
                    backgroundColor: 'var(--panel)', borderRadius: '50%', padding: '2px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <AtSign size={14} color="var(--emerald)" />
                  </div>
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text)' }}>
                      <strong>{activity.author_name || 'Unknown'}</strong> mentioned you in <strong>#{activity.channel_name || activity.channel_slug}</strong>
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-mute)' }}>{formatDate(activity.created_at)}</span>
                  </div>
                  <div style={{ 
                    backgroundColor: 'var(--panel-2)', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    fontSize: '14px', 
                    color: 'var(--text-dim)',
                    marginTop: '8px'
                  }}>
                    {activity.body}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
