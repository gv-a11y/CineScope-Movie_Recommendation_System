'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWishlist } from '../lib/wishlist-context';
import { useMutation } from '@apollo/client';
import { ENSURE_LOCAL_MUTATION } from '../lib/graphql-queries';

export interface MovieCardProps {
  movie: {
    movieId?: number;
    tmdbId?: number;
    title: string;
    releaseYear?: number;
    posterUrl?: string;
    averageRating?: number;
    genres?: string;
    overview?: string;
  };
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie }) => {
  const router = useRouter();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [ensureLocalMutation] = useMutation(ENSURE_LOCAL_MUTATION);
  const [navigating, setNavigating] = useState(false);

  const wishlisted = isWishlisted(movie.movieId);

  const handleClick = async () => {
    if (navigating) return;
    if (movie.movieId) {
      router.push(`/movie/${movie.movieId}`);
      return;
    }

    if (movie.tmdbId) {
      setNavigating(true);
      try {
        const res = await ensureLocalMutation({ variables: { tmdbId: movie.tmdbId } });
        const localId = res.data?.ensureLocalMovie?.movieId;
        if (localId) {
          router.push(`/movie/${localId}`);
        }
      } catch {
        // Fallback navigation
      } finally {
        setNavigating(false);
      }
    }
  };

  const handleHeartClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleWishlist(movie);
  };

  const ratingFormatted =
    movie.averageRating !== undefined && movie.averageRating !== null
      ? (typeof movie.averageRating === 'number' ? movie.averageRating.toFixed(1) : movie.averageRating)
      : '0.0';

  return (
    <article
      className="movie-card"
      tabIndex={0}
      onClick={handleClick}
      style={{ cursor: navigating ? 'wait' : 'pointer' }}
    >
      <div className="poster-container">
        {movie.posterUrl ? (
          <img
            className="poster-img"
            src={movie.posterUrl}
            alt={movie.title || 'Movie Poster'}
            loading="lazy"
          />
        ) : (
          <div className="poster-placeholder" style={{ display: 'flex' }}>
            <svg
              viewBox="0 0 24 24"
              width="52"
              height="52"
              fill="none"
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="1.5"
            >
              <rect x="2" y="2" width="20" height="20" rx="2.5" />
              <path d="M7 2v20M17 2v20M2 12h20M2 7h5M17 7h5M2 17h5M17 17h5" />
            </svg>
            <span className="poster-placeholder-title">{movie.title}</span>
          </div>
        )}

        {/* Heart badge */}
        <button
          className={`card-heart-btn ${wishlisted ? 'in-wishlist' : ''}`}
          aria-label="My List"
          onClick={handleHeartClick}
          title={wishlisted ? 'Remove from My List' : 'Add to My List'}
        >
          <svg
            className="card-heart-icon"
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill={wishlisted ? '#e50914' : 'none'}
            stroke={wishlisted ? '#e50914' : 'currentColor'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      <div className="card-details">
        <h3 className="card-title" title={movie.title}>
          {movie.title}
        </h3>
        <p className="card-meta">
          <span className="card-year">{movie.releaseYear || ''}</span> &bull;{' '}
          <span style={{ color: '#ffd700' }}>★</span>{' '}
          <span className="card-rating">{ratingFormatted}</span>/5.0
        </p>
        <p className="card-genres">{movie.genres || ''}</p>
      </div>
    </article>
  );
};
