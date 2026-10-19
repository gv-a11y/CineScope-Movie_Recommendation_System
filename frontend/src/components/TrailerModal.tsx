'use client';

import React from 'react';
import { useWishlist } from '../lib/wishlist-context';

export const TrailerModal: React.FC = () => {
  const { activeTrailer, closeTrailer } = useWishlist();

  if (!activeTrailer.open) return null;

  const src = activeTrailer.videoKey
    ? `https://www.youtube-nocookie.com/embed/${activeTrailer.videoKey}?autoplay=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&color=white&disablekb=0`
    : '';

  return (
    <div
      id="trailer-overlay"
      className="trailer-overlay active"
      role="dialog"
      aria-modal="true"
      aria-label="Movie Trailer"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeTrailer();
      }}
    >
      <div className="trailer-modal">
        <div className="trailer-header">
          <h3 id="trailer-movie-title" className="trailer-movie-title">
            {activeTrailer.title || 'Movie Trailer'}
          </h3>
          <button
            id="trailer-close-btn"
            className="trailer-close-btn"
            aria-label="Close trailer"
            onClick={closeTrailer}
          >
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="trailer-iframe-wrapper">
          {activeTrailer.loading && (
            <div id="trailer-loading" className="trailer-loading">
              <div className="trailer-spinner"></div>
              <p>Loading trailer...</p>
            </div>
          )}

          {activeTrailer.error && (
            <div id="trailer-error" className="trailer-error" style={{ display: 'flex' }}>
              <svg
                viewBox="0 0 24 24"
                width="48"
                height="48"
                fill="none"
                stroke="rgba(255,255,255,0.4)"
                stroke-width="1.5"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p>No trailer available for this movie.</p>
            </div>
          )}

          {activeTrailer.videoKey && !activeTrailer.loading && (
            <iframe
              id="trailer-iframe"
              src={src}
              frameBorder="0"
              allowFullScreen
              allow="autoplay; encrypted-media"
              style={{ display: 'block', width: '100%', height: '100%', borderRadius: 0 }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
