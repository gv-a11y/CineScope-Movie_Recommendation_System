'use client';

import React, { useState } from 'react';
import { useAuth } from '../lib/auth-context';

export const AuthModal: React.FC = () => {
  const { authModalOpen, setAuthModalOpen, authModalTab, setAuthModalTab, login, register, adminLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!authModalOpen) return null;

  const handleClose = () => {
    setAuthModalOpen(false);
    setError('');
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check if admin login credentials
    if (email === 'admin' && password === 'admin123') {
      setLoading(true);
      const res = await adminLogin({ username: 'admin', password: 'admin123' });
      setLoading(false);
      if (!res.success) setError(res.error || 'Admin login failed');
      return;
    }

    if (!email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    const res = await login({ email: email.trim(), password });
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Invalid email or password.');
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const res = await register({ username: username.trim(), email: email.trim(), password });
    setLoading(false);
    if (!res.success) {
      setError(res.error || 'Registration failed.');
    }
  };

  return (
    <div
      className="auth-overlay visible"
      id="auth-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="auth-modal" id="auth-modal" role="dialog" aria-modal="true" aria-label="Sign in or create account">
        <button className="auth-close-btn" id="auth-close-btn" aria-label="Close" onClick={handleClose}>
          &times;
        </button>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${authModalTab === 'login' ? 'active' : ''}`}
            id="tab-login"
            onClick={() => {
              setAuthModalTab('login');
              setError('');
            }}
          >
            Login
          </button>
          <button
            className={`auth-tab ${authModalTab === 'signup' ? 'active' : ''}`}
            id="tab-signup"
            onClick={() => {
              setAuthModalTab('signup');
              setError('');
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Error message */}
        {error && (
          <p className="auth-error" id="auth-error" style={{ display: 'block' }}>
            {error}
          </p>
        )}

        {/* LOGIN FORM */}
        {authModalTab === 'login' ? (
          <form className="auth-form active" id="form-login" onSubmit={handleLoginSubmit} noValidate>
            <div className="auth-field">
              <label htmlFor="login-email">Email or Username</label>
              <input
                type="text"
                id="login-email"
                placeholder="you@example.com (or admin)"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="auth-field password-field">
              <label htmlFor="login-password">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  aria-label="Toggle password visibility"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="eye-icon"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {showPassword ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              <span className={`btn-label ${loading ? 'hidden' : ''}`}>Login</span>
              <span className={`btn-spinner ${loading ? '' : 'hidden'}`}></span>
            </button>
            <p className="auth-switch">
              No account?{' '}
              <a
                href="#"
                id="switch-to-signup"
                onClick={(e) => {
                  e.preventDefault();
                  setAuthModalTab('signup');
                  setError('');
                }}
              >
                Create one
              </a>
            </p>
          </form>
        ) : (
          /* SIGN UP FORM */
          <form className="auth-form active" id="form-signup" onSubmit={handleSignupSubmit} noValidate>
            <div className="auth-field">
              <label htmlFor="signup-username">Username</label>
              <input
                type="text"
                id="signup-username"
                placeholder="moviefan99"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="auth-field">
              <label htmlFor="signup-email">Email</label>
              <input
                type="email"
                id="signup-email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="auth-field password-field">
              <label htmlFor="signup-password">
                Password <span className="field-hint">(min. 6 chars)</span>
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="signup-password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  aria-label="Toggle password visibility"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="eye-icon"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {showPassword ? (
                      <>
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </>
                    ) : (
                      <>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              <span className={`btn-label ${loading ? 'hidden' : ''}`}>Create Account</span>
              <span className={`btn-spinner ${loading ? '' : 'hidden'}`}></span>
            </button>
            <p className="auth-switch">
              Already have an account?{' '}
              <a
                href="#"
                id="switch-to-login"
                onClick={(e) => {
                  e.preventDefault();
                  setAuthModalTab('login');
                  setError('');
                }}
              >
                Login
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};
