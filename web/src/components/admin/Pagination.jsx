import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '15px', padding: '10px 0', borderTop: '1px solid var(--border)' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} entries
      </div>
      <div style={{ display: 'flex', gap: '5px' }}>
        <button 
          className="admin-btn-ghost" 
          onClick={() => onPageChange(currentPage - 1)} 
          disabled={currentPage === 1}
          style={{ padding: '4px 8px', display: 'flex', alignItems: 'center' }}
        >
          <ChevronLeft size={14} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px' }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              style={{
                background: currentPage === page ? 'var(--emerald)' : 'transparent',
                color: currentPage === page ? '#fff' : 'var(--text-main)',
                border: '1px solid',
                borderColor: currentPage === page ? 'var(--emerald)' : 'var(--border)',
                borderRadius: '4px',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              {page}
            </button>
          ))}
        </div>
        <button 
          className="admin-btn-ghost" 
          onClick={() => onPageChange(currentPage + 1)} 
          disabled={currentPage === totalPages}
          style={{ padding: '4px 8px', display: 'flex', alignItems: 'center' }}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
