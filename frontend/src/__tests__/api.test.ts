import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getBaseUrl } from '@/lib/api';

describe('getBaseUrl', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
  });

  it('returns local backend URL when hostname is localhost', () => {
    vi.stubGlobal('location', { hostname: 'localhost', port: '3000' });
    expect(getBaseUrl()).toBe('http://localhost:8000/api');
  });

  it('supports custom NEXT_PUBLIC_API_PORT', () => {
    vi.stubGlobal('location', { hostname: 'localhost', port: '3000' });
    process.env.NEXT_PUBLIC_API_PORT = '9000';
    expect(getBaseUrl()).toBe('http://localhost:9000/api');
  });

  it('returns production URL with https for non-localhost', () => {
    vi.stubGlobal('location', { hostname: 'my-hr-app.com', port: '443' });
    expect(getBaseUrl()).toBe('https://my-hr-app.com/api');
  });

  it('supports fallback NEXT_PUBLIC_API_URL when window is undefined', () => {
    vi.stubGlobal('window', undefined);
    process.env.NEXT_PUBLIC_API_URL = 'https://api.test.com/api';
    expect(getBaseUrl()).toBe('https://api.test.com/api');
  });
});
