'use client';

import React from 'react';
import { useAuth } from '../lib/auth-context';

export const ProfileModal: React.FC = () => {
  const { user, profileModalOpen, setProfileModalOpen } = useAuth();

  if (!profileModalOpen || !user) return null;

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  return (
    <div
      className="auth-overlay visible"
      id="profile-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) setProfileModalOpen(false);
      }}
    >
      <div
        className="auth-modal profile-modal"
        id="profile-modal"
        role="dialog"
        aria-modal="true"
        aria-label="My Profile"
      >
        <button
          className="auth-close-btn"
          id="profile-close-btn"
          aria-label="Close"
          onClick={() => setProfileModalOpen(false)}
        >
          &times;
        </button>
        <div className="profile-header-view">
          <div className="profile-avatar-large" id="profile-modal-avatar">
            {getInitials(user.username)}
          </div>
          <h3 className="profile-modal-name" id="profile-modal-name">
            {user.username}
          </h3>
          <p className="profile-modal-email" id="profile-modal-email">
            {user.email}
          </p>
        </div>

        <div className="profile-stats-grid">
          <div className="profile-stat-box">
            <span className="stat-label">Member Since</span>
            <span className="stat-value" id="profile-modal-join-date">
              {user.joinDate || 'Recently'}
            </span>
          </div>
          <div className="profile-stat-box">
            <span className="stat-label">Wished Movies</span>
            <span className="stat-value" id="profile-modal-wishlist-count">
              {user.wishlistCount || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
