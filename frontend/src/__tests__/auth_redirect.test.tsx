import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import Home from '@/app/[locale]/page';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useRouter } from '@/i18n/routing';

// Mock dependencies
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/context/TenantContext', () => ({
  useTenant: vi.fn(),
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

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: any) => <div>{children}</div>,
}));

describe('Home Page Redirection', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: mockPush,
    });
  });

  it('shows landing page instead of redirecting unauthenticated users on public domain', async () => {
    (useAuth as any).mockReturnValue({
      user: null,
      loading: false,
    });
    (useTenant as any).mockReturnValue({
      isPublic: true,
      subdomain: null,
    });
    process.env.NEXT_PUBLIC_E2E_TESTING = 'true';

    const { getByText } = render(<Home />);

    // Should NOT redirect to /login
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockPush).not.toHaveBeenCalledWith('/login');
    
    // Should render landing page content - use translation key
    await waitFor(() => {
      expect(getByText(/heroTitle1/i)).toBeDefined();
    }, { timeout: 2000 });
  });

  it('does not redirect on tenant subdomain', async () => {
    (useAuth as any).mockReturnValue({
      user: null,
      loading: false,
    });
    (useTenant as any).mockReturnValue({
      isPublic: false,
      subdomain: 'acme',
    });

    render(<Home />);

    await waitFor(() => {
      expect(mockPush).not.toHaveBeenCalledWith('/signup');
    });
  });

  it('does not perform any redirect while auth is still loading', async () => {
    (useAuth as any).mockReturnValue({
      user: null,
      loading: true,
    });
    (useTenant as any).mockReturnValue({
      isPublic: true,
      subdomain: null,
    });

    render(<Home />);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockPush).not.toHaveBeenCalled();
  }, 10000);
});
