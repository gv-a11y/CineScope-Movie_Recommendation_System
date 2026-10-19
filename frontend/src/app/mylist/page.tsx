'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@apollo/client';
import { useAuth } from '../../lib/auth-context';
import {
  WISHLIST_QUERY,
  MY_REVIEWS_QUERY,
  DELETE_REVIEW_MUTATION,
} from '../../lib/graphql-queries';
import { MovieCard } from '../../components/MovieCard';
import { useWishlist } from '../../lib/wishlist-context';

export default function MyListPage() {
  const { user, setAuthModalOpen, setAuthModalTab } = useAuth();
  const { showToast } = useWishlist();
  const [activeTab, setActiveTab] = useState<'liked' | 'reviews'>('liked');

  const { data: wishlistData, loading: wishlistLoading, refetch: refetchWishlist } = useQuery(
    WISHLIST_QUERY,
    {
      skip: !user,
    },
  );

  const { data: reviewsData, loading: reviewsLoading, refetch: refetchReviews } = useQuery(
    MY_REVIEWS_QUERY,
    {
      skip: !user,
    },
  );

  const [deleteReviewMutation] = useMutation(DELETE_REVIEW_MUTATION);

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

  const likedMovies = wishlistData?.wishlist || [];
  const myReviews = reviewsData?.myReviews || [];

  return (
    <section className="mylist-section" style={{ padding: '100px 24px 80px', minHeight: '80vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>My List</h1>
        </div>

        {/* Logged out state */}
        {!user ? (
          <div id="mylist-guest-msg" style={{ display: 'block', textAlign: 'center', marginTop: '80px' }}>
            <svg
              viewBox="0 0 24 24"
              width="60"
              height="60"
              fill="none"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1.5"
              style={{ marginBottom: '20px' }}
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '20px' }}>
              Sign in to view and manage your saved movies.
            </p>
            <button
              onClick={() => {
                setAuthModalTab('login');
                setAuthModalOpen(true);
              }}
              style={{
                padding: '12px 32px',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '1rem',
              }}
            >
              Sign In
            </button>
          </div>
        ) : (
          /* Logged In state */
          <div id="mylist-tabs-container">
            <div className="mylist-tabs">
              <button
                className={`mylist-tab ${activeTab === 'liked' ? 'active' : ''}`}
                onClick={() => setActiveTab('liked')}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="currentColor"
                  style={{ marginRight: '6px', verticalAlign: 'middle' }}
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
                Liked Movies
                <span className="tab-count" id="liked-count">
                  {likedMovies.length}
                </span>
              </button>

              <button
                className={`mylist-tab ${activeTab === 'reviews' ? 'active' : ''}`}
                onClick={() => setActiveTab('reviews')}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ marginRight: '6px', verticalAlign: 'middle' }}
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                My Reviews
                <span className="tab-count" id="reviews-count">
                  {myReviews.length}
                </span>
              </button>
            </div>

            {/* LIKED MOVIES TAB */}
            {activeTab === 'liked' && (
              <div>
                {wishlistLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                    <div className="row-loading-spinner"></div>
                  </div>
                ) : likedMovies.length === 0 ? (
                  <div style={{ textAlign: 'center', marginTop: '60px' }}>
                    <svg
                      viewBox="0 0 24 24"
                      width="64"
                      height="64"
                      fill="none"
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="1.5"
                      style={{ marginBottom: '16px' }}
                    >
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '20px' }}>
                      Your list is empty. Explore movies and add them here!
                    </p>
                    <Link
                      href="/"
                      style={{
                        display: 'inline-block',
                        padding: '12px 28px',
                        background: 'rgba(255,255,255,0.1)',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                      }}
                    >
                      Browse Movies
                    </Link>
                  </div>
                ) : (
                  <div className="recommendations-grid" id="mylist-grid">
                    {likedMovies.map((m: any, idx: number) => (
                      <MovieCard key={m.movieId || idx} movie={m} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MY REVIEWS TAB */}
            {activeTab === 'reviews' && (
              <div>
                {reviewsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
                    <div className="row-loading-spinner"></div>
                  </div>
                ) : myReviews.length === 0 ? (
                  <div style={{ textAlign: 'center', marginTop: '60px' }}>
                    <svg
                      viewBox="0 0 24 24"
                      width="64"
                      height="64"
                      fill="none"
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="1.5"
                      style={{ marginBottom: '16px' }}
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                      You haven't reviewed any movies yet.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginTop: '8px' }}>
                    {myReviews.map((r: any) => (
                      <div
                        key={r.reviewId}
                        style={{
                          display: 'flex',
                          gap: '16px',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '12px',
                          padding: '16px',
                          alignItems: 'center',
                        }}
                      >
                        {r.posterUrl && (
                          <img
                            src={r.posterUrl}
                            alt={r.title}
                            style={{ width: '60px', height: '90px', objectFit: 'cover', borderRadius: '6px' }}
                          />
                        )}
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Link
                              href={`/movie/${r.movieId}`}
                              style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', textDecoration: 'none' }}
                            >
                              {r.title} {r.releaseYear ? `(${r.releaseYear})` : ''}
                            </Link>
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
                          </div>
                          <div style={{ margin: '6px 0', color: '#ffd700', fontSize: '0.95rem' }}>
                            {'★'.repeat(Math.round(r.rating))}
                            <span style={{ color: 'rgba(255,255,255,0.2)' }}>{'★'.repeat(5 - Math.round(r.rating))}</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '10px' }}>
                              {r.createdAt}
                            </span>
                          </div>
                          {r.reviewText && (
                            <p style={{ color: '#ccc', margin: 0, fontSize: '0.95rem', lineHeight: 1.4 }}>
                              {r.reviewText}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
