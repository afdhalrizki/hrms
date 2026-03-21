import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { ReactNode } from 'react';
import { TenantProvider, useTenant } from '@/context/TenantContext';

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
    vi.stubGlobal('location', { hostname: 'localhost' });
    process.env.NEXT_PUBLIC_DOMAIN_SUFFIX = 'harikerja.com';
    vi.resetModules();
  });

  it('identifies localhost as public', async () => {
    const { getByTestId } = render(
      <TenantProvider>
        <TestConsumer />
      </TenantProvider>
    );

    await waitFor(() => {
      expect(getByTestId('tenant-name').textContent).toBe('Public');
      expect(getByTestId('is-public').textContent).toBe('true');
    });
  });

  it('extracts subdomain correctly from default localhost suffix', async () => {
    vi.stubGlobal('location', { hostname: 'acme.harikerja.com' });

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
});
