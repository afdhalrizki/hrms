import '@testing-library/jest-dom';
import { vi, beforeAll, afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

// Silence console.error globally for tests to keep stderr clean. 
// We explicitly test error handling paths which results in noisy logs.
beforeEach(() => {
  vi.stubGlobal('console', { ...console, error: vi.fn() });
});

// Integrated Test Helper: Login as a specific user to get a real token
export async function loginAs(email: string, password = 'password123') {
  const loginUrl = 'http://localhost:8000/api/auth/login/';
  try {
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      throw new Error(`Login failed for ${email}: ${response.statusText}`);
    }
    const data = await response.json();
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('access_token', data.access);
      window.localStorage.setItem('refresh_token', data.refresh);
      // For multi-tenant tests on localhost
      window.sessionStorage.setItem('test_tenant_e2e', 'company1');
    }
    return data.access;
  } catch (error) {
    console.error('Test Login Failed:', error);
    return null;
  }
}

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
  useMessages: () => ({}),
  useTimeZone: () => 'UTC',
  useNow: () => new Date(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({ locale: 'en' }),
}));

vi.mock('@/i18n/routing', () => ({
  routing: { locales: ['en', 'id'], defaultLocale: 'en' },
  Link: ({ children, href }: any) => React.createElement('a', { href }, children),
  redirect: vi.fn(),
  usePathname: () => '/',
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mocking matchMedia (often required for UI components like Framer Motion)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Mocking next/image to avoid layout prop warnings in tests
vi.mock('next/image', () => ({
  default: (props: any) => {
    // eslint-disable-next-line jsx-a11y/alt-text
    return React.createElement('img', { ...props, priority: undefined, fetchPriority: undefined });
  },
}));
