import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import * as api from '@/lib/api';

// Mock the apiFetch helper
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  getBaseUrl: vi.fn(() => 'http://localhost:8000/api'),
}));

const TestComponent = () => {
  const { user, loading, error } = useAuth();
  if (loading) return <div data-testid="loading">Loading...</div>;
  if (error) return <div data-testid="error">{error}</div>;
  return (
    <div>
      <div data-testid="user-email">{user?.email}</div>
      <div data-testid="user-fullname">{user?.fullname}</div>
    </div>
  );
};

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches and provides user profile on mount', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      fullname: 'Test User',
      employee_nik: 'NIK-001'
    };
    
    (api.apiFetch as any).mockResolvedValueOnce(mockUser);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should show loading initially
    expect(screen.getByTestId('loading')).toBeDefined();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('user-email').textContent).toBe('test@example.com');
      expect(screen.getByTestId('user-fullname').textContent).toBe('Test User');
    });

    expect(api.apiFetch).toHaveBeenCalledWith('/users/me/');
  });

  it('handles API errors gracefully', async () => {
    (api.apiFetch as any).mockRejectedValueOnce(new Error('Network Error'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('error').textContent).toBe('Network Error');
    });
  });

  it('sets user to null on 401 error without showing global error message', async () => {
    (api.apiFetch as any).mockRejectedValueOnce(new Error('401 Unauthorized'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).toBeNull();
      expect(screen.queryByTestId('error')).toBeNull();
      expect(screen.getByTestId('user-email').textContent).toBe('');
    });
  });
});
