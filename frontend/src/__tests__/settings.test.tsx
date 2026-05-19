import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SettingsPage from '../app/[locale]/settings/page';
import { NextIntlClientProvider } from 'next-intl';
import React from 'react';

// Mock next-intl
vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useTranslations: vi.fn(() => (key: string) => key),
  };
});

// Mock DashboardLayout
vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock AuthContext
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ 
    user: { id: 1, fullname: 'Admin', is_staff: true, permissions: { tenant_manage_hr: true } }, 
    loading: false 
  }),
  AuthProvider: ({ children }: any) => children,
}));

// Variable to control mock tenant values
let mockTenantValues = {
  tenantName: 'HariKerja Platform',
  isPublic: true,
  address: 'Platform Road 10',
  phone: '12345678',
  logo: '/logo.png',
  lateDeductionRate: 0,
  absenceDeductionRate: 0,
  jkkRate: 0.0024,
  reimbursementApprovalLevel: 'BOTH',
  isBiometricEnabled: true,
  attendancePlatformPolicy: 'MOBILE' as 'MOBILE' | 'BOTH',
};

// Mock TenantContext
vi.mock('@/context/TenantContext', () => ({
  useTenant: () => mockTenantValues,
  TenantProvider: ({ children }: any) => children,
}));

describe('SettingsPage (Unit Test)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders only branding and contact details for Master Tenant (isPublic = true)', () => {
    mockTenantValues = {
      tenantName: 'HariKerja Platform',
      isPublic: true,
      address: 'Platform Road 10',
      phone: '12345678',
      logo: '/logo.png',
      lateDeductionRate: 0,
      absenceDeductionRate: 0,
      jkkRate: 0.0024,
      reimbursementApprovalLevel: 'BOTH',
      isBiometricEnabled: true,
      attendancePlatformPolicy: 'MOBILE',
    };

    render(
      <NextIntlClientProvider locale="en" messages={{}}>
        <SettingsPage />
      </NextIntlClientProvider>
    );

    // 1. Branding and contact info should exist
    expect(screen.getByText('Company Profile Settings')).toBeInTheDocument();
    expect(screen.getByText('Company Branding')).toBeInTheDocument();
    expect(screen.getByText('Contact Details')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. +62 21 1234 5678')).toBeInTheDocument();

    // 2. Non-relevant operational features should NOT exist
    expect(screen.queryByText('Attendance & Payroll Policies')).not.toBeInTheDocument();
    expect(screen.queryByText('Security & Biometrics')).not.toBeInTheDocument();
    expect(screen.queryByText('Access Management')).not.toBeInTheDocument();
    expect(screen.queryByText('Subscription & Billing')).not.toBeInTheDocument();
  });

  it('renders all sections for normal company tenants (isPublic = false)', () => {
    mockTenantValues = {
      tenantName: 'Google Inc.',
      isPublic: false,
      address: 'Mountain View',
      phone: '8888-8888',
      logo: '/logo-google.png',
      lateDeductionRate: 5000,
      absenceDeductionRate: 100000,
      jkkRate: 0.0024,
      reimbursementApprovalLevel: 'BOTH',
      isBiometricEnabled: true,
      attendancePlatformPolicy: 'MOBILE',
    };

    render(
      <NextIntlClientProvider locale="en" messages={{}}>
        <SettingsPage />
      </NextIntlClientProvider>
    );

    // 1. Branding and contact info should exist
    expect(screen.getByText('Company Profile Settings')).toBeInTheDocument();
    expect(screen.getByText('Company Branding')).toBeInTheDocument();
    expect(screen.getByText('Contact Details')).toBeInTheDocument();

    // 2. Operational features and additional settings cards MUST exist
    expect(screen.getByText('Attendance & Payroll Policies')).toBeInTheDocument();
    expect(screen.getByText('Security & Biometrics')).toBeInTheDocument();
    expect(screen.getByText('Access Management')).toBeInTheDocument();
    expect(screen.getByText('Subscription & Billing')).toBeInTheDocument();
  });
});
