'use client';

import React from 'react';
import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '../lib/graphql-client';
import { AuthProvider } from '../lib/auth-context';
import { WishlistProvider } from '../lib/wishlist-context';
import { Navbar } from './Navbar';
import { TrailerModal } from './TrailerModal';
import { AuthModal } from './AuthModal';
import { ProfileModal } from './ProfileModal';
import { AdminAddMovieModal } from './AdminAddMovieModal';
import { SettingsModal } from './SettingsModal';
import { AboutModal } from './AboutModal';
import { Toast } from './Toast';

export const ClientProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <ApolloProvider client={apolloClient}>
      <AuthProvider>
        <WishlistProvider>
          <Navbar />
          {children}
          <TrailerModal />
          <AuthModal />
          <ProfileModal />
          <AdminAddMovieModal />
          <SettingsModal />
          <AboutModal />
          <Toast />
        </WishlistProvider>
      </AuthProvider>
    </ApolloProvider>
  );
};
