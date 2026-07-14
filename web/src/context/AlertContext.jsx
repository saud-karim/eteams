import React, { createContext, useState, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export const AlertContext = createContext();

export function AlertProvider({ children }) {
  const [alerts, setAlerts] = useState([]);

  const addAlert = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setAlerts(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, 4000);
  }, []);

  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  useEffect(() => {
    // Override global window.alert
    window.alert = (msg) => {
      const text = String(msg);
      // Basic heuristic to guess the alert type from the text
      const lower = text.toLowerCase();
      const isError = lower.includes('error') || lower.includes('failed');
      const isSuccess = lower.includes('success') || lower.includes('updated') || lower.includes('created') || lower.includes('reactivated') || lower.includes('archived') || lower.includes('assigned') || lower.includes('copied') || lower.includes('deactivated') || lower.includes('revoked');
      
      let type = 'info';
      if (isError) type = 'error';
      else if (isSuccess) type = 'success';
      
      addAlert(text, type);
    };
  }, [addAlert]);

  return (
    <AlertContext.Provider value={addAlert}>
      {children}
      <div style={{
        position: 'fixed', bottom: '24px', right: '24px', zIndex: 999999,
        display: 'flex', flexDirection: 'column', gap: '12px', pointerEvents: 'none'
      }}>
        {alerts.map(alert => (
          <div key={alert.id} style={{
            background: 'var(--panel)',
            borderLeft: `4px solid ${alert.type === 'error' ? 'var(--danger)' : alert.type === 'success' ? 'var(--emerald)' : 'var(--brand)'}`,
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', gap: '12px',
            minWidth: '280px', maxWidth: '400px',
            pointerEvents: 'auto',
            animation: 'toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {alert.type === 'error' && <AlertCircle size={20} color="var(--danger)" />}
            {alert.type === 'success' && <CheckCircle size={20} color="var(--emerald)" />}
            {alert.type === 'info' && <Info size={20} color="var(--brand)" />}
            
            <div style={{ flex: 1, fontSize: '14px', color: 'var(--text)', lineHeight: 1.4 }}>
              {alert.message}
            </div>
            
            <button onClick={() => removeAlert(alert.id)} style={{
              background: 'none', border: 'none', color: 'var(--text-mute)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px'
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-mute)'}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toastSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </AlertContext.Provider>
  );
}
