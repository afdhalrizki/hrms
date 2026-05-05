import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from '@/i18n/routing';

// Mock dependencies
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/context/TenantContext', () => ({
  useTenant: vi.fn(() => ({
    tenantName: 'Test Tenant',
    isPublic: false,
    subscriptionStatus: 'ACTIVE',
  })),
}));

vi.mock('@/i18n/routing', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => '/'),
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => '/'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/components/layout/Sidebar', () => ({
  Sidebar: () => <div data-testid="sidebar">Sidebar</div>,
}));

vi.mock('@/components/layout/SubscriptionBanner', () => ({
  SubscriptionBanner: () => <div>Banner</div>,
}));

vi.mock('@/components/layout/SuspendedOverlay', () => ({
  SuspendedOverlay: () => <div>Overlay</div>,
}));

describe('DashboardLayout Redirection', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window !== 'undefined') {
      (window as any).__TEST_AUTH_REDIRECT__ = true;
    }
    (useRouter as any).mockReturnValue({
      push: mockPush,
    });
  });

  it('redirects unauthenticated users to /login', async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
    }
    (useAuth as any).mockReturnValue({
      user: null,
      loading: false,
    });

    render(
      <DashboardLayout>
        <div data-testid="dashboard-content">Dashboard Content</div>
      </DashboardLayout>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('does not redirect and shows content when logged in', async () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', 'test_token');
    }
    (useAuth as any).mockReturnValue({
      user: { id: 1, email: 'test@example.com' },
      loading: false,
    });

    const { getByTestId } = render(
      <DashboardLayout>
        <div data-testid="dashboard-content">Dashboard Content</div>
      </DashboardLayout>
    );

    await waitFor(() => {
      expect(getByTestId('dashboard-content')).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
