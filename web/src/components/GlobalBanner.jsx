import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useSocket } from '../context/SocketContext';
import { X, Megaphone, AlertTriangle, Info } from 'lucide-react';

export default function GlobalBanner() {
  const socket = useSocket();
  const { theme } = useTheme();
  const [broadcast, setBroadcast] = useState(null);

  useEffect(() => {
    if (!socket) return;
    
    const handleBroadcast = (b) => {
      // In a real app we might check if this broadcast was meant for this user's department
      setBroadcast(b);
    };

    socket.on('system_broadcast', handleBroadcast);
    return () => {
      socket.off('system_broadcast', handleBroadcast);
    };
  }, [socket]);

  if (!broadcast) return null;

  const isLight = theme === 'light';

  const bgGradients = {
    emergency: isLight ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.02))' : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(185, 28, 28, 0.05))',
    important: isLight ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.02))' : 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.05))',
    informational: isLight ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.02))' : 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(29, 78, 216, 0.05))'
  };
  
  const borderColors = {
    emergency: isLight ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.5)',
    important: isLight ? 'rgba(245, 158, 11, 0.3)' : 'rgba(245, 158, 11, 0.5)',
    informational: isLight ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.5)'
  };

  const textColors = {
    emergency: isLight ? '#b91c1c' : '#fca5a5',
    important: isLight ? '#b45309' : '#fcd34d',
    informational: isLight ? '#1d4ed8' : '#93c5fd'
  };
  
  const icons = {
    emergency: <AlertTriangle size={22} color={textColors.emergency} />,
    important: <Megaphone size={22} color={textColors.important} />,
    informational: <Info size={22} color={textColors.informational} />
  };

  return (
    <div style={{
      position: 'fixed',
      top: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: '600px',
      background: 'var(--panel)',
      backgroundImage: bgGradients[broadcast.type] || bgGradients.informational,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: `1px solid ${borderColors[broadcast.type] || borderColors.informational}`,
      borderRadius: '16px',
      color: 'var(--text)',
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px',
      zIndex: 99999,
      boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px ${borderColors[broadcast.type] || borderColors.informational}`,
      animation: 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <style>
        {`
          @keyframes slideDown {
            from { transform: translate(-50%, -100%); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
          }
        `}
      </style>
      
      <div style={{ 
        marginTop: '2px', 
        background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.2)', 
        padding: '10px', 
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: isLight ? '1px solid rgba(0,0,0,0.05)' : '1px solid rgba(255,255,255,0.05)'
      }}>
        {icons[broadcast.type] || icons.informational}
      </div>
      
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontWeight: '700', 
          fontSize: '15px', 
          marginBottom: '6px',
          color: textColors[broadcast.type] || textColors.informational,
          letterSpacing: '0.3px'
        }}>
          {broadcast.type === 'emergency' ? 'EMERGENCY BROADCAST' : broadcast.type === 'important' ? 'IMPORTANT UPDATE' : 'SYSTEM ANNOUNCEMENT'}
        </div>
        <div style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--text-light)', marginBottom: '10px' }}>
          {broadcast.message_body}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: textColors[broadcast.type] || textColors.informational }}></span>
          Sent by <strong>{broadcast.sender_name}</strong> at {new Date(broadcast.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </div>
      </div>
      
      <button 
        onClick={() => setBroadcast(null)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-dim)',
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)';
          e.currentTarget.style.color = 'var(--text)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--text-dim)';
        }}
      >
        <X size={18} />
      </button>
    </div>
  );
}
