import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import SettingsPage from '../app/[locale]/settings/page';
import { NextIntlClientProvider } from 'next-intl';
import React from 'react';

// Mock next-intl to return translation keys (simulates useTranslations)
vi.mock('next-intl', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    useTranslations: vi.fn((namespace?: string) => (key: string) => key),
  };
});

// Mock DashboardLayout
vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock AuthContext
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      fullname: 'Admin',
      is_staff: true,
      permissions: { tenant_manage_hr: true },
    },
    loading: false,
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
  isFingerprintEnabled: false,
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
      isFingerprintEnabled: false,
      attendancePlatformPolicy: 'MOBILE',
    };

    render(
      <NextIntlClientProvider locale='en' messages={{}}>
        <SettingsPage />
      </NextIntlClientProvider>,
    );

    // Since useTranslations returns the key itself, we check for the translation keys
    expect(screen.getByText('title')).toBeInTheDocument();
    expect(screen.getByText('subtitle')).toBeInTheDocument();

    // 2. Non-relevant operational features should NOT exist
    expect(
      screen.queryByText('attendance_payroll_policies'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('security_biometrics')).not.toBeInTheDocument();
    expect(screen.queryByText('access_management')).not.toBeInTheDocument();
    expect(screen.queryByText('subscription_billing')).not.toBeInTheDocument();
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
      isFingerprintEnabled: true,
      attendancePlatformPolicy: 'MOBILE',
    };

    render(
      <NextIntlClientProvider locale='en' messages={{}}>
        <SettingsPage />
      </NextIntlClientProvider>,
    );

    // Since useTranslations returns the key itself, we check for translation keys
    expect(screen.getByText('title')).toBeInTheDocument();
    expect(screen.getByText('company_branding')).toBeInTheDocument();
    expect(screen.getByText('contact_details')).toBeInTheDocument();

    // 2. Operational features and additional settings cards MUST exist
    expect(screen.getByText('attendance_payroll_policies')).toBeInTheDocument();
    expect(screen.getByText('security_biometrics')).toBeInTheDocument();
    expect(screen.getByText('access_management')).toBeInTheDocument();
    expect(screen.getByText('subscription_billing')).toBeInTheDocument();
    expect(screen.getByText('fingerprint_devices')).toBeInTheDocument(); // isFingerprintEnabled=true
  });

  it('renders fingerprint devices section when fingerprint is enabled', () => {
    mockTenantValues = {
      tenantName: 'Test Tenant',
      isPublic: false,
      address: 'Test Address',
      phone: '12345',
      logo: null,
      lateDeductionRate: 0,
      absenceDeductionRate: 0,
      jkkRate: 0.0024,
      reimbursementApprovalLevel: 'BOTH',
      isBiometricEnabled: false,
      isFingerprintEnabled: true,
      attendancePlatformPolicy: 'BOTH',
    };

    render(
      <NextIntlClientProvider locale='en' messages={{}}>
        <SettingsPage />
      </NextIntlClientProvider>,
    );

    expect(screen.getByText('fingerprint_devices')).toBeInTheDocument();
    expect(screen.getByText('manage_devices')).toBeInTheDocument();
  });

  it('does not render fingerprint devices section when fingerprint is disabled', () => {
    mockTenantValues = {
      tenantName: 'Test Tenant',
      isPublic: false,
      address: 'Test Address',
      phone: '12345',
      logo: null,
      lateDeductionRate: 0,
      absenceDeductionRate: 0,
      jkkRate: 0.0024,
      reimbursementApprovalLevel: 'BOTH',
      isBiometricEnabled: false,
      isFingerprintEnabled: false,
      attendancePlatformPolicy: 'BOTH',
    };

    render(
      <NextIntlClientProvider locale='en' messages={{}}>
        <SettingsPage />
      </NextIntlClientProvider>,
    );

    expect(screen.queryByText('fingerprint_devices')).not.toBeInTheDocument();
    expect(screen.queryByText('manage_devices')).not.toBeInTheDocument();
  });
});
