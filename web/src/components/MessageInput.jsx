import React, { useState, useEffect } from 'react';
import { Send, File, Plus, Smile, AtSign, Bold, Italic, Strikethrough, Code, Link, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../api/client';
import EmojiPicker from './EmojiPicker';
import Avatar from './Avatar';

export default function MessageInput({ channelId, parentId }) {
  const { t } = useLanguage();
  const { users, channels } = useWorkspace();
  const { user } = useAuth();
  const socket = useSocket();
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [mentionState, setMentionState] = useState({ active: false, query: '', index: 0 });
  const [file, setFile] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const typingTimeoutRef = React.useRef(null);
  const textareaRef = React.useRef(null);
  const fileInputRef = React.useRef(null);

  const applyFormatting = (prefix, suffix = prefix) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = body.substring(start, end);
    const newText = body.substring(0, start) + prefix + selectedText + suffix + body.substring(end);
    
    setBody(newText);
    setTimeout(() => {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const handleSend = async () => {
    if ((!body.trim() && !file) || !channelId || sending) return;
    
    if (socket) socket.emit('typing:stop', { channelId, parentId });
    
    // Optimistic UI: Clear input immediately to feel instantaneous
    const sentBody = body;
    const sentFile = file;
    setBody('');
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    setSending(true);
    try {
      if (sentFile) {
        await api.messages.sendWithFile(channelId, sentBody, parentId, sentFile);
      } else {
        await api.messages.send(channelId, sentBody, parentId);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      // Revert if failed
      setBody(sentBody);
      setFile(sentFile);
    } finally {
      setSending(false);
    }
  };

  const specialMentions = [
    { id: 'channel', name: 'channel', fullname: 'Notify everyone in this channel', initials: '📢', special: true },
    { id: 'here', name: 'here', fullname: 'Notify only active members', initials: '🔔', special: true },
    { id: 'everyone', name: 'everyone', fullname: 'Notify all workspace members', initials: '🌍', special: true }
  ];

  const canMentionUsers = user?.role === 'superadmin' || user?.permissions?.['at-user'];
  
  const allPossibleMentions = [
    ...(user?.role === 'superadmin' || user?.permissions?.['at-channel'] ? [specialMentions.find(m => m.id === 'channel')] : []),
    ...(user?.role === 'superadmin' || user?.permissions?.['at-here'] ? [specialMentions.find(m => m.id === 'here')] : []),
    ...(user?.role === 'superadmin' || user?.permissions?.['at-everyone'] ? [specialMentions.find(m => m.id === 'everyone')] : []),
    ...(canMentionUsers ? users.map(u => ({ ...u, fullname: u.role || 'Member', initials: u.avatar_initials })) : [])
  ];

  const filteredMentions = mentionState.active 
    ? allPossibleMentions.filter(u => u.name.toLowerCase().includes(mentionState.query.toLowerCase()) || (u.fullname && u.fullname.toLowerCase().includes(mentionState.query.toLowerCase()))).slice(0, 8)
    : [];

  const handleKeyDown = (e) => {
    if (mentionState.active && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionState(s => ({ ...s, index: (s.index + 1) % filteredMentions.length }));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionState(s => ({ ...s, index: (s.index - 1 + filteredMentions.length) % filteredMentions.length }));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredMentions[mentionState.index]);
        return;
      }
      if (e.key === 'Escape') {
        setMentionState({ active: false, query: '', index: 0 });
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const insertMention = (user) => {
    const cursor = textareaRef.current.selectionStart;
    const textBefore = body.substring(0, cursor);
    const textAfter = body.substring(cursor);
    const match = textBefore.match(/@(\w*)$/);
    if (match) {
      const newBody = textBefore.substring(0, match.index) + `@${user.name.replace(/\s+/g, '')} ` + textAfter;
      setBody(newBody);
    }
    setMentionState({ active: false, query: '', index: 0 });
    textareaRef.current.focus();
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setBody(val);
    
    // Check for mentions
    const cursor = e.target.selectionStart;
    const textBefore = val.substring(0, cursor);
    const match = textBefore.match(/(?:\s|^)@(\w*)$/);
    
    if (match) {
      setMentionState({ active: true, query: match[1], index: 0 });
    } else {
      setMentionState({ active: false, query: '', index: 0 });
    }

    if (socket) {
      socket.emit('typing:start', { channelId, parentId });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing:stop', { channelId, parentId });
      }, 3000);
    }
  };

  const perms = user?.permissions || {};
  const isSuperadmin = user?.role === 'superadmin';
  
  let canPost = true;
  if (parentId && !isSuperadmin && !perms['thread']) canPost = false;

  const canUpload = isSuperadmin || perms['upload'] || perms['upload-large'];
  const canReact = isSuperadmin || perms['react'];

  if (!canPost) {
    return (
      <div className="message-input disabled" style={{ padding: '16px', background: 'var(--panel-2)', borderRadius: '12px', textAlign: 'center', color: 'var(--text-dim)', border: '1px solid var(--border)' }}>
        You do not have permission to post messages here.
      </div>
    );
  }

  return (
    <div className={`composer-wrap ${mentionState.active ? 'mentioning' : ''}`} style={{ position: 'relative' }}>
      {mentionState.active && filteredMentions.length > 0 && (
        <div className="mention-popup active" style={{ position: 'absolute', bottom: '100%', left: '0', marginBottom: '8px', zIndex: 60, width: '340px' }}>
          <div className="mention-head">People matching "{mentionState.query}"</div>
          <div className="mention-list">
            {filteredMentions.map((u, i) => (
              <div key={u.id} className={`mention-item ${u.special ? 'special' : ''} ${i === mentionState.index ? 'hi' : ''}`} onMouseDown={() => insertMention(u)}>
                {!u.special ? (
                  <Avatar user={u} size={24} className="avatar" />
                ) : (
                  <div className="avatar" style={{ background: 'var(--panel-2)', color: 'inherit' }}>{u.initials}</div>
                )}
                <div className="info">
                  <div className="username">@{u.name}</div>
                  <div className="fullname">{u.fullname}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="composer">
        {file && (
          <div style={{ padding: '8px 12px', background: 'var(--panel-2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <File size={16} />
            <span style={{ fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
            <button onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ display: 'flex', background: 'var(--bg)', borderRadius: '50%', padding: 4 }}><X size={12} /></button>
          </div>
        )}
        <input type="file" ref={fileInputRef} onChange={e => setFile(e.target.files[0])} style={{ display: 'none' }} />
        <textarea 
          ref={textareaRef}
          className="composer-input" 
          placeholder={t('replyPlaceholder') || 'Message...'}
          rows="2"
          value={body}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => socket && socket.emit('typing:stop', { channelId })}
        ></textarea>
        <div className="composer-bottom">
          <div className="composer-tools">
            <button className="format-btn" title="Attach" onClick={() => fileInputRef.current.click()}><Plus size={16} /></button>
            {canReact && <button className="format-btn" title="Emoji" onClick={() => setShowEmojiPicker(!showEmojiPicker)}><Smile size={16} /></button>}
            <button className="format-btn" title="Mention"><AtSign size={16} /></button>
            <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px' }}></div>
            <button className="format-btn" title="Bold" onClick={() => applyFormatting('**')}><Bold size={16} /></button>
            <button className="format-btn" title="Italic" onClick={() => applyFormatting('_')}><Italic size={16} /></button>
            <button className="format-btn" title="Strikethrough" onClick={() => applyFormatting('~~')}><Strikethrough size={16} /></button>
            <button className="format-btn" title="Code" onClick={() => applyFormatting('`')}><Code size={16} /></button>
            <button className="format-btn" title="Link" onClick={() => applyFormatting('[', '](url)')}><Link size={16} /></button>
            
            {showEmojiPicker && (
              <EmojiPicker 
                style={{ position: 'absolute', bottom: '100%', left: '30px', marginBottom: '10px' }}
                onSelect={(em) => { applyFormatting(em, ''); setShowEmojiPicker(false); }}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </div>
          <button 
            className={`composer-send ${(body.trim() || file) ? 'active' : ''}`}
            onClick={handleSend}
            disabled={sending || (!body.trim() && !file)}
          >
            <Send size={14} />
          </button>
        </div>
      </div>
      <div className="composer-hint">
        {t('messageHint')}
      </div>
    </div>
  );
}
