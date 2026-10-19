'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client';
import {
  SEARCH_MOVIES_QUERY,
  GENRES_QUERY,
  MOVIES_BY_GENRE_QUERY,
  RECOMMENDATIONS_QUERY,
  TMDB_BY_LANGUAGE_QUERY,
  ENSURE_LOCAL_MUTATION,
} from '../lib/graphql-queries';
import { MovieCard } from './MovieCard';
import { useWishlist } from '../lib/wishlist-context';

const LANGUAGES = [
  { code: 'hi', name: 'Hindi' },
  { code: 'te', name: 'Telugu' },
  { code: 'ta', name: 'Tamil' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'kn', name: 'Kannada' },
  { code: 'mr', name: 'Marathi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'ko', name: 'Korean' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'de', name: 'German' },
  { code: 'en', name: 'English' },
];

export const SearchSection: React.FC = () => {
  const { openTrailer } = useWishlist();

  // Search mode: 'title' | 'genre' | 'language'
  const [searchMode, setSearchMode] = useState<'title' | 'genre' | 'language'>('title');

  // Title search state
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Recommendation / Results state
  const [selectedMovie, setSelectedMovie] = useState<any | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [resultsTitle, setResultsTitle] = useState('');
  const [loadingResults, setLoadingResults] = useState(false);

  // Genre mode state
  const [genres, setGenres] = useState<any[]>([]);
  const [selectedGenreIds, setSelectedGenreIds] = useState<Set<number>>(new Set());

  // Language mode state
  const [selectedLanguage, setSelectedLanguage] = useState<string>('hi');
  const [yearStart, setYearStart] = useState<string>('');
  const [yearEnd, setYearEnd] = useState<string>('');

  // GraphQL queries
  const [searchMoviesQuery] = useLazyQuery(SEARCH_MOVIES_QUERY);
  const [fetchGenresQuery] = useLazyQuery(GENRES_QUERY);
  const [fetchMoviesByGenreQuery] = useLazyQuery(MOVIES_BY_GENRE_QUERY);
  const [fetchRecommendationsQuery] = useLazyQuery(RECOMMENDATIONS_QUERY);
  const [fetchTmdbByLanguageQuery] = useLazyQuery(TMDB_BY_LANGUAGE_QUERY);
  const [ensureLocalMutation] = useMutation(ENSURE_LOCAL_MUTATION);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Title autocomplete search
  useEffect(() => {
    if (searchMode !== 'title' || query.trim().length < 2) {
      setSearchResults([]);
      setDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await searchMoviesQuery({ variables: { query: query.trim(), type: 'title' } });
        const list = res.data?.searchMovies || [];
        setSearchResults(list.slice(0, 8));
        setDropdownOpen(list.length > 0);
      } catch {
        setSearchResults([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, searchMode]);

  // Load genres when switching to genre mode
  useEffect(() => {
    if (searchMode === 'genre' && genres.length === 0) {
      fetchGenresQuery().then((res) => {
        if (res.data?.genres) {
          setGenres(res.data.genres);
        }
      });
    }
  }, [searchMode]);

  const toggleSearchMode = () => {
    if (searchMode === 'title') setSearchMode('genre');
    else if (searchMode === 'genre') setSearchMode('language');
    else setSearchMode('title');
    setDropdownOpen(false);
  };

  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (searchMode !== 'title' || !query.trim() || query.trim().length < 2) return;

    setDropdownOpen(false);
    setSelectedMovie(null);
    setLoadingResults(true);
    setResultsTitle(`Search Results for "${query.trim()}"`);

    try {
      const res = await searchMoviesQuery({ variables: { query: query.trim(), type: 'title' } });
      const list = res.data?.searchMovies || [];
      setRecommendations(list);
    } catch {
      setRecommendations([]);
    } finally {
      setLoadingResults(false);
      setTimeout(() => {
        const el = document.getElementById('recommendations-section');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  const handleSelectMovie = async (movie: any) => {
    setDropdownOpen(false);
    setQuery(movie.title);
    setSelectedMovie(movie);
    setLoadingResults(true);

    let mid = movie.movieId;
    if (!mid && movie.tmdbId) {
      try {
        const res = await ensureLocalMutation({ variables: { tmdbId: movie.tmdbId } });
        mid = res.data?.ensureLocalMovie?.movieId;
      } catch {
        // Fallback
      }
    }

    if (mid) {
      try {
        const recRes = await fetchRecommendationsQuery({ variables: { movieId: mid } });
        const recs = recRes.data?.recommendations || [];
        setRecommendations(recs);
      } catch {
        setRecommendations([]);
      }
    } else {
      setRecommendations([]);
    }
    setLoadingResults(false);

    // Scroll smoothly to recommendation section
    const el = document.getElementById('recommendations-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleGenreToggle = (genreId: number) => {
    setSelectedGenreIds((prev) => {
      const next = new Set(prev);
      if (next.has(genreId)) next.delete(genreId);
      else next.add(genreId);
      return next;
    });
  };

  const handleShowGenreMovies = async () => {
    if (selectedGenreIds.size === 0) return;
    setLoadingResults(true);
    setSelectedMovie(null);

    const ids = Array.from(selectedGenreIds);
    const selectedNames = genres
      .filter((g) => selectedGenreIds.has(g.genreId))
      .map((g) => g.genreName)
      .join(', ');

    setResultsTitle(`Movies in: ${selectedNames}`);
    try {
      const res = await fetchMoviesByGenreQuery({ variables: { ids } });
      setRecommendations(res.data?.moviesByGenre || []);
    } catch {
      setRecommendations([]);
    } finally {
      setLoadingResults(false);
    }

    const el = document.getElementById('recommendations-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleShowLanguageMovies = async () => {
    setLoadingResults(true);
    setSelectedMovie(null);

    const langObj = LANGUAGES.find((l) => l.code === selectedLanguage);
    setResultsTitle(`${langObj?.name || 'Regional'} Movies`);

    const yStart = yearStart ? parseInt(yearStart, 10) : undefined;
    const yEnd = yearEnd ? parseInt(yearEnd, 10) : undefined;

    try {
      const res = await fetchTmdbByLanguageQuery({
        variables: { langCode: selectedLanguage, yearStart: yStart, yearEnd: yEnd },
      });
      setRecommendations(res.data?.tmdbByLanguage || []);
    } catch {
      setRecommendations([]);
    } finally {
      setLoadingResults(false);
    }

    const el = document.getElementById('recommendations-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <section className="search-section" id="search-section">
        <div className="search-container" ref={searchContainerRef}>
          <h2 className="search-heading">What are you in the mood for?</h2>
          <p className="search-subheading">
            Search by <span id="search-mode-label">{searchMode}</span> to discover personalised recommendations
          </p>

          <div className="search-input-wrapper">
            {/* Search Type Toggle */}
            <button
              id="search-type-toggle"
              className="search-type-toggle"
              title="Switch search type"
              aria-label="Toggle search type"
              onClick={toggleSearchMode}
            >
              {searchMode === 'title' && (
                <span id="toggle-title-icon" className="toggle-icon">
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="2.5" />
                    <path d="M7 2v20M17 2v20M2 12h20M2 7h5M17 7h5M2 17h5M17 17h5" />
                  </svg>
                  <span className="toggle-label">Title</span>
                </span>
              )}

              {searchMode === 'genre' && (
                <span id="toggle-genre-icon" className="toggle-icon">
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                  <span className="toggle-label">Genre</span>
                </span>
              )}

              {searchMode === 'language' && (
                <span id="toggle-language-icon" className="toggle-icon">
                  <svg
                    viewBox="0 0 24 24"
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                  <span className="toggle-label">Language</span>
                </span>
              )}
            </button>

            {/* Search Icon */}
            <div className="search-icon-inner">
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2" />
                <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

            <input
              type="text"
              id="movie-search-input"
              placeholder={
                searchMode === 'title'
                  ? 'Search movie by title (e.g. Matrix, Toy Story, Inception)...'
                  : searchMode === 'genre'
                  ? 'Select genres below...'
                  : 'Select language below...'
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchSubmit();
                }
              }}
              disabled={searchMode !== 'title'}
              autoComplete="off"
            />

            {/* Clear and Submit Actions */}
            {searchMode === 'title' && (
              <div className="search-actions-right">
                {query.length > 0 && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => {
                      setQuery('');
                      setSearchResults([]);
                      setDropdownOpen(false);
                    }}
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
                <button
                  type="button"
                  id="search-btn"
                  className="search-submit-btn"
                  onClick={() => handleSearchSubmit()}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <span>Search</span>
                </button>
              </div>
            )}

            {/* Live Dropdown */}
            {dropdownOpen && searchResults.length > 0 && (
              <div className="search-dropdown active visible" id="search-dropdown">
                <ul id="search-results-list">
                  {searchResults.map((m, idx) => (
                    <li
                      key={m.movieId || m.tmdbId || idx}
                      className="search-result-item"
                      tabIndex={0}
                      onClick={() => handleSelectMovie(m)}
                    >
                      <div className="result-poster-wrapper">
                        {m.posterUrl && <img className="result-poster" src={m.posterUrl} alt="Poster" />}
                      </div>
                      <div className="result-info">
                        <span className="result-title">{m.title}</span>
                        <span className="result-year">{m.releaseYear || ''}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Genre Chip Panel */}
          {searchMode === 'genre' && (
            <div id="genre-panel" className="genre-panel" style={{ display: 'block' }}>
              <div className="genre-chips-header">
                <span className="genre-chips-hint">Select one or more genres</span>
                <button
                  id="genre-clear-btn"
                  className="genre-clear-btn"
                  onClick={() => setSelectedGenreIds(new Set())}
                >
                  Clear All
                </button>
              </div>
              <div id="genre-chips-container" className="genre-chips-container">
                {genres.map((g) => {
                  const active = selectedGenreIds.has(g.genreId);
                  return (
                    <button
                      key={g.genreId}
                      className={`genre-chip ${active ? 'active' : ''}`}
                      onClick={() => handleGenreToggle(g.genreId)}
                    >
                      {g.genreName}
                    </button>
                  );
                })}
              </div>
              <button
                id="genre-show-movies-btn"
                className="genre-show-movies-btn"
                disabled={selectedGenreIds.size === 0}
                onClick={handleShowGenreMovies}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Show Movies ({selectedGenreIds.size})
              </button>
            </div>
          )}

          {/* Language Chip Panel */}
          {searchMode === 'language' && (
            <div id="language-panel" className="genre-panel" style={{ display: 'block' }}>
              <div className="genre-chips-header">
                <span className="genre-chips-hint">Select a language</span>
              </div>
              <div id="language-chips-container" className="genre-chips-container">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    className={`genre-chip ${selectedLanguage === l.code ? 'active' : ''}`}
                    onClick={() => setSelectedLanguage(l.code)}
                  >
                    {l.name}
                  </button>
                ))}
              </div>

              {/* Year Filter Bar */}
              <div id="year-filter-bar" className="year-filter-bar" style={{ display: 'flex', marginTop: '16px' }}>
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ opacity: 0.6, flexShrink: 0 }}
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span className="year-filter-label">Year:</span>
                <input
                  type="number"
                  id="year-start"
                  className="year-input"
                  placeholder="From"
                  min="1900"
                  max="2030"
                  value={yearStart}
                  onChange={(e) => setYearStart(e.target.value)}
                />
                <span className="year-filter-sep">–</span>
                <input
                  type="number"
                  id="year-end"
                  className="year-input"
                  placeholder="To"
                  min="1900"
                  max="2030"
                  value={yearEnd}
                  onChange={(e) => setYearEnd(e.target.value)}
                />
                <button
                  id="year-clear-btn"
                  className="genre-clear-btn"
                  title="Clear year filter"
                  onClick={() => {
                    setYearStart('');
                    setYearEnd('');
                  }}
                >
                  ✕
                </button>
              </div>

              <button
                id="language-show-movies-btn"
                className="genre-show-movies-btn"
                onClick={handleShowLanguageMovies}
                style={{ marginTop: '16px' }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Show Movies
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Dynamic Recommendation / Results Section */}
      {(selectedMovie || recommendations.length > 0 || loadingResults) && (
        <section className="recommendations-section" id="recommendations-section">
          {selectedMovie && (
            <div className="because-you-watched">
              <p className="byw-label">Because you watched</p>
              <div className="byw-card">
                <div className="byw-poster-col">
                  {selectedMovie.posterUrl ? (
                    <img id="byw-poster" className="byw-poster" src={selectedMovie.posterUrl} alt="Movie Poster" />
                  ) : (
                    <div className="byw-poster-placeholder" id="byw-placeholder" style={{ display: 'flex' }}>
                      <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
                        <rect x="2" y="2" width="20" height="20" rx="2.5" />
                        <path d="M7 2v20M17 2v20M2 12h20" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="byw-details-col">
                  <h3 id="searched-movie-title" className="byw-title">
                    {selectedMovie.title}
                  </h3>
                  <p id="byw-overview" className="byw-overview">
                    {selectedMovie.overview || ''}
                  </p>
                  <div className="byw-meta">
                    <div className="byw-rating">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffd700">
                        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                      </svg>
                      <span id="byw-rating-value">
                        {selectedMovie.averageRating ? selectedMovie.averageRating.toFixed(1) : '—'}
                      </span>
                      <span style={{ color: '#666', fontSize: '0.8rem' }}>/5.0</span>
                    </div>
                    {selectedMovie.movieId && (
                      <button
                        id="byw-trailer-btn"
                        className="byw-trailer-btn"
                        onClick={() => openTrailer(selectedMovie.movieId, selectedMovie.title)}
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        Watch Trailer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {resultsTitle && !selectedMovie && (
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff' }}>{resultsTitle}</h2>
            </div>
          )}

          {loadingResults ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
              <div className="row-loading-spinner"></div>
            </div>
          ) : (
            <div className="recommendations-grid" id="recommendations-grid">
              {recommendations.map((m, idx) => (
                <MovieCard key={m.movieId || m.tmdbId || idx} movie={m} />
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
};
