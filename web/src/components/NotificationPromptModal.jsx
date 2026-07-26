import React from 'react';
import { Bell, X } from 'lucide-react';
import { api } from '../api/client';
import { requestFirebaseNotificationPermission } from '../firebase';

export default function NotificationPromptModal({ onClose }) {
  const handleEnable = async () => {
    if ('Notification' in window) {
      const token = await requestFirebaseNotificationPermission();
      if (token) {
        try {
          await api.users.saveFcmToken(token);
          new Notification("Enabled", { body: "You will now receive desktop notifications!" });
        } catch (err) {
          console.error('Error saving FCM token:', err);
        }
      }
    }
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'var(--panel)', padding: '24px', borderRadius: '12px',
        width: '400px', maxWidth: '90%', position: 'relative',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', color: 'var(--primary)' }}>
          <Bell size={48} />
        </div>
        
        <h2 style={{ margin: '0 0 12px 0', fontSize: '20px', textAlign: 'center' }}>
          Enable Notifications
        </h2>
        
        <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: 'var(--text-dim)', textAlign: 'center', lineHeight: '1.5' }}>
          Never miss an important message! Enable push notifications to stay updated when you are mentioned or receive direct messages, even when the app is closed.
        </p>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '10px', background: 'var(--panel-2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
          >
            Not Now
          </button>
          <button
            onClick={handleEnable}
            style={{ flex: 1, padding: '10px', background: 'var(--primary)', border: 'none', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
          >
            Turn On
          </button>
        </div>
      </div>
    </div>
  );
}
