'use client';

import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { useAuth } from '../lib/auth-context';
import { ADMIN_ADD_MOVIE_MUTATION } from '../lib/graphql-queries';
import { useWishlist } from '../lib/wishlist-context';

export const AdminAddMovieModal: React.FC = () => {
  const { adminMovieModalOpen, setAdminMovieModalOpen } = useAuth();
  const { showToast } = useWishlist();

  const [title, setTitle] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [tmdbId, setTmdbId] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [genres, setGenres] = useState('');
  const [overview, setOverview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [addMovieMutation] = useMutation(ADMIN_ADD_MOVIE_MUTATION);

  if (!adminMovieModalOpen) return null;

  const handleClose = () => {
    setAdminMovieModalOpen(false);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim() || !releaseYear) {
      setError('Title and Release Year are required.');
      return;
    }

    const yearNum = parseInt(releaseYear, 10);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      setError('Please provide a valid 4-digit release year.');
      return;
    }

    const genresList = genres
      ? genres.split(',').map((g) => g.trim()).filter(Boolean)
      : [];

    setLoading(true);
    try {
      const res = await addMovieMutation({
        variables: {
          input: {
            title: title.trim(),
            releaseYear: yearNum,
            tmdbId: tmdbId ? parseInt(tmdbId, 10) : undefined,
            posterUrl: posterUrl.trim() || undefined,
            genres: genresList.length > 0 ? genresList : undefined,
            overview: overview.trim() || undefined,
          },
        },
      });

      if (res.data?.adminAddMovie?.success) {
        setSuccess(res.data.adminAddMovie.message || 'Movie added successfully!');
        showToast('Movie added successfully!', 'success');
        setTitle('');
        setReleaseYear('');
        setTmdbId('');
        setPosterUrl('');
        setGenres('');
        setOverview('');
      } else {
        setError(res.data?.adminAddMovie?.message || 'Failed to add movie');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred adding movie');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="auth-overlay visible"
      id="admin-movie-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="auth-modal"
        id="admin-movie-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Add New Movie"
        style={{ maxWidth: '500px' }}
      >
        <button className="auth-close-btn" id="admin-movie-close-btn" aria-label="Close" onClick={handleClose}>
          &times;
        </button>
        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '20px', textAlign: 'center' }}>
          Add New Movie
        </h3>

        {error && (
          <p className="auth-error" id="admin-movie-error" style={{ display: 'block' }}>
            {error}
          </p>
        )}
        {success && (
          <p className="auth-success" id="admin-movie-success" style={{ display: 'block', color: '#4caf50', textAlign: 'center', marginBottom: '15px' }}>
            {success}
          </p>
        )}

        <form className="auth-form active" id="form-admin-movie" onSubmit={handleSubmit} noValidate>
          <div className="auth-field">
            <label htmlFor="admin-movie-title">Movie Title *</label>
            <input
              type="text"
              id="admin-movie-title"
              placeholder="e.g. Inception"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="auth-field" style={{ flex: 1 }}>
              <label htmlFor="admin-movie-year">Release Year *</label>
              <input
                type="number"
                id="admin-movie-year"
                placeholder="e.g. 2010"
                min="1900"
                max="2100"
                value={releaseYear}
                onChange={(e) => setReleaseYear(e.target.value)}
                required
              />
            </div>
            <div className="auth-field" style={{ flex: 1 }}>
              <label htmlFor="admin-movie-tmdb">TMDB ID (Optional)</label>
              <input
                type="number"
                id="admin-movie-tmdb"
                placeholder="e.g. 27205"
                value={tmdbId}
                onChange={(e) => setTmdbId(e.target.value)}
              />
            </div>
          </div>
          <div className="auth-field">
            <label htmlFor="admin-movie-poster">Poster URL (Optional)</label>
            <input
              type="url"
              id="admin-movie-poster"
              placeholder="https://example.com/poster.jpg"
              value={posterUrl}
              onChange={(e) => setPosterUrl(e.target.value)}
            />
          </div>
          <div className="auth-field">
            <label htmlFor="admin-movie-genres">Genres (Comma separated)</label>
            <input
              type="text"
              id="admin-movie-genres"
              placeholder="Action, Sci-Fi, Thriller"
              value={genres}
              onChange={(e) => setGenres(e.target.value)}
            />
          </div>
          <div className="auth-field">
            <label
              htmlFor="admin-movie-overview"
              style={{
                display: 'block',
                marginBottom: '8px',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Overview
            </label>
            <textarea
              id="admin-movie-overview"
              rows={3}
              placeholder="A thief who steals corporate secrets..."
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            ></textarea>
          </div>
          <button type="submit" className="auth-submit-btn" style={{ background: '#4caf50' }} disabled={loading}>
            <span className={`btn-label ${loading ? 'hidden' : ''}`}>Add Movie</span>
            <span className={`btn-spinner ${loading ? '' : 'hidden'}`}></span>
          </button>
        </form>
      </div>
    </div>
  );
};
