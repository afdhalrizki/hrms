import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
    vi.spyOn(console, 'error').mockImplementation(() => {});
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

    expect(api.apiFetch).toHaveBeenCalledWith('/users/me');
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

  it('login sets tokens and user data', async () => {
    const loginUser = {
      id: 99,
      email: 'newuser@example.com',
      fullname: 'New User',
      is_staff: false,
      is_global_admin: false,
      employee_id: null,
      employee_nik: null,
      role_name: null,
      department_name: null,
      access: 'new-access-token',
      refresh: 'new-refresh-token'
    };

    (api.apiFetch as any).mockResolvedValueOnce({
      id: 99,
      email: 'newuser@example.com',
      fullname: 'New User',
      employee_nik: null
    });

    const ActionsConsumer = () => {
      const { user, login, logout } = useAuth();
      return (
        <div>
          <div data-testid="user-email">{user?.email || ''}</div>
          <button data-testid="do-login" onClick={() => login('newuser@example.com', 'pass123')}>
            Login
          </button>
          <button data-testid="do-logout" onClick={() => logout()}>
            Logout
          </button>
        </div>
      );
    };

    (api.apiFetch as any).mockResolvedValueOnce(loginUser);
    (api.apiFetch as any).mockResolvedValueOnce({
      id: 99,
      email: 'newuser@example.com',
      fullname: 'New User',
      employee_nik: null
    });

    render(
      <AuthProvider>
        <ActionsConsumer />
      </AuthProvider>
    );

    const loginButton = screen.getByTestId('do-login');
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByTestId('user-email').textContent).toBe('newuser@example.com');
      expect(localStorage.getItem('access_token')).toBe('new-access-token');
      expect(localStorage.getItem('refresh_token')).toBe('new-refresh-token');
    });

    const logoutButton = screen.getByTestId('do-logout');
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(localStorage.getItem('access_token')).toBeNull();
      expect(localStorage.getItem('refresh_token')).toBeNull();
    });
  });
});
