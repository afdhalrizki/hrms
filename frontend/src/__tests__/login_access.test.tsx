import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import LoginPage from '@/app/[locale]/login/page';
import { useTenant } from '@/context/TenantContext';

// Mock dependencies
vi.mock('@/context/TenantContext', () => ({
  useTenant: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    loading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
  })),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: any) => {
    if (params) {
      return `${key} ${Object.values(params).join(' ')}`;
    }
    return key;
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
}));

describe('LoginPage Access Restrictions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Akses Terbatas" on public domain without forceShowForm', async () => {
    (useTenant as any).mockReturnValue({
      isPublic: true,
      tenantName: 'Public',
    });

    render(<LoginPage />);
    
    expect(await screen.findByText(/restrictedTitle/i)).toBeDefined();
    expect(screen.queryByLabelText(/emailLabel/i)).toBeNull();
    expect(await screen.findByText(/restrictedDesc/i)).toBeDefined();
  });

  it('renders login form on public domain when forceShowForm is true', async () => {
    (useTenant as any).mockReturnValue({
      isPublic: true,
      tenantName: 'Public',
    });

    render(<LoginPage forceShowForm={true} />);
    
    expect(await screen.findByText(/portalBadge/i)).toBeDefined();
    expect(await screen.findByLabelText(/emailLabel/i)).toBeDefined();
    expect(await screen.findByLabelText(/passwordLabel/i)).toBeDefined();
    expect(screen.queryByText(/restrictedTitle/i)).toBeNull();
  });

  it('renders normal login form on tenant subdomain', async () => {
    (useTenant as any).mockReturnValue({
      isPublic: false,
      tenantName: 'Acme Corp',
    });

    render(<LoginPage />);
    
    expect(await screen.findByText(/welcomePortal/i)).toBeDefined();
    expect(await screen.findByText(/Acme Corp/i)).toBeDefined();
    expect(await screen.findByLabelText(/emailLabel/i)).toBeDefined();
    expect(await screen.findByLabelText(/passwordLabel/i)).toBeDefined();
    expect(screen.queryByText(/restrictedTitle/i)).toBeNull();
  });
});
