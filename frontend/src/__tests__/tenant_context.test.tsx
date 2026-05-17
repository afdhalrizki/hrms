import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { ReactNode } from 'react';
import { TenantProvider, useTenant } from '@/context/TenantContext';
import { apiFetch } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(() => Promise.resolve({})),
  getDomainSuffix: vi.fn(() => 'harikerja.com'),
}));

// Helper component to consume context
const TestConsumer = () => {
  const { tenantName, subdomain, isPublic } = useTenant();
  return (
    <div>
      <span data-testid="tenant-name">{tenantName}</span>
      <span data-testid="subdomain">{subdomain}</span>
      <span data-testid="is-public">{isPublic.toString()}</span>
    </div>
  );
};

describe('TenantContext', () => {
  beforeEach(() => {
    vi.stubGlobal('location', { hostname: 'localhost', search: '' });
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
      localStorage.clear();
    }
    process.env.NEXT_PUBLIC_DOMAIN_SUFFIX = 'harikerja.com';
  });

  it('identifies localhost as public', async () => {
    const { getByTestId } = render(
      <TenantProvider>
        <TestConsumer />
      </TenantProvider>
    );

    await waitFor(() => {
      expect(getByTestId('tenant-name').textContent).toBe('HariKerja Platform');
      expect(getByTestId('is-public').textContent).toBe('true');
    });
  });

  it('extracts subdomain correctly from default localhost suffix', async () => {
    vi.stubGlobal('location', { hostname: 'acme.harikerja.com' });
    vi.mocked(apiFetch).mockResolvedValueOnce({ name: 'Acme', logo: '/logo-acme.png' });

    const { getByTestId } = render(
      <TenantProvider>
        <TestConsumer />
      </TenantProvider>
    );

    await waitFor(() => {
      expect(getByTestId('tenant-name').textContent).toBe('Acme');
      expect(getByTestId('subdomain').textContent).toBe('acme');
      expect(getByTestId('is-public').textContent).toBe('false');
    });
  });

  it('extracts subdomain using custom NEXT_PUBLIC_DOMAIN_SUFFIX', async () => {
    vi.stubGlobal('location', { hostname: 'acme.myhrms.com' });
    process.env.NEXT_PUBLIC_DOMAIN_SUFFIX = 'myhrms.com';
    vi.mocked(apiFetch).mockResolvedValueOnce({ name: 'Acme', logo: '/logo-acme.png' });

    const { getByTestId } = render(
      <TenantProvider>
        <TestConsumer />
      </TenantProvider>
    );

    await waitFor(() => {
      expect(getByTestId('tenant-name').textContent).toBe('Acme');
      expect(getByTestId('subdomain').textContent).toBe('acme');
    });
  });

  it('handles www as public even if suffixed', async () => {
    vi.stubGlobal('location', { hostname: 'www.harikerja.com' });

    const { getByTestId } = render(
      <TenantProvider>
        <TestConsumer />
      </TenantProvider>
    );

    await waitFor(() => {
      expect(getByTestId('is-public').textContent).toBe('true');
    });
  });

  it('fetches tenant settings and updates name for subdomain', async () => {
    process.env.NEXT_PUBLIC_DOMAIN_SUFFIX = 'harikerja.com';
    vi.stubGlobal('location', { hostname: 'acme.harikerja.com' });
    vi.mocked(apiFetch).mockResolvedValueOnce({ name: 'Acme Tenant', logo: '/logo-acme.png' });

    const { getByTestId } = render(
      <TenantProvider>
        <TestConsumer />
      </TenantProvider>
    );

    await waitFor(() => {
      expect(getByTestId('tenant-name').textContent).toBe('Acme Tenant');
      expect(getByTestId('subdomain').textContent).toBe('acme');
      expect(getByTestId('is-public').textContent).toBe('false');
    });
  });

  it('handles test_tenant override on localhost', async () => {
    vi.stubGlobal('location', { hostname: 'localhost', search: '?test_tenant=company1' });
    vi.mocked(apiFetch).mockResolvedValueOnce({ name: 'Company One', logo: '/logo1.png', enabled_modules: ['core'] });

    const { getByTestId } = render(
      <TenantProvider>
        <TestConsumer />
      </TenantProvider>
    );

    await waitFor(() => {
      expect(getByTestId('tenant-name').textContent).toBe('Company One');
      expect(getByTestId('subdomain').textContent).toBe('company1');
      expect(getByTestId('is-public').textContent).toBe('false');
    });
  });
});
