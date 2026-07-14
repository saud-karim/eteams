import { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { Download, File as FileIcon, Forward } from 'lucide-react';
import ForwardModal from './ForwardModal';
import { useConfirm } from '../context/ConfirmContext';
import Avatar from './Avatar';
import EmojiPicker from './EmojiPicker';

function renderBody(body) {
  return body
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<b>$1</b>')
    .replace(/_(.+?)_/g, '<i>$1</i>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/~(.+?)~/g, '<s>$1</s>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/@(channel|here|everyone)\b/g, '<span class="mention channel-wide">@$1</span>')
    .replace(/@([a-zA-Z0-9._-]+)/g, '<span class="mention">@$1</span>')
    .replace(/\n/g, '<br>');
}

export default function Message({ message, author, currentUser, onReply, canPin = false, canDeleteOthers = false }) {
  const confirm = useConfirm();
  const [showActions, setShowActions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [editBody, setEditBody] = useState(message.body);
  const [isSaved, setIsSaved] = useState(!!message.is_saved);
  
  // Optimistic UI states
  const [localReactions, setLocalReactions] = useState(null);
  const [localIsPinned, setLocalIsPinned] = useState(null);
  
  const reactionsToDisplay = localReactions !== null ? localReactions : (message.reactions || []);
  const isPinnedToDisplay = localIsPinned !== null ? localIsPinned : message.is_pinned;

  useEffect(() => { setLocalReactions(null); }, [message.reactions]);
  useEffect(() => { setLocalIsPinned(null); }, [message.is_pinned]);

  const isMine = message.user_id === currentUser.id;
  const isCEO = author?.role === 'superadmin';
  const canReact = currentUser.role === 'superadmin' || currentUser.permissions?.['react'];

  const react = async (emoji) => {
    setShowEmojiPicker(false);
    
    const currentReactions = localReactions !== null ? [...localReactions] : [...(message.reactions || [])];
    const existingIdx = currentReactions.findIndex(r => r.emoji === emoji);
    
    if (existingIdx !== -1) {
      const r = currentReactions[existingIdx];
      const hasReacted = r.user_ids.includes(currentUser.id);
      if (hasReacted) {
        const newUserIds = r.user_ids.filter(id => id !== currentUser.id);
        if (newUserIds.length === 0) currentReactions.splice(existingIdx, 1);
        else currentReactions[existingIdx] = { ...r, count: r.count - 1, user_ids: newUserIds };
      } else {
        currentReactions[existingIdx] = { ...r, count: r.count + 1, user_ids: [...r.user_ids, currentUser.id] };
      }
    } else {
      currentReactions.push({ emoji, count: 1, user_ids: [currentUser.id] });
    }
    setLocalReactions(currentReactions);
    
    try { await api.messages.react(message.id, emoji); } catch { setLocalReactions(null); }
  };
  
  const remove = async () => {
    const ok = await confirm({
      title: 'Delete Message',
      message: 'Are you sure you want to delete this message? This action cannot be undone.',
      isDanger: true,
      confirmText: 'Delete'
    });
    if (!ok) return;
    try { await api.messages.remove(message.id); } catch (err) { alert(err.message); }
  };
  const saveEdit = async () => {
    try { await api.messages.edit(message.id, editBody); setEditing(false); } catch (err) { alert(err.message); }
  };
  
  const togglePin = async () => { 
    const nextState = !isPinnedToDisplay;
    setLocalIsPinned(nextState);
    try { await api.messages.togglePin(message.id, nextState); } catch { setLocalIsPinned(null); } 
  };

  const toggleSave = async () => {
    try {
      const saved = !isSaved;
      setIsSaved(saved);
      await api.messages.toggleSave(message.id, saved);
    } catch { setIsSaved(!isSaved); }
  };

  return (
    <div
      id={`msg-${message.id}`}
      className={`message ${isPinnedToDisplay ? 'pinned' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="msg-avatar" style={{ background: 'transparent' }}>
        <Avatar user={author} size={36} />
      </div>
      <div className="msg-body">
        <div className="msg-head">
          <span className="msg-author">{author?.name || 'Unknown'}</span>
          {isCEO && <span className="msg-badge ceo">CEO</span>}
          {author?.role === 'admin' && <span className="msg-badge admin">ADMIN</span>}
          <span className="msg-time">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {message.edited_at && <span className="msg-edited">(edited)</span>}
        </div>
        
        {editing ? (
          <div style={{ marginTop: '4px' }}>
            <textarea 
              value={editBody} 
              onChange={e => setEditBody(e.target.value)}
              style={{ width: '100%', background: 'var(--panel-2)', border: '1px solid var(--emerald)', color: 'var(--text)', padding: '8px', borderRadius: '8px', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button onClick={saveEdit} style={{ background: 'var(--emerald)', color: 'white', padding: '4px 12px', borderRadius: '4px', fontSize: '12px' }}>Save</button>
              <button onClick={() => { setEditing(false); setEditBody(message.body); }} style={{ background: 'var(--panel-3)', color: 'var(--text)', padding: '4px 12px', borderRadius: '4px', fontSize: '12px' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className="msg-text" dangerouslySetInnerHTML={{ __html: renderBody(message.body) }} />
        )}

        {message.attachments && message.attachments.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            {message.attachments.map(att => {
              const isImage = att.mime_type.startsWith('image/');
              const url = `http://localhost:4000/${att.storage_key}`;
              return (
                <div key={att.id} className="attachment">
                  {isImage ? (
                    <img src={url} alt={att.original_name} style={{ maxWidth: '100%', maxHeight: '300px', display: 'block', objectFit: 'contain', background: 'var(--panel-2)' }} />
                  ) : (
                    <div className="attachment-file">
                      <div className="file-icon"><FileIcon size={20} /></div>
                      <div className="file-info">
                        <div className="file-name">{att.original_name}</div>
                        <div className="file-meta">{(att.size_bytes / 1024).toFixed(1)} KB</div>
                      </div>
                      <a href={url} download={att.original_name} target="_blank" rel="noreferrer" className="attachment-download">
                        <Download size={16} />
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {reactionsToDisplay.length > 0 && (
          <div className="reactions">
            {reactionsToDisplay.map(r => (
              <button
                key={r.emoji}
                className={`reaction ${r.user_ids.includes(currentUser.id) ? 'mine' : ''} ${!canReact ? 'disabled' : ''}`}
                onClick={() => canReact && react(r.emoji)}
                style={!canReact ? { cursor: 'default' } : {}}
              >
                {r.emoji} <span className="count">{r.count}</span>
              </button>
            ))}
            {canReact && <button className="reaction-add" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>+</button>}
          </div>
        )}
      </div>
      {showActions && !editing && (
        <div className="msg-actions">
          {onReply && (currentUser.role === 'superadmin' || currentUser.permissions?.['thread']) && (
            <button className="msg-action" onClick={onReply} title="Reply">💬</button>
          )}
          <button className="msg-action" onClick={() => setShowForwardModal(true)} title="Forward"><Forward size={14} /></button>
          {(currentUser.role === 'superadmin' || currentUser.permissions?.['react']) && (
            <button className="msg-action" onClick={() => setShowEmojiPicker(!showEmojiPicker)} title="React">😊</button>
          )}
          <button className="msg-action" onClick={toggleSave} title={isSaved ? "Unsave" : "Save"}>{isSaved ? '🏷️' : '🔖'}</button>
          {canPin && <button className="msg-action" onClick={togglePin} title={isPinnedToDisplay ? "Unpin" : "Pin"}>📌</button>}
          {isMine && (currentUser.role === 'superadmin' || currentUser.permissions?.['edit-own']) && <button className="msg-action" onClick={() => setEditing(true)} title="Edit">✏️</button>}
          {(isMine && (currentUser.role === 'superadmin' || currentUser.permissions?.['delete-own'])) || (!isMine && canDeleteOthers) ? <button className="msg-action danger" onClick={remove} title="Delete">🗑️</button> : null}
        </div>
      )}
      {showEmojiPicker && (
        <EmojiPicker 
          onSelect={react}
          onClose={() => setShowEmojiPicker(false)}
        />
      )}
      <ForwardModal 
        isOpen={showForwardModal} 
        onClose={() => setShowForwardModal(false)} 
        message={message} 
      />
    </div>
  );
}
