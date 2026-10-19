'use client';

import React from 'react';
import { useWishlist } from '../lib/wishlist-context';

export const Toast: React.FC = () => {
  const { toast } = useWishlist();

  if (!toast.show) return null;

  const bg =
    toast.type === 'success'
      ? '#2e7d32'
      : toast.type === 'error'
      ? '#c62828'
      : '#1565c0';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 999999,
        background: bg,
        color: '#fff',
        padding: '12px 24px',
        borderRadius: '8px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '0.95rem',
        fontWeight: 600,
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <span>{toast.message}</span>
    </div>
  );
};
