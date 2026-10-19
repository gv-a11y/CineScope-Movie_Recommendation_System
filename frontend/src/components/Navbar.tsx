'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../lib/auth-context';

export const Navbar: React.FC = () => {
  const {
    user,
    logout,
    setAuthModalOpen,
    setAuthModalTab,
    setProfileModalOpen,
    setSettingsModalOpen,
    setAboutModalOpen,
    setAdminMovieModalOpen,
  } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const getInitials = (username: string) => {
    return username.slice(0, 2).toUpperCase();
  };

  return (
    <header className="global-navbar">
      <div className="nav-container">
        <Link href="/" className="brand-logo" style={{ textDecoration: 'none', color: '#ffffff' }}>
          <span className="brand-icon">▶</span>
          <span className="brand-text" style={{ color: '#ffffff' }}>
            <span style={{ color: '#ffffff' }}>CINE</span><span className="highlight">SCOPE</span>
          </span>
        </Link>

        <nav className="nav-links">
          <Link href="/">Movies</Link>
          <Link href="/mylist">My List</Link>
        </nav>

        <div className="profile-icon" ref={dropdownRef}>
          <button
            id="profile-btn"
            className={`avatar ${user ? 'logged-in' : ''}`}
            aria-label="Open profile menu"
            title="Account"
            onClick={(e) => {
              e.stopPropagation();
              setDropdownOpen(!dropdownOpen);
            }}
          >
            {user ? getInitials(user.username) : ''}
          </button>

          {/* Unified Dropdown */}
          <div className={`profile-dropdown ${dropdownOpen ? 'visible' : ''}`} id="profile-dropdown">
            {!user ? (
              <div id="dropdown-logged-out">
                <a
                  href="#"
                  className="dropdown-item"
                  id="dropdown-signin"
                  onClick={(e) => {
                    e.preventDefault();
                    setDropdownOpen(false);
                    setAuthModalTab('login');
                    setAuthModalOpen(true);
                  }}
                >
                  Sign In
                </a>
                <a
                  href="#"
                  className="dropdown-item"
                  id="dropdown-signup"
                  onClick={(e) => {
                    e.preventDefault();
                    setDropdownOpen(false);
                    setAuthModalTab('signup');
                    setAuthModalOpen(true);
                  }}
                >
                  Sign Up
                </a>
              </div>
            ) : (
              <div id="dropdown-logged-in">
                <div className="dropdown-user-info">
                  <p className="profile-dropdown-name">{user.username}</p>
                  <p className="profile-dropdown-email">{user.email}</p>
                </div>
                <hr className="dropdown-divider" />
                <a
                  href="#"
                  className="dropdown-item"
                  id="dropdown-my-profile"
                  onClick={(e) => {
                    e.preventDefault();
                    setDropdownOpen(false);
                    setProfileModalOpen(true);
                  }}
                >
                  My Profile
                </a>
                {user.isAdmin && (
                  <a
                    href="#"
                    className="dropdown-item"
                    id="dropdown-add-movie"
                    style={{ color: '#4caf50', fontWeight: 600 }}
                    onClick={(e) => {
                      e.preventDefault();
                      setDropdownOpen(false);
                      setAdminMovieModalOpen(true);
                    }}
                  >
                    ➕ Add Movie (Admin)
                  </a>
                )}
              </div>
            )}

            {/* Shared items */}
            <a
              href="#"
              className="dropdown-item"
              id="dropdown-settings"
              onClick={(e) => {
                e.preventDefault();
                setDropdownOpen(false);
                setSettingsModalOpen(true);
              }}
            >
              Settings
            </a>
            <a
              href="#"
              className="dropdown-item"
              id="dropdown-about"
              onClick={(e) => {
                e.preventDefault();
                setDropdownOpen(false);
                setAboutModalOpen(true);
              }}
            >
              About Us
            </a>

            {/* Logout button */}
            {user && (
              <div id="dropdown-logout-container">
                <hr className="dropdown-divider" />
                <button
                  className="dropdown-item text-danger"
                  id="logout-btn"
                  onClick={async () => {
                    setDropdownOpen(false);
                    await logout();
                  }}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
