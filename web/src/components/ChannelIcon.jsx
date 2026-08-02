import React from 'react';
import { Hash, Lock, Megaphone, User, Crown, Sparkles } from 'lucide-react';

export default function ChannelIcon({ type, name, icon, size = 16, color, className = '', style = {} }) {
  if (type === 'announcement') {
    if (icon === 'crown') return <Crown size={size} color={color} className={className} style={style} />;
    if (icon === 'sparkles') return <Sparkles size={size} color={color} className={className} style={style} />;
    return <Megaphone size={size} color={color} className={className} style={style} />;
  }
  if (type === 'private') return <Lock size={size} color={color} className={className} style={style} />;
  if (type === 'dm') return <User size={size} color={color} className={className} style={style} />;
  return <Hash size={size} color={color} className={className} style={style} />;
}
