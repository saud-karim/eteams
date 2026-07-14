import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const { t, toggleLang } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try { await login(email, password); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <button onClick={toggleLang} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
          {t('langToggle')}
        </button>
        <div className="login-brand">
          <div className="login-logo-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 12h16M4 18h10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="login-brand-name"><span className="accent">E</span>Teams</div>
          <div className="login-brand-sub">EDARA · A SODIC Company</div>
        </div>
        <div className="login-title">{t('signInTitle')}</div>
        <div className="login-sub">{t('signInSub')}</div>
        <form onSubmit={onSubmit}>
          <div className="login-field">
            <label>{t('workEmail')}</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="login-field">
            <label>{t('password')}</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <div className="login-error">{error}</div>}
          <button className="login-btn" type="submit" disabled={busy}>
            {busy ? t('signingIn') : t('signInBtn')}
          </button>
          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--text-mute)' }}>
            Don't have an account? <a href="/signup" style={{ color: 'var(--emerald)', textDecoration: 'none' }}>Sign Up</a>
          </div>
        </form>
      </div>
    </div>
  );
}
