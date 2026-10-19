'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import {
  TMDB_NOW_PLAYING_QUERY,
  TMDB_TRENDING_QUERY,
  TOP_RATED_QUERY,
  TMDB_BY_LANGUAGE_QUERY,
} from '../lib/graphql-queries';
import { HeroOrbit } from '../components/HeroOrbit';
import { SearchSection } from '../components/SearchSection';
import { MovieRow } from '../components/MovieRow';

export default function HomePage() {
  const [preferredLang, setPreferredLang] = useState('en');

  const { data: nowPlayingData, loading: nowPlayingLoading } = useQuery(TMDB_NOW_PLAYING_QUERY);
  const { data: trendingData, loading: trendingLoading } = useQuery(TMDB_TRENDING_QUERY);
  const { data: topRatedData, loading: topRatedLoading } = useQuery(TOP_RATED_QUERY);

  const { data: languageData, loading: languageLoading, refetch: refetchLanguage } = useQuery(
    TMDB_BY_LANGUAGE_QUERY,
    {
      variables: { langCode: preferredLang },
      skip: preferredLang === 'en',
    },
  );

  useEffect(() => {
    const updateLang = () => {
      const saved = localStorage.getItem('userPreferredLanguage') || 'en';
      setPreferredLang(saved);
      if (saved !== 'en') {
        refetchLanguage({ langCode: saved });
      }
    };

    updateLang();
    window.addEventListener('languageChange', updateLang);
    return () => window.removeEventListener('languageChange', updateLang);
  }, [refetchLanguage]);

  const langNames: Record<string, string> = {
    hi: 'Hindi',
    es: 'Spanish',
    fr: 'French',
    te: 'Telugu',
    ta: 'Tamil',
    ml: 'Malayalam',
    kn: 'Kannada',
    mr: 'Marathi',
    bn: 'Bengali',
    ko: 'Korean',
    ja: 'Japanese',
    zh: 'Chinese',
    de: 'German',
  };

  return (
    <main>
      <HeroOrbit />

      <div className="content-wrapper" id="content-wrapper">
        <SearchSection />

        {/* New Releases (Live TMDB) */}
        <MovieRow
          id="new-releases-row"
          title="New Releases"
          badge="● LIVE"
          movies={nowPlayingData?.tmdbNowPlaying || []}
          loading={nowPlayingLoading}
        />

        {/* Trending This Week (Live TMDB) */}
        <MovieRow
          id="trending-row"
          title="Trending This Week"
          badge="● LIVE"
          movies={trendingData?.tmdbTrending || []}
          loading={trendingLoading}
        />

        {/* Regional / Language Movies */}
        {preferredLang !== 'en' && (
          <MovieRow
            id="language-movies-row"
            title={`${langNames[preferredLang] || 'Regional'} Movies`}
            badge="● FOR YOU"
            badgeStyle={{
              background: 'rgba(255, 152, 0, 0.2)',
              color: '#ff9800',
              borderColor: 'rgba(255, 152, 0, 0.3)',
            }}
            movies={languageData?.tmdbByLanguage || []}
            loading={languageLoading}
          />
        )}

        {/* Top Rated Movies */}
        <MovieRow
          id="top-rated-row"
          title="Top Rated Movies"
          movies={topRatedData?.topRated || []}
          loading={topRatedLoading}
        />
      </div>
    </main>
  );
}
