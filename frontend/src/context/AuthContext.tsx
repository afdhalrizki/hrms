'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

interface UserProfile {
  id: number;
  email: string;
  is_staff: boolean;
  is_global_admin: boolean;
  role: string;
  permissions: Record<string, boolean>;
  employee_id: number | null;
  employee_nik: string | null;
  fullname: string | null;
  role_name: string | null;
  department_name: string | null;
  receive_email_notifications: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<UserProfile | null>;
  refreshProfile: () => Promise<UserProfile | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('access_token');
    }
    return true;
  });
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (): Promise<UserProfile | null> => {
    const isE2E = process.env.NEXT_PUBLIC_E2E === 'true' || process.env.NODE_ENV === 'test';
    const timeoutMs = isE2E ? 60000 : 15000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch('/users/me', { signal: controller.signal });
      setUser(data);
      return data;
    } catch (err: any) {
      // Handle abort (timeout)
      if (err.name === 'AbortError') {
        console.warn(`[AuthContext] Profile fetch timed out after ${timeoutMs/1000}s`);
      }

      // Don't set error on 401/403 as it's expected if not logged in
      const isAuthError = err.message?.includes('401') || err.message?.includes('403') || err.name === 'AbortError';
      if (!isAuthError) {
        setError(err.message || 'Failed to load user profile');
      } else {
        // Clear tokens if we get an auth error to prevent redirect loops or stuck loading states
        if (typeof window !== 'undefined') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
      setUser(null);
      return null;
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (data.access) {
        localStorage.setItem('access_token', data.access);
        if (data.refresh) {
          localStorage.setItem('refresh_token', data.refresh);
        }
      }
      setUser(data);
      // Re-fetch full profile to get employee data (fullname, etc) 
      // which is not included in the basic login response
      return await fetchProfile();
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('access_token');
    if (hasToken) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [fetchProfile]);

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = window.location.origin + '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      error, 
      login,
      refreshProfile: fetchProfile,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
