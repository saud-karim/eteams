import React, { useState } from 'react';
import { X, User, Save, CheckCircle } from 'lucide-react';
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
    status_text: user?.status_text || '',
    currentPassword: '',
    newPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Name cannot be empty');
    setSaving(true);
    setError('');
    try {
      const res = await api.users.updateMe({ name: form.name, job_title: form.job_title, status_text: form.status_text });
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
          <Avatar user={{ ...user, name: form.name }} size={100} style={{ flexShrink: 0 }} />
          
          <div style={{ flex: 1 }}>
            <div className="form-field">
              <label>{t('fullName')}</label>
              <input 
                type="text" 
                value={form.name} 
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Your full name"
              />
            </div>
            <div className="form-field">
              <label>{t('jobTitle')}</label>
              <input 
                type="text" 
                value={form.job_title} 
                onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))}
                placeholder="e.g. Software Engineer"
              />
            </div>
          </div>
        </div>
        
        <div className="form-field" style={{ marginTop: '16px' }}>
          <label>{t('username')}</label>
          <input type="text" defaultValue={user?.username || ''} readOnly style={{ opacity: 0.6 }} />
        </div>

        <div className="form-field" style={{ marginTop: '4px' }}>
          <label>Status Message</label>
          <input 
            type="text" 
            value={form.status_text}
            onChange={e => setForm(f => ({ ...f, status_text: e.target.value }))}
            placeholder="e.g. In a meeting, Working from home..."
            maxLength={100}
          />
        </div>

        <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-dim)', marginTop: '24px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Change Password (Optional)</div>
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
            <CheckCircle size={14} /> Profile saved successfully!
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
