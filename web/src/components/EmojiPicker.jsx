import React, { useRef, useEffect } from 'react';

export default function EmojiPicker({ onSelect, onClose, style, className = '' }) {
  const pickerRef = useRef(null);
  const mountTime = useRef(Date.now());

  const handleSelect = (em) => {
    if (Date.now() - mountTime.current < 300) return; // Prevent ghost clicks
    onSelect(em);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div 
      className={`emoji-picker active ${className}`} 
      style={{ zIndex: 70, ...style }}
      ref={pickerRef}
    >
      <div className="emoji-search">
        <input type="text" placeholder="Search emoji..." />
      </div>
      <div className="emoji-scroll">
        <div className="emoji-cat">Frequently Used</div>
        <div className="emoji-grid">
          {['👍', '❤️', '😂', '😢', '🔥', '🎉', '👀', '🙏'].map(em => (
            <button key={em} onClick={() => handleSelect(em)}>{em}</button>
          ))}
        </div>
        <div className="emoji-cat">Smileys</div>
        <div className="emoji-grid">
          {['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '🥲'].map(em => (
            <button key={em} onClick={() => handleSelect(em)}>{em}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
