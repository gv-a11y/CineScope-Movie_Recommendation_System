'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client';
import {
  WISHLIST_IDS_QUERY,
  ADD_TO_WISHLIST_MUTATION,
  REMOVE_FROM_WISHLIST_MUTATION,
  ENSURE_LOCAL_MUTATION,
  TRAILER_QUERY,
} from './graphql-queries';
import { useAuth } from './auth-context';

interface WishlistContextType {
  wishlistIds: Set<number>;
  isWishlisted: (movieId?: number) => boolean;
  toggleWishlist: (movie: { movieId?: number; tmdbId?: number; title?: string }) => Promise<boolean>;
  refreshWishlist: () => Promise<void>;

  // Trailer modal state
  activeTrailer: { videoKey: string; title: string; open: boolean; loading: boolean; error: boolean };
  openTrailer: (movieId: number, title?: string) => Promise<void>;
  closeTrailer: () => void;

  // Toast notifications
  toast: { message: string; type: 'success' | 'error' | 'info'; show: boolean };
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const WishlistContext = createContext<WishlistContextType>({} as WishlistContextType);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, setAuthModalOpen, setAuthModalTab } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<Set<number>>(new Set());

  const [activeTrailer, setActiveTrailer] = useState<{
    videoKey: string;
    title: string;
    open: boolean;
    loading: boolean;
    error: boolean;
  }>({
    videoKey: '',
    title: '',
    open: false,
    loading: false,
    error: false,
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info'; show: boolean }>({
    message: '',
    type: 'info',
    show: false,
  });

  const [fetchWishlistIds] = useLazyQuery(WISHLIST_IDS_QUERY, { fetchPolicy: 'network-only' });
  const [addToWishlistMutation] = useMutation(ADD_TO_WISHLIST_MUTATION);
  const [removeFromWishlistMutation] = useMutation(REMOVE_FROM_WISHLIST_MUTATION);
  const [ensureLocalMutation] = useMutation(ENSURE_LOCAL_MUTATION);
  const [fetchTrailer] = useLazyQuery(TRAILER_QUERY);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type, show: true });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3500);
  };

  const refreshWishlist = async () => {
    if (!user) {
      setWishlistIds(new Set());
      return;
    }
    try {
      const res = await fetchWishlistIds();
      if (res.data?.wishlistIds) {
        setWishlistIds(new Set(res.data.wishlistIds));
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    refreshWishlist();
  }, [user]);

  const isWishlisted = (movieId?: number) => {
    if (!movieId) return false;
    return wishlistIds.has(movieId);
  };

  const toggleWishlist = async (movie: { movieId?: number; tmdbId?: number; title?: string }): Promise<boolean> => {
    if (!user) {
      setAuthModalTab('login');
      setAuthModalOpen(true);
      showToast('Please sign in to save movies to your list', 'info');
      return false;
    }

    let mid = movie.movieId;
    if (!mid && movie.tmdbId) {
      try {
        const localRes = await ensureLocalMutation({ variables: { tmdbId: movie.tmdbId } });
        mid = localRes.data?.ensureLocalMovie?.movieId;
      } catch {
        showToast('Failed to sync movie with database', 'error');
        return false;
      }
    }

    if (!mid) {
      showToast('Movie identification failed', 'error');
      return false;
    }

    const currentlyIn = wishlistIds.has(mid);
    try {
      if (currentlyIn) {
        await removeFromWishlistMutation({ variables: { movieId: mid } });
        setWishlistIds((prev) => {
          const next = new Set(prev);
          next.delete(mid!);
          return next;
        });
        showToast(`Removed from My List`, 'info');
        return false;
      } else {
        await addToWishlistMutation({ variables: { movieId: mid } });
        setWishlistIds((prev) => new Set(prev).add(mid!));
        showToast(`Added to My List`, 'success');
        return true;
      }
    } catch (err: any) {
      showToast(err.message || 'Wishlist operation failed', 'error');
      return currentlyIn;
    }
  };

  const openTrailer = async (movieId: number, title = 'Movie Trailer') => {
    setActiveTrailer({
      videoKey: '',
      title,
      open: true,
      loading: true,
      error: false,
    });

    try {
      const res = await fetchTrailer({ variables: { movieId } });
      const trailer = res.data?.trailer;
      if (trailer?.videoKey) {
        setActiveTrailer({
          videoKey: trailer.videoKey,
          title: trailer.title || title,
          open: true,
          loading: false,
          error: false,
        });
      } else {
        setActiveTrailer((prev) => ({ ...prev, loading: false, error: true }));
      }
    } catch {
      setActiveTrailer((prev) => ({ ...prev, loading: false, error: true }));
    }
  };

  const closeTrailer = () => {
    setActiveTrailer((prev) => ({ ...prev, open: false, videoKey: '' }));
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlistIds,
        isWishlisted,
        toggleWishlist,
        refreshWishlist,
        activeTrailer,
        openTrailer,
        closeTrailer,
        toast,
        showToast,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => useContext(WishlistContext);
