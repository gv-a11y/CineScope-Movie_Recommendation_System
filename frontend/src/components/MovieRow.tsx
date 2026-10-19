'use client';

import React, { useRef } from 'react';
import { MovieCard } from './MovieCard';

interface MovieRowProps {
  id: string;
  title: string;
  badge?: string;
  badgeStyle?: React.CSSProperties;
  movies: any[];
  loading?: boolean;
}

export const MovieRow: React.FC<MovieRowProps> = ({
  id,
  title,
  badge,
  badgeStyle,
  movies,
  loading,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: number) => {
    if (scrollRef.current) {
      const scrollAmount = 800 * direction;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!loading && (!movies || movies.length === 0)) {
    return null;
  }

  return (
    <section className="horizontal-row-section" id={`${id}-section`}>
      <div className="section-title-row">
        <h2 className="section-title">{title}</h2>
        {badge && (
          <span className="section-badge live-badge" style={badgeStyle}>
            {badge}
          </span>
        )}
      </div>
      <div className="row-container">
        <button
          className="scroll-btn left-btn"
          aria-label="Scroll left"
          onClick={() => scroll(-1)}
        >
          &#10094;
        </button>
        <div className="horizontal-scroll" id={id} ref={scrollRef}>
          {loading ? (
            <div className="row-loading-spinner" style={{ margin: '40px auto' }}></div>
          ) : (
            movies.map((m, idx) => (
              <MovieCard key={m.movieId || m.tmdbId || idx} movie={m} />
            ))
          )}
        </div>
        <button
          className="scroll-btn right-btn"
          aria-label="Scroll right"
          onClick={() => scroll(1)}
        >
          &#10095;
        </button>
      </div>
    </section>
  );
};
