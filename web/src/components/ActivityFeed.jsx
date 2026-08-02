import React from 'react';
import { Bell, MessageSquare, AtSign } from 'lucide-react';
import Avatar from './Avatar';

export default function ActivityFeed() {
  // Temporary mock data. You would fetch this from a real notifications endpoint
  const mockActivities = [
    {
      id: 1,
      type: 'mention',
      actorName: 'Omar Khaled',
      actorAvatar: null,
      channelName: 'marketing',
      content: 'Can you check the new campaign assets?',
      time: '10m ago'
    },
    {
      id: 2,
      type: 'reply',
      actorName: 'Sarah Ahmed',
      actorAvatar: null,
      channelName: 'general',
      content: 'I agree, let\'s proceed with the second option.',
      time: '1h ago'
    }
  ];

  return (
    <div className="chat-area" style={{ backgroundColor: 'var(--bg)', padding: '24px', overflowY: 'auto' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', color: 'var(--text)' }}>
          <Bell size={24} color="var(--emerald)" /> Activity
        </h2>
        
        {mockActivities.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', marginTop: '48px' }}>
            No recent activity.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {mockActivities.map(activity => (
              <div key={activity.id} style={{ 
                backgroundColor: 'var(--panel)', 
                borderRadius: '12px', 
                padding: '16px', 
                border: '1px solid var(--border)',
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start'
              }}>
                <div style={{ position: 'relative' }}>
                  <Avatar user={{ name: activity.actorName, avatar: activity.actorAvatar }} size={40} />
                  <div style={{ 
                    position: 'absolute', bottom: -4, right: -4, 
                    backgroundColor: 'var(--panel)', borderRadius: '50%', padding: '2px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {activity.type === 'mention' ? (
                      <AtSign size={14} color="var(--emerald)" />
                    ) : (
                      <MessageSquare size={14} color="var(--blue)" />
                    )}
                  </div>
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', color: 'var(--text)' }}>
                      <strong>{activity.actorName}</strong> {activity.type === 'mention' ? 'mentioned you in' : 'replied to your thread in'} <strong>#{activity.channelName}</strong>
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--text-mute)' }}>{activity.time}</span>
                  </div>
                  <div style={{ 
                    backgroundColor: 'var(--panel-2)', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    fontSize: '14px', 
                    color: 'var(--text-dim)',
                    marginTop: '8px'
                  }}>
                    {activity.content}
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
