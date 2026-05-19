import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';

// Define dynamic mock values
const mockAuthUser = {
  fullname: 'Admin User',
  email: 'admin@public.com',
  global_role: 'SUPERADMIN',
  is_global_admin: true,
};

const mockTenantValues = {
  logo: null,
  tenantName: 'Public Tenant',
  enabledModules: [] as string[],
  isPublic: true,
  planType: undefined as any,
};

// Mock Auth Context
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockAuthUser,
    loading: false,
    logout: vi.fn(),
  }),
}));

// Mock Tenant Context
vi.mock('@/context/TenantContext', () => ({
  useTenant: () => mockTenantValues,
}));

// Mock Next-Intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));

// Mock i18n Routing
vi.mock('@/i18n/routing', () => ({
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/',
  routing: { locales: ['en', 'id'], defaultLocale: 'en' },
}));

// Mock Next Navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

// Mock Permission Hook
vi.mock('@/hooks/usePermission', () => ({
  usePermission: () => ({ hasPermission: () => true }),
}));

describe('Sidebar Global Roles Menu Visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders both registrations and global-admins menu items for SUPERADMIN', () => {
    mockAuthUser.global_role = 'SUPERADMIN';
    mockTenantValues.isPublic = true;
    mockTenantValues.enabledModules = [];

    render(<Sidebar />);

    expect(screen.getByText('registrations')).toBeInTheDocument();
    expect(screen.getByText('global_admins')).toBeInTheDocument();
  });

  it('renders registrations but NOT global-admins for ONBOARDING_AGENT', () => {
    mockAuthUser.global_role = 'ONBOARDING_AGENT';
    mockTenantValues.isPublic = true;
    mockTenantValues.enabledModules = [];

    render(<Sidebar />);

    expect(screen.getByText('registrations')).toBeInTheDocument();
    expect(screen.queryByText('global_admins')).not.toBeInTheDocument();
  });

  it('renders neither registrations nor global-admins for SUPPORT_AGENT', () => {
    mockAuthUser.global_role = 'SUPPORT_AGENT';
    mockTenantValues.isPublic = true;
    mockTenantValues.enabledModules = [];

    render(<Sidebar />);

    expect(screen.queryByText('registrations')).not.toBeInTheDocument();
    expect(screen.queryByText('global_admins')).not.toBeInTheDocument();
  });

  it('renders neither registrations nor global-admins for BILLING_ADMIN', () => {
    mockAuthUser.global_role = 'BILLING_ADMIN';
    mockTenantValues.isPublic = true;
    mockTenantValues.enabledModules = [];

    render(<Sidebar />);

    expect(screen.queryByText('registrations')).not.toBeInTheDocument();
    expect(screen.queryByText('global_admins')).not.toBeInTheDocument();
  });
});
