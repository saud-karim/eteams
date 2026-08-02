import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const { t, toggleLang } = useLanguage();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try { await login(username, password); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <button onClick={toggleLang} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
          {t('langToggle')}
        </button>
        <div className="edara-logo-container">
          <div className="edara-logo-mark"><span className="edara-lm1"></span><span className="edara-lm2"></span><span className="edara-lm3"></span></div>
          <div className="edara-logo-text"><div className="edara-lt1">EDARA</div><div className="edara-lt2">A SODIC Company</div><div className="edara-logo-mod">Eteams</div></div>
        </div>
        <div className="login-title">{t('signInTitle')}</div>
        <div className="login-sub">{t('signInSub')}</div>
        <form onSubmit={onSubmit}>
          <div className="login-field">
            <label>{t('username')}</label>
            <input type="text" required value={username} onChange={e => setUsername(e.target.value)} />
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
