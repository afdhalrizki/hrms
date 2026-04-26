import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { loginAs } from './setup';
import { AuthProvider } from '@/context/AuthContext';
import { TenantProvider } from '@/context/TenantContext';
import { NextIntlClientProvider } from 'next-intl';

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
  });

  it('renders real user data from backend', async () => {
    render(<Sidebar />, { wrapper: AllProviders });
    
    await waitFor(() => {
      // The Sidebar should display the logged-in user's email.
      // We accept either the specific worker email or the default one.
      const emailPattern = /admin@(worker_\d+|company1)\.com/i;
      expect(screen.getByText(emailPattern)).toBeInTheDocument();
    }, { timeout: 20000 });
  });
});
