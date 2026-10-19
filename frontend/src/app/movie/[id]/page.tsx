'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client';
import {
  MOVIE_DETAIL_QUERY,
  RECOMMENDATIONS_QUERY,
  MOVIE_REVIEWS_QUERY,
  POST_REVIEW_MUTATION,
  DELETE_REVIEW_MUTATION,
  ADMIN_REMOVE_MOVIE_MUTATION,
} from '../../../lib/graphql-queries';
import { useWishlist } from '../../../lib/wishlist-context';
import { useAuth } from '../../../lib/auth-context';
import { MovieCard } from '../../../components/MovieCard';

export default function MovieDetailPage() {
  const params = useParams();
  const router = useRouter();
  const movieId = parseInt(params.id as string, 10);

  const { user, setAuthModalOpen, setAuthModalTab } = useAuth();
  const { isWishlisted, toggleWishlist, openTrailer, showToast } = useWishlist();

  // Review Form state
  const [ratingInput, setRatingInput] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // GraphQL queries
  const { data: detailData, loading: detailLoading, error: detailError } = useQuery(
    MOVIE_DETAIL_QUERY,
    {
      variables: { movieId },
      skip: isNaN(movieId),
    },
  );

  const { data: recData, loading: recLoading } = useQuery(RECOMMENDATIONS_QUERY, {
    variables: { movieId },
    skip: isNaN(movieId),
  });

  const { data: reviewsData, refetch: refetchReviews } = useQuery(MOVIE_REVIEWS_QUERY, {
    variables: { movieId },
    skip: isNaN(movieId),
  });

  const [postReviewMutation] = useMutation(POST_REVIEW_MUTATION);
  const [deleteReviewMutation] = useMutation(DELETE_REVIEW_MUTATION);
  const [adminRemoveMovieMutation] = useMutation(ADMIN_REMOVE_MOVIE_MUTATION);

  if (isNaN(movieId) || detailError) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <h2 style={{ color: '#fff', marginBottom: '16px' }}>Movie Not Found</h2>
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '10px 24px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Back to Discovery
        </button>
      </div>
    );
  }

  if (detailLoading || !detailData?.movieDetail) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', flexDirection: 'column', gap: '16px' }}>
        <div className="detail-spinner"></div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Loading movie details…</p>
      </div>
    );
  }

  const movie = detailData.movieDetail;
  const wishlisted = isWishlisted(movie.movieId);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAuthModalTab('login');
      setAuthModalOpen(true);
      showToast('Please sign in to leave a review', 'info');
      return;
    }

    setSubmittingReview(true);
    try {
      const res = await postReviewMutation({
        variables: {
          input: {
            movieId: movie.movieId,
            rating: ratingInput,
            reviewText: reviewText.trim(),
          },
        },
      });

      if (res.data?.postReview?.success) {
        showToast('Review submitted successfully!', 'success');
        setReviewText('');
        refetchReviews();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to submit review', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId: number) => {
    try {
      const res = await deleteReviewMutation({ variables: { reviewId } });
      if (res.data?.deleteReview?.success) {
        showToast('Review deleted', 'info');
        refetchReviews();
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete review', 'error');
    }
  };

  const handleAdminRemoveMovie = async () => {
    if (!confirm(`Are you sure you want to remove "${movie.title}" from the database?`)) return;
    try {
      const res = await adminRemoveMovieMutation({ variables: { movieId: movie.movieId } });
      if (res.data?.adminRemoveMovie?.success) {
        showToast(res.data.adminRemoveMovie.message, 'success');
        router.push('/');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to remove movie', 'error');
    }
  };

  const formatRuntime = (mins?: number) => {
    if (!mins) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div id="movie-detail-page" style={{ minHeight: '100vh', paddingTop: '70px' }}>
      {/* HERO BACKDROP */}
      <div className="detail-hero" id="detail-hero">
        <div
          className="detail-hero-backdrop"
          id="detail-backdrop"
          style={{
            backgroundImage: movie.backdropUrl ? `url(${movie.backdropUrl})` : undefined,
          }}
        ></div>
        <div className="detail-hero-gradient"></div>
        <div className="detail-hero-inner">
          {/* Poster */}
          <div className="detail-poster-col">
            {movie.posterUrl ? (
              <img id="detail-poster" className="detail-poster" src={movie.posterUrl} alt={movie.title} />
            ) : (
              <div className="detail-poster-placeholder" style={{ display: 'flex' }}>
                <svg viewBox="0 0 24 24" width="60" height="60" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5">
                  <rect x="2" y="2" width="20" height="20" rx="2.5" />
                  <path d="M7 2v20M17 2v20M2 12h20" />
                </svg>
              </div>
            )}
          </div>

          {/* Info Column */}
          <div className="detail-info-col">
            {movie.tagline && <div className="detail-tagline">{movie.tagline}</div>}
            <h1 className="detail-title">{movie.title}</h1>
            <div className="detail-meta-row">
              <span className="detail-year">{movie.releaseYear || ''}</span>
              {movie.runtime && (
                <>
                  <span className="detail-sep">·</span>
                  <span className="detail-runtime">{formatRuntime(movie.runtime)}</span>
                </>
              )}
              {movie.genres && (
                <>
                  <span className="detail-sep">·</span>
                  <span className="detail-genres">{movie.genres}</span>
                </>
              )}
            </div>

            {/* Rating Badge */}
            <div className="detail-rating-badge">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="#ffd700">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              <span id="detail-rating" className="detail-rating-value">
                {movie.averageRating ? (movie.averageRating * 2).toFixed(1) : '0.0'}
              </span>
              <span className="detail-rating-label">/ 10 &nbsp;avg rating</span>
            </div>

            {/* Overview */}
            <p className="detail-overview">{movie.overview}</p>

            {/* Action Buttons */}
            <div className="detail-actions">
              <button
                className="detail-play-trailer-btn"
                id="detail-play-trailer-btn"
                onClick={() => openTrailer(movie.movieId, movie.title)}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Play Trailer
              </button>

              <button
                className={`detail-wishlist-btn ${wishlisted ? 'active' : ''}`}
                id="detail-wishlist-btn"
                onClick={() => toggleWishlist(movie)}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill={wishlisted ? '#e50914' : 'none'}
                  stroke={wishlisted ? '#e50914' : 'currentColor'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span>{wishlisted ? 'In My List' : 'Add to My List'}</span>
              </button>

              {user?.isAdmin && (
                <button
                  className="detail-remove-movie-btn"
                  onClick={handleAdminRemoveMovie}
                  style={{
                    display: 'flex',
                    background: 'rgba(244,67,54,0.1)',
                    color: '#f44336',
                    border: '1px solid rgba(244,67,54,0.3)',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path>
                  </svg>
                  Remove Movie (Admin)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CAST SECTION */}
      {movie.cast && movie.cast.length > 0 && (
        <div className="detail-section" id="detail-cast-section">
          <div className="detail-section-inner">
            <h2 className="detail-section-title">Top Cast</h2>
            <div className="detail-cast-strip">
              {movie.cast.map((c: any, idx: number) => (
                <div key={idx} className="cast-card">
                  <div className="cast-photo-wrap">
                    {c.profileUrl ? (
                      <img className="cast-photo" src={c.profileUrl} alt={c.name} loading="lazy" />
                    ) : (
                      <div className="cast-photo-fallback">
                        <svg viewBox="0 0 24 24" width="36" height="36" fill="rgba(255,255,255,0.25)">
                          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <span className="cast-name" title={c.name}>{c.name}</span>
                  {c.character && <span className="cast-character" title={c.character}>{c.character}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* REVIEWS & COMMUNITY RATINGS SECTION */}
      <div className="detail-section">
        <div className="detail-section-inner">
          <h2 className="detail-section-title">Community Reviews & Ratings</h2>

          {/* Review input form */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '24px', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '16px' }}>Leave a Review</h3>
            <form onSubmit={handleReviewSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ color: 'var(--text-secondary)', marginRight: '12px', fontSize: '0.9rem' }}>Your Rating:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.5rem',
                      color: star <= (hoverRating ?? ratingInput) ? '#ffd700' : 'rgba(255,255,255,0.2)',
                      padding: '2px',
                    }}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setRatingInput(star)}
                  >
                    ★
                  </button>
                ))}
                <span style={{ marginLeft: '12px', color: '#fff', fontWeight: 600 }}>{ratingInput} / 5.0</span>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <textarea
                  rows={3}
                  placeholder="Share your thoughts about this movie..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
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

              <button
                type="submit"
                disabled={submittingReview}
                style={{
                  padding: '10px 24px',
                  background: 'var(--accent)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          </div>

          {/* Reviews List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {(!reviewsData?.movieReviews || reviewsData.movieReviews.length === 0) ? (
              <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                No reviews yet. Be the first to review this movie!
              </p>
            ) : (
              reviewsData.movieReviews.map((r: any) => (
                <div
                  key={r.reviewId}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '10px',
                    padding: '16px 20px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 700, color: '#fff' }}>{r.username}</span>
                      <span style={{ color: '#ffd700', fontSize: '0.9rem' }}>
                        {'★'.repeat(Math.round(r.rating))}
                        <span style={{ color: 'rgba(255,255,255,0.2)' }}>{'★'.repeat(5 - Math.round(r.rating))}</span>
                      </span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{r.createdAt}</span>
                    </div>

                    {(user?.username === r.username || user?.isAdmin) && (
                      <button
                        onClick={() => handleDeleteReview(r.reviewId)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#f44336',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  {r.reviewText && <p style={{ color: '#ddd', margin: 0, lineHeight: 1.5 }}>{r.reviewText}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MORE LIKE THIS (COLLABORATIVE FILTERING RECOMMENDATIONS) */}
      <div className="detail-section" style={{ paddingBottom: '80px' }}>
        <div className="detail-section-inner">
          <h2 className="detail-section-title">More Like This</h2>
          {recLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div className="row-loading-spinner"></div>
            </div>
          ) : (
            <div className="recommendations-grid">
              {(recData?.recommendations || []).map((m: any, idx: number) => (
                <MovieCard key={m.movieId || idx} movie={m} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
