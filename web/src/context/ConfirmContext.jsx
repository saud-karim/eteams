import React, { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmContext = createContext();

export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }) {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    isDanger: false,
    resolve: null
  });

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        title: options.title || 'Confirm Action',
        message: options.message || 'Are you sure you want to proceed?',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        isDanger: options.isDanger || false,
        resolve
      });
    });
  }, []);

  const handleConfirm = () => {
    if (modalState.resolve) modalState.resolve(true);
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleCancel = () => {
    if (modalState.resolve) modalState.resolve(false);
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {modalState.isOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999
        }}>
          <div className="modal-content" style={{
            background: 'var(--panel)', width: '400px', maxWidth: '90%',
            borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            border: '1px solid var(--border)', overflow: 'hidden', animation: 'modalFadeIn 0.2s ease-out'
          }}>
            <div style={{
              padding: '20px', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: modalState.isDanger ? 'var(--danger)' : 'var(--text)' }}>
                {modalState.isDanger && <AlertTriangle size={18} />}
                {modalState.title}
              </h3>
              <button onClick={handleCancel} style={{ background: 'none', border: 'none', color: 'var(--text-mute)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '24px 20px', fontSize: '14px', color: 'var(--text-dim)', lineHeight: 1.5 }}>
              {modalState.message}
            </div>
            <div style={{
              padding: '16px 20px', background: 'var(--panel-2)', borderTop: '1px solid var(--border)',
              display: 'flex', justifyContent: 'flex-end', gap: '12px'
            }}>
              <button onClick={handleCancel} className="admin-btn-ghost">
                {modalState.cancelText}
              </button>
              <button onClick={handleConfirm} className={modalState.isDanger ? 'admin-btn-danger' : 'admin-btn-primary'}>
                {modalState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
