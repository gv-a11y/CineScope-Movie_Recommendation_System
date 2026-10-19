'use client';

import React from 'react';
import { useAuth } from '../lib/auth-context';

export const AboutModal: React.FC = () => {
  const { aboutModalOpen, setAboutModalOpen } = useAuth();

  if (!aboutModalOpen) return null;

  return (
    <div
      className="auth-overlay visible"
      id="about-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) setAboutModalOpen(false);
      }}
    >
      <div
        className="auth-modal about-modal"
        role="dialog"
        aria-modal="true"
        aria-label="About Us"
        style={{ maxWidth: '500px', textAlign: 'center' }}
      >
        <button
          className="auth-close-btn"
          id="about-close-btn"
          aria-label="Close"
          onClick={() => setAboutModalOpen(false)}
        >
          &times;
        </button>
        <div style={{ marginBottom: '24px' }}>
          <span
            className="brand-icon"
            style={{ fontSize: '3rem', color: 'var(--accent)', marginBottom: '15px', display: 'inline-block' }}
          >
            ▶
          </span>
          <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', marginBottom: '5px' }}>
            CINE<span className="highlight">SCOPE</span>
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Version 2.0.0 (Next.js & NestJS GraphQL)</p>
        </div>
        <p style={{ color: '#ccc', fontSize: '1rem', lineHeight: 1.6, marginBottom: '20px' }}>
          Welcome to CineScope! An immersive, cinematic web application for discovering your next favorite movie.
          Powered by Next.js, NestJS, GraphQL, and high-performance Collaborative Filtering.
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          © 2026 CineScope Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
};
