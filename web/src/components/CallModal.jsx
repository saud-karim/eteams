import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Video, PhoneOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Avatar from './Avatar';

export default function CallModal({ isOpen, onClose, channel }) {
  const { user } = useAuth();
  const [micMuted, setMicMuted] = useState(false);
  const [status, setStatus] = useState('Connecting...');
  const [timer, setTimer] = useState(0);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setMicMuted(false);
      setStatus('Connecting...');
      setTimer(0);
      
      if (channel?.slug) {
        api.channels.get(channel.slug).then(res => setMembers(res.members || [])).catch(console.error);
      }

      const to = setTimeout(() => {
        setStatus('Connected • 3 participants');
      }, 1200);
      const int = setInterval(() => {
        setTimer(t => t + 1);
      }, 1000);
      return () => { clearTimeout(to); clearInterval(int); };
    }
  }, [isOpen, channel?.slug]);

  if (!isOpen) return null;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="modal-backdrop active" onClick={onClose}>
      <div className="call-modal" onClick={e => e.stopPropagation()}>
        <Avatar user={user} size={80} className="call-avatar" style={{ margin: '0 auto 16px', borderRadius: '50%' }} />
        <div className="call-name">Voice call • #{channel?.slug || 'channel'}</div>
        <div className="call-status">{members.length > 0 && timer > 0 ? `Connected • ${members.length} participants` : status}</div>
        <div className="call-timer">{formatTime(timer)}</div>
        <div className="call-controls">
          <button className={`call-btn mute ${micMuted ? 'on' : ''}`} onClick={() => setMicMuted(!micMuted)} title="Mute">
            {micMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
          <button className="call-btn video" title="Start video" onClick={() => alert('Video calling not available yet.')}>
            <Video size={22} />
          </button>
          <button className="call-btn end" onClick={onClose} title="End call">
            <PhoneOff size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}
