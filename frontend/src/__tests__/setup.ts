import '@testing-library/jest-dom';
import { vi, beforeAll, afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

// Force window.location for jsdom so hostname matches localhost for X-Tenant header
if (typeof window !== 'undefined') {
  const url = new URL('http://localhost:3000/');
  Object.defineProperty(window, 'location', {
    value: url,
    writable: true,
  });
}

// No longer silencing console.error globally to help diagnose test failures

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
       console.log(`[LOGIN] Failed: ${loginUrl} returned ${response.status} ${response.statusText}`);
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

// Mocking framer-motion to disable animations in tests
vi.mock('framer-motion', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    motion: {
      ...actual.motion,
      div: (props: any) => React.createElement('div', { ...props, transition: undefined, initial: undefined, animate: undefined, exit: undefined }),
      h1: (props: any) => React.createElement('h1', { ...props, transition: undefined, initial: undefined, animate: undefined, exit: undefined }),
      p: (props: any) => React.createElement('p', { ...props, transition: undefined, initial: undefined, animate: undefined, exit: undefined }),
      span: (props: any) => React.createElement('span', { ...props, transition: undefined, initial: undefined, animate: undefined, exit: undefined }),
      section: (props: any) => React.createElement('section', { ...props, transition: undefined, initial: undefined, animate: undefined, exit: undefined }),
      button: (props: any) => React.createElement('button', { ...props, transition: undefined, initial: undefined, animate: undefined, exit: undefined }),
      nav: (props: any) => React.createElement('nav', { ...props, transition: undefined, initial: undefined, animate: undefined, exit: undefined }),
    },
    AnimatePresence: ({ children }: any) => children,
  };
});
