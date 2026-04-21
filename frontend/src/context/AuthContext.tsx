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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (): Promise<UserProfile | null> => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch('/users/me');
      setUser(data);
      return data;
    } catch (err: any) {
      // Don't set error on 401/403 as it's expected if not logged in
      if (!err.message?.includes('401') && !err.message?.includes('403')) {
        setError(err.message || 'Failed to load user profile');
      }
      setUser(null);
      return null;
    } finally {
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
    fetchProfile();
  }, [fetchProfile]);

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    window.location.href = '/login';
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
