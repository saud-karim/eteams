import React, { useState } from 'react';
import { X, Hash, Crown, Megaphone, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../api/client';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';

export default function CreateChannelModal({ onClose }) {
  const { t } = useLanguage();
  const { setChannels } = useWorkspace();
  const { user } = useAuth();
  
  const canCreatePublic = user?.role === 'superadmin' || user?.permissions?.['create-public'];
  const canCreatePrivate = user?.role === 'superadmin' || user?.permissions?.['create-private'];
  const canCreateAnnouncement = user?.role === 'superadmin' || user?.permissions?.['create-announcement'];

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState(canCreatePublic ? 'public' : (canCreatePrivate ? 'private' : 'announce'));
  const [isReadonly, setIsReadonly] = useState(false);
  const [isMandatory, setIsMandatory] = useState(false);
  const [color, setColor] = useState('');
  const [icon, setIcon] = useState('megaphone');
  const [loading, setLoading] = useState(false);

  const CHANNEL_COLORS = ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#D946EF', '#F43F5E'];

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await api.channels.create({
        name,
        description,
        type: type === 'announce' ? 'announcement' : type,
        is_readonly: isReadonly,
        is_mandatory: isMandatory,
        color: color || undefined,
        icon: type === 'announce' ? icon : undefined
      });
      setChannels(prev => [...prev, res.channel]);
      onClose();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Error creating channel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop active" style={{ zIndex: 9999 }}>
      <div className="big-modal" style={{ position: 'relative' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', right: '16px', top: '16px', color: 'var(--text-dim)', background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
        
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Hash size={20} /> {t('createChannelTitle')}
        </h3>
        <div className="msub">{t('channelDescription')}</div>
        
        <div className="form-field">
          <label>{t('channelNameLabel')}</label>
          <input type="text" placeholder={t('channelNamePlaceholder')} value={name} onChange={e => setName(e.target.value)} />
        </div>
        
        <div className="form-field">
          <label>{t('descriptionLabel')}</label>
          <input type="text" placeholder={t('descriptionPlaceholder')} value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <div className="form-field">
          <label>Channel Color (Optional)</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
            {CHANNEL_COLORS.map(c => (
              <div 
                key={c}
                onClick={() => setColor(color === c ? '' : c)}
                style={{
                  width: '24px', height: '24px', borderRadius: '50%', backgroundColor: c,
                  cursor: 'pointer', border: color === c ? '2px solid var(--text)' : '2px solid transparent',
                  boxShadow: color === c ? '0 0 0 2px var(--bg)' : 'none'
                }}
              />
            ))}
          </div>
        </div>
        
        {type === 'announce' && (
          <div className="form-field">
            <label>Channel Icon</label>
            <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
              {[
                { id: 'megaphone', icon: <Megaphone size={20} /> },
                { id: 'crown', icon: <Crown size={20} /> },
                { id: 'sparkles', icon: <Sparkles size={20} /> }
              ].map(item => (
                <div 
                  key={item.id}
                  onClick={() => setIcon(item.id)}
                  style={{
                    width: '40px', height: '40px', borderRadius: '8px', 
                    backgroundColor: icon === item.id ? 'var(--panel-3)' : 'var(--panel-2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', border: icon === item.id ? '1px solid var(--emerald)' : '1px solid transparent',
                    color: color || 'var(--text)'
                  }}
                >
                  {item.icon}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="form-row">
          <div className="form-field">
            <label>{t('typeLabel')}</label>
            <select value={type} onChange={e => setType(e.target.value)}>
              {canCreatePublic && <option value="public">{t('publicChannel')}</option>}
              {canCreatePrivate && <option value="private">{t('privateChannel')}</option>}
              {canCreateAnnouncement && <option value="announce">{t('announcementChannel')}</option>}
            </select>
          </div>
          <div className="form-field">
            <label>Access</label>
            <select value={isReadonly ? 'true' : 'false'} onChange={e => setIsReadonly(e.target.value === 'true')}>
              <option value="false">Anyone can post</option>
              <option value="true">Read-only (Managers only)</option>
            </select>
          </div>
        </div>
        
        <label className="perm-check" style={{ marginTop: '12px', alignItems: 'flex-start' }}>
          <input 
            type="checkbox" 
            checked={isMandatory} 
            onChange={e => setIsMandatory(e.target.checked)} 
            style={{ marginTop: '4px' }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontWeight: '500', color: 'var(--text)' }}>Make this channel mandatory for everyone</span>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Automatically adds all active users in the system to this channel.</span>
          </div>
        </label>
        
        <div className="modal-footer">
          <button className="admin-btn-ghost" onClick={onClose} disabled={loading}>{t('cancel')}</button>
          <button className="admin-btn-primary" onClick={handleCreate} disabled={loading}>{t('createChannelButton')}</button>
        </div>
      </div>
    </div>
  );
}
