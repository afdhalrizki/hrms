import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getBaseUrl, apiFetch } from '@/lib/api';

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

describe('apiFetch', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
    vi.stubGlobal('location', { hostname: 'localhost', port: '3000' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls fetch with correct URL and headers', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const data = await apiFetch('/test-endpoint');
    
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/test-endpoint',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
    expect(data).toEqual({ success: true });
  });

  it('throws error when response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
      json: async () => ({ detail: 'Custom error message' }),
    });

    await expect(apiFetch('/fail')).rejects.toThrow('Custom error message');
  });

  it('falls back to statusText if json error detail is missing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error',
      json: async () => { throw new Error('No JSON'); },
    });

    await expect(apiFetch('/fail')).rejects.toThrow('API Error: Internal Server Error');
  });
});
