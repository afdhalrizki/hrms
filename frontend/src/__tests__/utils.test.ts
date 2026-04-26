import { describe, it, expect, vi } from 'vitest';
import { loginAs } from './setup';

describe('Test Utilities', () => {
  it('loginAs returns a token on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access: 'test_token', refresh: 'refresh_token' }),
      text: async () => ''
    }));

    const token = await loginAs('test@example.com');
    expect(token).toBe('test_token');
  });

  it('loginAs handles failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Unauthorized',
      text: async () => 'Unauthorized'
    }));

    const token = await loginAs('fail@example.com');
    expect(token).toBeNull();
  });

  it('verifies localStorage integration', () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('test_key', 'test_value');
      expect(localStorage.getItem('test_key')).toBe('test_value');
    }
  });

  it('verifies sessionStorage integration', () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('test_session', 'session_value');
      expect(sessionStorage.getItem('test_session')).toBe('session_value');
    }
  });

  it('verifies window.location mocking', () => {
    if (typeof window !== 'undefined') {
      expect(window.location.hostname).toBe('localhost');
    }
  });

  it('verifies environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('verifies canvas mocking', () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    expect(ctx).toBeDefined();
    expect(typeof ctx?.fillRect).toBe('function');
  });

  it('verifies next-intl mocking', async () => {
    const { useTranslations } = await import('next-intl');
    const t = useTranslations();
    expect(t('test_key')).toBe('test_key');
  });

  it('verifies next/navigation mocking', async () => {
    const { useRouter } = await import('next/navigation');
    const router = useRouter();
    expect(typeof router.push).toBe('function');
  });

  it('verifies tenant isolation logic', () => {
    const workerId = '1';
    process.env.VITEST_WORKER_ID = workerId;
    const workerIdx = parseInt(workerId, 10);
    const tenant = `worker_${workerIdx % 4}`;
    expect(tenant).toBe('worker_1');
  });
});
