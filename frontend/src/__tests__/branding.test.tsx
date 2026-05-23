import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import BrandingPage from '../app/[locale]/settings/branding/page';
import { NextIntlClientProvider } from 'next-intl';
import React from 'react';

// Mock next-intl
vi.mock('next-intl', async (importOriginal) => {
  const actual = (await vi.importActual('next-intl')) as any;
  return {
    ...actual,
    useTranslations: vi.fn(() => (key: string) => key),
  };
});

// Mock DashboardLayout
vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

// Mock AuthContext
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      fullname: 'Admin User',
      is_staff: true,
      permissions: { tenant_manage_settings: true },
    },
    loading: false,
  }),
  AuthProvider: ({ children }: any) => children,
}));

// Variable to control mock tenant values
let mockTenantValues = {
  tenantName: 'HariKerja Platform',
  isPublic: false,
  logo: null as string | null,
  themePrimaryColor: '#588157',
  themeSecondaryColor: '#4a5d23',
};

// Mock TenantContext
vi.mock('@/context/TenantContext', () => ({
  useTenant: () => mockTenantValues,
  TenantProvider: ({ children }: any) => children,
}));

describe('BrandingPage (Unit Test)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders branding settings page and displays color inputs', () => {
    mockTenantValues = {
      tenantName: 'HariKerja Platform',
      isPublic: false,
      logo: null,
      themePrimaryColor: '#588157',
      themeSecondaryColor: '#4a5d23',
    };

    render(
      <NextIntlClientProvider locale='en' messages={{}}>
        <BrandingPage />
      </NextIntlClientProvider>
    );

    // Verify title and layout exist
    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    expect(screen.getByText('title')).toBeInTheDocument();

    // Verify color pickers and text inputs exist and have correct initial values
    const primaryInput = screen.getByTestId('primary-color-input');
    const secondaryInput = screen.getByTestId('secondary-color-input');
    
    expect(primaryInput).toBeInTheDocument();
    expect(secondaryInput).toBeInTheDocument();

    expect(primaryInput).toHaveValue('#588157');
    expect(secondaryInput).toHaveValue('#4a5d23');
  });

  it('updates color inputs to custom tenant context colors', () => {
    mockTenantValues = {
      tenantName: 'Custom Co',
      isPublic: false,
      logo: '/custom-logo.png',
      themePrimaryColor: '#123456',
      themeSecondaryColor: '#789abc',
    };

    render(
      <NextIntlClientProvider locale='en' messages={{}}>
        <BrandingPage />
      </NextIntlClientProvider>
    );

    const primaryInput = screen.getByTestId('primary-color-input');
    const secondaryInput = screen.getByTestId('secondary-color-input');

    expect(primaryInput).toHaveValue('#123456');
    expect(secondaryInput).toHaveValue('#789abc');
  });
});
