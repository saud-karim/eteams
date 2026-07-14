import React from 'react';
import { Hash, Lock, Megaphone, User } from 'lucide-react';

export default function ChannelIcon({ type, size = 16, color, className = '', style = {} }) {
  if (type === 'announcement') return <Megaphone size={size} color={color || "var(--gold)"} className={className} style={style} />;
  if (type === 'private') return <Lock size={size} color={color} className={className} style={style} />;
  if (type === 'dm') return <User size={size} color={color} className={className} style={style} />;
  return <Hash size={size} color={color} className={className} style={style} />;
}
