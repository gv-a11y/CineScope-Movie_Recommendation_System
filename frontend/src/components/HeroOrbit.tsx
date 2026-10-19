'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { ORBIT_MOVIES_QUERY, TMDB_TRENDING_QUERY } from '../lib/graphql-queries';
import gsap from 'gsap';

const ORBIT_RADIUS = 380;
const POSTER_COUNT = 8;
const SPIN_DURATION = 30;

const FALLBACK_COLORS = [
  '#059669', '#10b981', '#0d9488', '#0284c7',
  '#16a34a', '#0f766e', '#047857', '#34d399',
];

export const HeroOrbit: React.FC = () => {
  const router = useRouter();
  const orbitRingRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  const { data: orbitData } = useQuery(ORBIT_MOVIES_QUERY);
  const { data: trendingData } = useQuery(TMDB_TRENDING_QUERY);

  const [activeMovies, setActiveMovies] = useState<any[]>([]);

  useEffect(() => {
    let pool = (orbitData?.orbitMovies || []).filter((m: any) => m.posterUrl);
    if (pool.length === 0) {
      pool = (trendingData?.tmdbTrending || []).filter((m: any) => m.posterUrl);
    }

    if (pool.length > 0) {
      setActiveMovies(pool.slice(0, POSTER_COUNT));

      // Cycle posters randomly every 4 seconds
      const interval = setInterval(() => {
        if (pool.length <= POSTER_COUNT) return;
        const randomSlot = Math.floor(Math.random() * POSTER_COUNT);
        const randomPoolMovie = pool[Math.floor(Math.random() * pool.length)];

        setActiveMovies((prev) => {
          const next = [...prev];
          next[randomSlot] = randomPoolMovie;
          return next;
        });
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [orbitData, trendingData]);

  useEffect(() => {
    if (orbitRingRef.current) {
      gsap.killTweensOf(orbitRingRef.current);
      gsap.set(orbitRingRef.current, { rotateY: 0 });
      gsap.to(orbitRingRef.current, {
        rotateY: 360,
        duration: SPIN_DURATION,
        repeat: -1,
        ease: 'none',
      });
    }
  }, []);

  const handleScrollDown = () => {
    const el = document.getElementById('search-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="hero-stage" id="hero-stage" ref={heroRef}>
      {/* 3D Scene Container */}
      <div className="hero-scene">
        {/* Orbit Stage */}
        <div className="orbit-stage" id="orbit-stage">
          {/* Central TV Monitor */}
          <div className="tv-center">
            <div className="tv-frame">
              <div className="tv-screen">
                <div className="tv-screen-glow"></div>
                <div className="tv-screen-content">
                  <span className="tv-brand">CINE</span>
                  <span className="tv-brand tv-accent">SCOPE</span>
                </div>
              </div>
              <div className="tv-chin"></div>
            </div>
            <div className="tv-stand-neck"></div>
            <div className="tv-stand-base"></div>
          </div>

          {/* Orbit Ring */}
          <div className="orbit-ring" id="orbit-ring" ref={orbitRingRef}>
            {Array.from({ length: POSTER_COUNT }).map((_, i) => {
              const angle = (i / POSTER_COUNT) * 360;
              const movie = activeMovies[i];

              return (
                <div
                  key={i}
                  className="orbit-poster"
                  style={{
                    transform: `rotateY(${angle}deg) translateZ(${ORBIT_RADIUS}px)`,
                    cursor: movie?.movieId ? 'pointer' : 'default',
                    background: !movie?.posterUrl
                      ? `linear-gradient(135deg, ${FALLBACK_COLORS[i % FALLBACK_COLORS.length]}, #080c10)`
                      : undefined,
                  }}
                  onClick={() => {
                    if (movie?.movieId) {
                      router.push(`/movie/${movie.movieId}`);
                    }
                  }}
                >
                  {movie?.posterUrl ? (
                    <img
                      src={movie.posterUrl}
                      alt={movie.title || 'Movie'}
                      loading="lazy"
                      style={{ transition: 'opacity 0.6s ease' }}
                    />
                  ) : (
                    <span className="orbit-poster-label">{movie?.title || ''}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hero Text Overlay */}
      <div className="hero-text-overlay">
        <h1 className="hero-title">Experience Cinema</h1>
        <p className="hero-subtitle">Scroll down to explore the collection</p>
      </div>

      {/* Bouncing Scroll-Down Indicator */}
      <div className="scroll-down-indicator" onClick={handleScrollDown} style={{ cursor: 'pointer' }}>
        <svg viewBox="0 0 24 24" fill="none" className="chevron-svg">
          <path d="M6 9L12 15L18 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </section>
  );
};
