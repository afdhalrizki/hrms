import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getBaseUrl, apiFetch, apiDownload } from '@/lib/api';

// Mock the height/animation features to prevent warnings
vi.mock('framer-motion', () => ({
  motion: {
    div: (props: any) => props.children,
  },
  AnimatePresence: (props: any) => props.children,
}));

// Ensure console.error does not break tests
const originalConsoleError = console.error;

describe('lib/api', () => {
  const originalLocation = window.location;
  const originalURL = window.URL;
  const originalCookie = document.cookie;

  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { hostname: 'localhost', port: '3000' },
    });
    process.env.NEXT_PUBLIC_DOMAIN_SUFFIX = 'harikerja.com';
    process.env.NEXT_PUBLIC_API_PORT = '8000';
    document.cookie = '';
    console.error = vi.fn();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
    window.URL = originalURL;
    document.cookie = originalCookie;
    console.error = originalConsoleError;
  });

  it('getBaseUrl returns localhost url when host is localhost', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { hostname: 'localhost', port: '3000' },
    });

    expect(getBaseUrl()).toBe('http://localhost:8000/api');
  });

  it('getBaseUrl uses https for project domain with no front-end ports', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { hostname: 'acme.harikerja.com', port: '' },
    });

    expect(getBaseUrl()).toBe('https://acme.harikerja.com/api');
  });

  it('getBaseUrl uses http with api port for project domain on 3000', () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { hostname: 'acme.harikerja.com', port: '3000' },
    });

    expect(getBaseUrl()).toBe('http://acme.harikerja.com:8000/api');
  });

  it('apiFetch sends Authorization and CSRF headers and returns json', async () => {
    localStorage.setItem('access_token', 'abc123');
    document.cookie = 'csrftoken=testcsrf';

    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'ok' }),
      text: async () => JSON.stringify({ message: 'ok' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiFetch('/test');

    expect(result).toEqual({ message: 'ok' });
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8000/api/test/', expect.objectContaining({
      credentials: 'include',
      headers: expect.objectContaining({
        Authorization: 'Bearer abc123',
        'X-CSRFToken': 'testcsrf',
        'Content-Type': 'application/json',
      }),
    }));
  });

  it('apiFetch refreshes token on 401 and retries original request', async () => {
    localStorage.setItem('access_token', 'old-token');
    localStorage.setItem('refresh_token', 'refresh-token');

    const initialResponse = {
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ detail: 'Unauthorized' }),
      text: async () => JSON.stringify({ detail: 'Unauthorized' }),
    };
    const refreshResponse = {
      ok: true,
      json: async () => ({ access: 'new-token' }),
      text: async () => JSON.stringify({ access: 'new-token' }),
    };
    const finalResponse = {
      ok: true,
      json: async () => ({ data: 'success' }),
      text: async () => JSON.stringify({ data: 'success' }),
    };

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(initialResponse)
      .mockResolvedValueOnce(refreshResponse)
      .mockResolvedValueOnce(finalResponse);
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiFetch('/test');

    expect(result).toEqual({ data: 'success' });
    expect(localStorage.getItem('access_token')).toBe('new-token');
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('apiFetch throws an error when response is not ok', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
      json: async () => ({ detail: 'Does not exist' }),
      text: async () => JSON.stringify({ detail: 'Does not exist' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/missing')).rejects.toThrow('Does not exist');
  });

  it('apiDownload creates blob URL and revokes it', async () => {
    const blob = new Blob(['dummy']);
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      blob: async () => blob,
    });
    vi.stubGlobal('fetch', fetchMock);

    const createObjectURL = vi.fn().mockReturnValue('blob:123');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', {
      createObjectURL,
      revokeObjectURL,
    } as any);

    const originalCreateElement = document.createElement.bind(document);
    const clickMock = vi.fn();

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName as any);
      if (tagName === 'a') {
        (element as any).click = clickMock;
      }
      return element;
    });

    await apiDownload('/download', 'file.txt');

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(clickMock).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:123');

    (document.createElement as any).mockRestore();
  });
});
