import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { loginAs } from './setup';
import { AuthProvider } from '@/context/AuthContext';
import { TenantProvider, useTenant } from '@/context/TenantContext';
import { NextIntlClientProvider } from 'next-intl';

// Mock HelpSupportWidget so it does not fetch or have side effects in unit tests
vi.mock('@/components/shared/HelpSupportWidget', () => ({
  HelpSupportWidget: () => <div data-testid="mock-help-widget" />,
}));

// Mock TenantContext so we can override it in specific tests
let mockTenantContextValues: any = null;
vi.mock('@/context/TenantContext', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useTenant: () => {
      if (mockTenantContextValues) return mockTenantContextValues;
      // Default to returning everything so basic tests pass
      return {
        enabledModules: ['core', 'attendance', 'leaves', 'reimbursement', 'payroll', 'performance', 'rbac', 'analytics', 'audit'],
        planType: 'ENTERPRISE',
      };
    }
  };
});

// Mock next-intl
vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useTranslations: vi.fn(() => (key: string) => key),
    useLocale: () => 'en',
  };
});

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

vi.mock('@/i18n/routing', () => ({
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  routing: { locales: ['en', 'id'], defaultLocale: 'en' },
}));

vi.mock('@/hooks/usePermission', () => ({
  usePermission: vi.fn(() => ({ hasPermission: () => true })),
}));

const AllProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <NextIntlClientProvider locale="en" messages={{}}>
      <TenantProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </TenantProvider>
    </NextIntlClientProvider>
  );
};

describe('Sidebar Component (Integrated)', () => {
  beforeAll(async () => {
    await loginAs('admin@company1.com');
  }, 20000);

  beforeEach(() => {
    vi.clearAllMocks();
    mockTenantContextValues = null;
  });

  it('renders real user data from backend', async () => {
    render(<DashboardLayout><div>Test Child</div></DashboardLayout>, { wrapper: AllProviders });
    
    await waitFor(() => {
      // The Sidebar should display the logged-in user's email.
      // We accept either the specific worker email or the default one.
      const emailPattern = /admin@(worker_\d+|company1)\.com/i;
      expect(screen.getByText(emailPattern)).toBeInTheDocument();
    }, { timeout: 20000 });
  });

  it('hides module-specific menus if not in enabledModules', () => {
    mockTenantContextValues = {
      enabledModules: ['core', 'attendance'], // Missing payroll, performance, etc.
      planType: 'FREE',
    };
    render(<Sidebar />, { wrapper: AllProviders });
    
    // Should render 'attendance' and 'employees' (core)
    expect(screen.getByText('attendance')).toBeInTheDocument();
    expect(screen.getByText('employees')).toBeInTheDocument();

    // Should NOT render 'payroll', 'leaves', 'performance'
    expect(screen.queryByText('payroll')).not.toBeInTheDocument();
    expect(screen.queryByText('leaves')).not.toBeInTheDocument();
    expect(screen.queryByText('performance')).not.toBeInTheDocument();
  });

  it('hides all operational menus for Public Tenant', () => {
    mockTenantContextValues = {
      enabledModules: [],
      isPublic: true,
      planType: undefined,
    };
    render(<Sidebar />, { wrapper: AllProviders });
    
    // Should render generic things
    expect(screen.getByText('overview')).toBeInTheDocument();
    expect(screen.getByText('settings')).toBeInTheDocument();

    // Should NOT render profile or HR menus
    expect(screen.queryByText('profile')).not.toBeInTheDocument();
    expect(screen.queryByText('employees')).not.toBeInTheDocument();
    expect(screen.queryByText('attendance')).not.toBeInTheDocument();
    expect(screen.queryByText('branches')).not.toBeInTheDocument();
  });
});
