import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import { api } from '../api/client.js';

export default function Signup() {
  const { t, toggleLang } = useLanguage();
  const navigate = useNavigate();
  
  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    department: '',
    employment_type: 'Full-time employee',
    reports_to: ''
  });
  
  const [managers, setManagers] = useState([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Fetch managers (public endpoint)
    api.auth.getManagers()
      .then(res => {
        if (res.managers) setManagers(res.managers);
      })
      .catch(err => console.error("Could not load managers", err));
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setBusy(true);
    try {
      const data = { ...form };
      if (!data.reports_to) data.reports_to = null;
      if (!data.department) data.department = null;
      
      const res = await api.auth.signup(data);
      setSuccessMsg(res.message || 'Signup successful. Pending admin approval.');
      setTimeout(() => navigate('/login'), 4000);
    } catch (err) {
      setError(err.error || err.message || 'Failed to sign up');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card" style={{ maxWidth: '500px', width: '100%' }}>
        <button onClick={toggleLang} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
          {t('langToggle') || 'عربي'}
        </button>
        <div className="edara-logo-container">
          <div className="edara-logo-mark"><span className="edara-lm1"></span><span className="edara-lm2"></span><span className="edara-lm3"></span></div>
          <div className="edara-logo-text" style={{ 
            display: 'flex', flexDirection: 'row', alignItems: 'baseline',
            background: 'var(--panel-2)', padding: '8px 16px', borderRadius: '12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)', marginLeft: '12px', border: '1px solid var(--border)'
          }}>
            <span style={{ color: 'var(--emerald)', fontWeight: '900', fontSize: '36px', lineHeight: '1' }}>E</span>
            <span style={{ color: 'var(--text)', fontWeight: '700', fontSize: '30px', letterSpacing: '1px', lineHeight: '1' }}>teams</span>
          </div>
        </div>
        <div className="login-title">Create an Account</div>
        <div className="login-sub">Sign up for your workspace. Accounts require admin approval.</div>
        
        {successMsg ? (
          <div style={{ background: 'var(--emerald)', color: '#000', padding: '16px', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold' }}>
            {successMsg}
            <div style={{ fontSize: '12px', marginTop: '8px' }}>Redirecting to login...</div>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="login-field">
                <label>Full Name</label>
                <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. John Doe" />
              </div>
              <div className="login-field">
                <label>Username</label>
                <input type="text" required value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="john_doe" />
              </div>
            </div>
            
            <div className="login-field">
              <label>Password</label>
              <input type="password" required minLength={8} value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Min 8 characters" />
            </div>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="login-field">
                <label>Department</label>
                <select value={form.department} onChange={e => setForm({...form, department: e.target.value})}>
                  <option value="">Select department...</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Product">Product</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="HR">HR</option>
                  <option value="Finance">Finance</option>
                  <option value="Executive">Executive</option>
                  <option value="CEO">CEO</option>
                </select>
              </div>
              <div className="login-field">
                <label>Employment Type</label>
                <select value={form.employment_type} onChange={e => setForm({...form, employment_type: e.target.value})}>
                  <option value="Full-time employee">Full-time employee</option>
                  <option value="Part-time employee">Part-time employee</option>
                  <option value="Contractor">Contractor / Freelance</option>
                  <option value="Intern">Intern</option>
                </select>
              </div>
            </div>

            <div className="login-field">
              <label>Reports to (Manager)</label>
              <select value={form.reports_to} onChange={e => setForm({...form, reports_to: e.target.value})}>
                <option value="">None / N/A</option>
                {managers.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.department || 'No dept'})</option>
                ))}
              </select>
            </div>
            
            {error && <div className="login-error">{error}</div>}
            
            <button className="login-btn" type="submit" disabled={busy} style={{ marginTop: '16px' }}>
              {busy ? 'Signing up...' : 'Sign Up'}
            </button>
            
            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--text-mute)' }}>
              Already have an account? <Link to="/login" style={{ color: 'var(--emerald)', textDecoration: 'none' }}>Sign In</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
