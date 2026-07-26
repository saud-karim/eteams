import React from 'react';
import { Hash, Lock, Megaphone, User } from 'lucide-react';

export default function ChannelIcon({ type, name, size = 16, color, className = '', style = {} }) {
  const isCeo = name === 'ceo-announcements';
  
  if (type === 'announcement') {
    return <Megaphone size={size} color={isCeo ? '#F59E0B' : color} className={className} style={style} />;
  }
  if (type === 'private') return <Lock size={size} color={color} className={className} style={style} />;
  if (type === 'dm') return <User size={size} color={color} className={className} style={style} />;
  return <Hash size={size} color={color} className={className} style={style} />;
}
