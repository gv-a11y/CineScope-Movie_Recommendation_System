'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth-context';

export const SettingsModal: React.FC = () => {
  const { settingsModalOpen, setSettingsModalOpen } = useAuth();
  const [darkMode, setDarkMode] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [dataSaver, setDataSaver] = useState(false);
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('userPreferredLanguage') || 'en';
      setLanguage(savedLang);
    }
  }, []);

  if (!settingsModalOpen) return null;

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('userPreferredLanguage', lang);
      // Trigger a storage event so homepage components re-fetch language movies
      window.dispatchEvent(new Event('languageChange'));
    }
  };

  return (
    <div
      className="auth-overlay visible"
      id="settings-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) setSettingsModalOpen(false);
      }}
    >
      <div
        className="auth-modal settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        style={{ maxWidth: '450px' }}
      >
        <button
          className="auth-close-btn"
          id="settings-close-btn"
          aria-label="Close"
          onClick={() => setSettingsModalOpen(false)}
        >
          &times;
        </button>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '24px' }}>Settings</h3>

        <div className="settings-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Toggle Item 1: Dark Mode */}
          <div
            className="setting-item"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '10px',
            }}
          >
            <div>
              <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 600 }}>Dark Mode</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Enable dark cinematic theme</div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} />
              <span className="slider"></span>
            </label>
          </div>

          {/* Toggle Item 2: Email Notifications */}
          <div
            className="setting-item"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '10px',
            }}
          >
            <div>
              <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 600 }}>Email Notifications</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Get alerts for new recommendations</div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} />
              <span className="slider"></span>
            </label>
          </div>

          {/* Toggle Item 3: Data Saver */}
          <div
            className="setting-item"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '10px',
            }}
          >
            <div>
              <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 600 }}>Data Saver</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Reduce image quality on slow networks</div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={dataSaver} onChange={(e) => setDataSaver(e.target.checked)} />
              <span className="slider"></span>
            </label>
          </div>

          {/* Language Selection */}
          <div
            className="setting-item"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '10px',
            }}
          >
            <div>
              <div style={{ fontSize: '1rem', color: 'var(--text-primary)', fontWeight: 600 }}>Movie Language</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Discover movies in your language</div>
            </div>
            <select
              id="user-language-select"
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <option value="en" style={{ color: '#000' }}>English (Default)</option>
              <option value="hi" style={{ color: '#000' }}>Hindi</option>
              <option value="es" style={{ color: '#000' }}>Spanish</option>
              <option value="fr" style={{ color: '#000' }}>French</option>
              <option value="te" style={{ color: '#000' }}>Telugu</option>
              <option value="ta" style={{ color: '#000' }}>Tamil</option>
              <option value="ml" style={{ color: '#000' }}>Malayalam</option>
              <option value="ko" style={{ color: '#000' }}>Korean</option>
              <option value="ja" style={{ color: '#000' }}>Japanese</option>
              <option value="zh" style={{ color: '#000' }}>Chinese</option>
              <option value="de" style={{ color: '#000' }}>German</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
