import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import Home from '@/app/[locale]/page';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useRouter } from 'next/navigation';

// Mock dependencies
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/context/TenantContext', () => ({
  useTenant: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: any) => <div>{children}</div>
}));

vi.mock('framer-motion', () => ({
  motion: {
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
}));

describe('Home Page Redirection', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as any).mockReturnValue({
      push: mockPush,
    });
  });

  it('redirects unauthenticated users to /signup on public domain', async () => {
    (useAuth as any).mockReturnValue({
      user: null,
      loading: false,
    });
    (useTenant as any).mockReturnValue({
      isPublic: true,
      subdomain: null,
    });

    render(<Home />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/signup');
    });
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
  });
});
