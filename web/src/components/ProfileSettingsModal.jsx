import React, { useState } from 'react';
import { X, User, Save, CheckCircle, Camera } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import Avatar from './Avatar';

export default function ProfileSettingsModal({ onClose, user }) {
  const { t } = useLanguage();
  const { setUser } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    job_title: user?.job_title || '',
    email: user?.email || '',
    phone: user?.phone || '',
    currentPassword: '',
    newPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const res = await api.users.updateAvatar(file);
      setUser(prev => ({ ...prev, ...res.user }));
    } catch (err) {
      setError(err.message || 'Failed to upload avatar');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Name cannot be empty');
    setSaving(true);
    setError('');
    try {
      const res = await api.users.updateMe({ name: form.name, job_title: form.job_title, email: form.email, phone: form.phone });
      setUser(prev => ({ ...prev, ...res.user }));
      
      if (form.currentPassword || form.newPassword) {
        if (!form.currentPassword) return setError('Current password required to change password');
        if (form.newPassword.length < 6) return setError('New password must be at least 6 characters');
        await api.users.updatePassword(form.currentPassword, form.newPassword);
        setForm(f => ({ ...f, currentPassword: '', newPassword: '' }));
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop active" onClick={onClose}>
      <div className="big-modal" style={{ width: '500px', position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', right: '16px', top: '16px', color: 'var(--text-dim)', background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
        
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={20} /> {t('profileSettingsTitle')}
        </h3>
        <div className="msub">{t('profileSub')}</div>
        
        <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Avatar user={{ ...user, name: form.name }} size={100} />
            <label style={{ 
              display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', 
              color: 'var(--primary)', cursor: avatarUploading ? 'default' : 'pointer', opacity: avatarUploading ? 0.5 : 1 
            }}>
              <Camera size={14} />
              {avatarUploading ? 'Uploading...' : 'Change'}
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} disabled={avatarUploading} />
            </label>
          </div>
          
          <div style={{ flex: 1 }}>
            <div className="form-field">
              <label>{t('fullName')}</label>
              <input 
                type="text" 
                value={form.name} 
                readOnly
                style={{ opacity: 0.6 }}
              />
            </div>
            <div className="form-field">
              <label>{t('jobTitle')}</label>
              <input 
                type="text" 
                value={form.job_title} 
                readOnly
                style={{ opacity: 0.6 }}
              />
            </div>
          </div>
        </div>
        
        <div className="form-field" style={{ marginTop: '16px' }}>
          <label>{t('username')}</label>
          <input type="text" defaultValue={user?.username || ''} readOnly style={{ opacity: 0.6 }} />
        </div>

        <div style={{ display: 'flex', gap: '20px', marginTop: '16px' }}>
          <div className="form-field" style={{ flex: 1 }}>
            <label>{t('emailAddress', 'Email Address')}</label>
            <input 
              type="email" 
              value={form.email} 
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="e.g. user@example.com"
            />
          </div>
          <div className="form-field" style={{ flex: 1 }}>
            <label>{t('phoneNumber', 'Phone Number')}</label>
            <input 
              type="text" 
              value={form.phone} 
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="e.g. +1234567890"
            />
          </div>
        </div>



        <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-dim)', marginTop: '24px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('changePassword', 'Change Password (Optional)')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-field">
            <input 
              type="password" 
              value={form.currentPassword}
              onChange={e => setForm(f => ({ ...f, currentPassword: e.target.value }))}
              placeholder="Current password"
            />
          </div>
          <div className="form-field">
            <input 
              type="password" 
              value={form.newPassword}
              onChange={e => setForm(f => ({ ...f, newPassword: e.target.value }))}
              placeholder="New password (min 6 chars)"
            />
          </div>
        </div>

        {error && (
          <div style={{ color: 'var(--red)', fontSize: '13px', marginTop: '8px', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px' }}>
            {error}
          </div>
        )}

        {saved && (
          <div style={{ color: 'var(--emerald)', fontSize: '13px', marginTop: '8px', padding: '8px 12px', background: 'rgba(59,167,214,0.1)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={14} /> {t('profileSaved', 'Profile saved successfully!')}
          </div>
        )}
        
        <div className="modal-footer" style={{ marginTop: '24px' }}>
          <button className="btn-cancel" onClick={onClose}>{t('cancel')}</button>
          <button 
            className="btn-primary" 
            onClick={handleSave}
            disabled={saving}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {saving ? 'Saving...' : <><Save size={14} /> Save Profile</>}
          </button>
        </div>
      </div>
    </div>
  );
}
