import '@testing-library/jest-dom';
import { vi, beforeAll, afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';

// Global console log filter to keep test output clean
const originalLog = console.log;
const originalInfo = console.info;
const originalError = console.error;

console.log = (...args: any[]) => {
  const firstArg = args[0]?.toString() || '';
  // Silence [API] logs unless DEBUG_API is set
  if (firstArg.startsWith('[API]') && !process.env.DEBUG_API) return;
  // Silence common environment/mock warnings that don't affect test correctness
  if (firstArg.includes('Download Error:')) return;
  originalLog(...args);
};

console.info = (...args: any[]) => {
  const firstArg = args[0]?.toString() || '';
  if (firstArg.startsWith('[API]') && !process.env.DEBUG_API) return;
  originalInfo(...args);
};

console.error = (...args: any[]) => {
  const fullMessage = args.map(arg => arg?.toString() || '').join(' ');
  // Silence AbortErrors and related network noise during teardown
  if (
    fullMessage.includes('The operation was aborted') || 
    fullMessage.includes('AbortError') ||
    fullMessage.includes('NetworkError') && fullMessage.includes('aborted') ||
    fullMessage.includes('wrapped in act(...)')
  ) return;
  originalError(...args);
};

// Global process-level rejection filter for "floating" aborted fetches
process.on('unhandledRejection', (reason: any) => {
  const msg = reason?.message || '';
  if (msg.includes('The operation was aborted') || msg.includes('AbortError')) {
    return;
  }
});

if (typeof window !== 'undefined') {
  // Silence specific environmental errors that cause vitest to fail teardown
  window.addEventListener('error', (event) => {
    if (event.message?.includes('getContext') || event.message?.includes('snap-popup')) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('getContext') || event.reason?.message?.includes('snap-popup')) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  // Aggressive getContext mock
  if (typeof HTMLCanvasElement !== 'undefined') {
    const mockContext = {
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray() })),
      putImageData: vi.fn(),
      createImageData: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
      transform: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
    };
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext) as any;
  }

  // Use vi.stubGlobal for matchMedia
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
}

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

// Intercept fetch to add X-Tenant header for worker isolation
const originalFetch = global.fetch;
global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  let url = '';
  if (typeof input === 'string') url = input;
  else if (input instanceof URL) url = input.toString();
  else if (input instanceof Request) url = input.url;

  const workerId = process.env.VITEST_WORKER_ID || '';
  const workerIdx = parseInt(workerId, 10);
  const numWorkers = parseInt(process.env.TEST_WORKER_COUNT || '4', 10);
  const tenant = (!isNaN(workerIdx)) ? `worker_${((workerIdx - 1) % numWorkers + numWorkers) % numWorkers}` : 'company1';
  
  if (url.includes('localhost:8000')) {
    const newInit = { ...init };
    // CRITICAL: Preserve existing headers from both init and Request object
    const originalHeaders = (input instanceof Request) ? input.headers : (init?.headers || {});
    const headers = new Headers(originalHeaders);
    
    headers.set('X-Tenant', tenant);
    newInit.headers = headers;
    
    if (process.env.DEBUG_API) {
      const auth = headers.get('Authorization') ? 'Present' : 'Missing';
      console.log(`[TEST-FETCH] ${url} | Tenant: ${tenant} | Auth: ${auth}`);
    }
    
    if (input instanceof Request) {
      // Create new request but keep all original request properties
      const newRequest = new Request(input, {
        headers: headers
      });
      return originalFetch(newRequest);
    }
    
    return originalFetch(input, newInit);
  }
  return originalFetch(input, init);
};

// Integrated Test Helper: Login as a specific user to get a real token
export async function loginAs(email: string, password = 'password123') {
  const workerId = process.env.VITEST_WORKER_ID || '';
  const workerIdx = parseInt(workerId, 10);
  const numWorkers = parseInt(process.env.TEST_WORKER_COUNT || '4', 10);
  const tenant = (!isNaN(workerIdx)) ? `worker_${((workerIdx - 1) % numWorkers + numWorkers) % numWorkers}` : 'company1';

  // In parallel tests, we must use the admin of the specific worker tenant
  // to avoid cross-tenant authentication failures.
  if (email === 'admin@company1.com' && tenant !== 'company1') {
    email = `admin@${tenant}.com`;
  }

  const loginUrl = 'http://localhost:8000/api/auth/login/';
  try {
    if (process.env.DEBUG_API) {
      console.log(`[TEST-LOGIN] Attempting login for ${email}...`);
    }
    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => 'no body');
      throw new Error(`Login failed for ${email}: ${response.status} ${response.statusText} - ${body}`);
    }
    const data = await response.json();
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('access_token', data.access);
      window.localStorage.setItem('refresh_token', data.refresh);
      
      const workerId = process.env.VITEST_WORKER_ID;
      const workerIdx = parseInt(workerId || '', 10);
      const numWorkers = parseInt(process.env.TEST_WORKER_COUNT || '4', 10);
      const tenant = (!isNaN(workerIdx)) ? `worker_${((workerIdx - 1) % numWorkers + numWorkers) % numWorkers}` : 'company1';
      window.sessionStorage.setItem('test_tenant_e2e', tenant);
      if (process.env.DEBUG_API) {
        console.log(`[TEST-LOGIN] Success for ${email} on tenant ${tenant}`);
      }
    }
    return data.access;
  } catch (error) {
    console.error('[TEST-LOGIN] ERROR:', error);
    return null;
  }
}

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    dismiss: vi.fn(),
    promise: vi.fn(),
  },
}));

vi.mock('next-intl', () => ({
  __esModule: true,
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
  useMessages: () => ({}),
  useTimeZone: () => 'UTC',
  useNow: () => new Date(),
  NextIntlClientProvider: ({ children }: any) => children,
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

vi.mock('next/image', () => ({
  default: (props: any) => {
    return React.createElement('img', { ...props, priority: undefined, fetchPriority: undefined });
  },
}));

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
      tr: (props: any) => React.createElement('tr', { ...props, transition: undefined, initial: undefined, animate: undefined, exit: undefined }),
      table: (props: any) => React.createElement('table', { ...props, transition: undefined, initial: undefined, animate: undefined, exit: undefined }),
      thead: (props: any) => React.createElement('thead', { ...props, transition: undefined, initial: undefined, animate: undefined, exit: undefined }),
      tbody: (props: any) => React.createElement('tbody', { ...props, transition: undefined, initial: undefined, animate: undefined, exit: undefined }),
      th: (props: any) => React.createElement('th', { ...props, transition: undefined, initial: undefined, animate: undefined, exit: undefined }),
      td: (props: any) => React.createElement('td', { ...props, transition: undefined, initial: undefined, animate: undefined, exit: undefined }),
    },
    AnimatePresence: ({ children }: any) => children,
  };
});
