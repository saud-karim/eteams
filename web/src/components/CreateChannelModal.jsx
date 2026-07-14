import React, { useState } from 'react';
import { X, Hash } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await api.channels.create({
        name,
        description,
        type: type === 'announce' ? 'announcement' : type,
        is_readonly: isReadonly,
        is_mandatory: isMandatory
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
