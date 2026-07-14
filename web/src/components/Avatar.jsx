import React from 'react';

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_BG = {
  emerald: 'linear-gradient(135deg, #3BA7D6, #22D3EE)',
  amber: 'linear-gradient(135deg, #FCD34D, #F59E0B)',
  blue: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
  coral: 'linear-gradient(135deg, #EC4899, #BE185D)',
  purple: 'linear-gradient(135deg, #A78BFA, #7C3AED)',
};

const AVATAR_TEXT = {
  amber: '#4A3600',
  default: 'white',
};

export default function Avatar({ user, size = 32, className = '', style = {}, showPresence = false, onClick, title }) {
  if (!user) return null;
  
  const initials = getInitials(user.name);
  const colorName = (user.avatar_color || 'emerald').replace('var(--', '').replace(')', '');
  const bg = AVATAR_BG[colorName] || `var(--${colorName})`;
  const txt = AVATAR_TEXT[colorName] || AVATAR_TEXT.default;
  
  return (
    <div 
      onClick={onClick}
      className={`avatar-wrapper ${className}`} 
      title={title || user.name}
      style={{ 
        width: size, 
        height: size, 
        position: 'relative',
        display: 'inline-block',
        cursor: onClick ? 'pointer' : 'default',
        ...style 
      }}
    >
      <div 
        style={{ 
          width: '100%', 
          height: '100%', 
          background: bg, 
          borderRadius: '25%', // Slight rounded corners for modern look
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: txt,
          fontWeight: 600,
          fontSize: Math.max(10, size * 0.4),
          userSelect: 'none'
        }}
      >
        {initials}
      </div>
      {showPresence && (
        <span 
          className={`presence-dot ${user.presence || 'offline'}`}
          style={{
            width: Math.max(8, size * 0.25),
            height: Math.max(8, size * 0.25),
            bottom: -2,
            right: -2
          }}
        />
      )}
    </div>
  );
}
