'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client';
import {
  ME_QUERY,
  LOGIN_MUTATION,
  REGISTER_MUTATION,
  ADMIN_LOGIN_MUTATION,
  LOGOUT_MUTATION,
} from './graphql-queries';

export interface UserProfile {
  userId: number;
  username: string;
  email: string;
  isAdmin: boolean;
  joinDate?: string;
  wishlistCount: number;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (input: { email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  register: (input: { username: string; email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  adminLogin: (input: { username: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;

  // Modals state
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  authModalTab: 'login' | 'signup';
  setAuthModalTab: (tab: 'login' | 'signup') => void;
  profileModalOpen: boolean;
  setProfileModalOpen: (open: boolean) => void;
  settingsModalOpen: boolean;
  setSettingsModalOpen: (open: boolean) => void;
  aboutModalOpen: boolean;
  setAboutModalOpen: (open: boolean) => void;
  adminMovieModalOpen: boolean;
  setAdminMovieModalOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'signup'>('login');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [adminMovieModalOpen, setAdminMovieModalOpen] = useState(false);

  const [fetchMe] = useLazyQuery(ME_QUERY, { fetchPolicy: 'network-only' });
  const [loginMutation] = useMutation(LOGIN_MUTATION);
  const [registerMutation] = useMutation(REGISTER_MUTATION);
  const [adminLoginMutation] = useMutation(ADMIN_LOGIN_MUTATION);
  const [logoutMutation] = useMutation(LOGOUT_MUTATION);

  const refreshUser = async () => {
    try {
      const res = await fetchMe();
      if (res.data?.me) {
        setUser(res.data.me);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (input: { email: string; password: string }) => {
    try {
      const res = await loginMutation({ variables: { input } });
      if (res.data?.login?.token) {
        localStorage.setItem('cinescope_token', res.data.login.token);
        setUser(res.data.login.user);
        setAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const register = async (input: { username: string; email: string; password: string }) => {
    try {
      const res = await registerMutation({ variables: { input } });
      if (res.data?.register?.token) {
        localStorage.setItem('cinescope_token', res.data.register.token);
        setUser(res.data.register.user);
        setAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: 'Registration failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const adminLogin = async (input: { username: string; password: string }) => {
    try {
      const res = await adminLoginMutation({ variables: { input } });
      if (res.data?.adminLogin?.token) {
        localStorage.setItem('cinescope_token', res.data.adminLogin.token);
        setUser(res.data.adminLogin.user);
        setAuthModalOpen(false);
        return { success: true };
      }
      return { success: false, error: 'Admin login failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Admin login failed' };
    }
  };

  const logout = async () => {
    try {
      await logoutMutation();
    } catch {
      // Continue cleanup regardless
    }
    localStorage.removeItem('cinescope_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        adminLogin,
        logout,
        refreshUser,
        authModalOpen,
        setAuthModalOpen,
        authModalTab,
        setAuthModalTab,
        profileModalOpen,
        setProfileModalOpen,
        settingsModalOpen,
        setSettingsModalOpen,
        aboutModalOpen,
        setAboutModalOpen,
        adminMovieModalOpen,
        setAdminMovieModalOpen,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
