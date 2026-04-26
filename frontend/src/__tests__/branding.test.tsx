import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import BrandingPage from '../app/[locale]/settings/branding/page';
import { loginAs } from './setup';
import { AuthProvider } from '@/context/AuthContext';
import { TenantProvider } from '@/context/TenantContext';
import { NextIntlClientProvider } from 'next-intl';
import { apiFetch } from '@/lib/api';

// Mock next-intl
vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useTranslations: vi.fn(() => (key: string) => key),
  };
});

const { realApiFetch } = vi.hoisted(() => ({ realApiFetch: { current: null as any } }));
 
 // Spy on apiFetch while letting it call the real backend
 vi.mock('@/lib/api', async (importOriginal) => {
   const actual = await importOriginal() as any;
   realApiFetch.current = actual.apiFetch;
   return {
     ...actual,
     apiFetch: vi.fn((...args) => actual.apiFetch(...args)),
     getBaseUrl: vi.fn(() => 'http://localhost:8000/api'),
   };
 });

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
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

describe('BrandingPage (Integrated)', () => {
  beforeAll(async () => {
    // Force tenant context for integrated tests
    const url = new URL('http://localhost:3000/?test_tenant=company1');
    Object.defineProperty(window, 'location', {
      value: url,
      writable: true,
    });
    await loginAs('admin@company1.com');
  }, 20000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders branding settings with current values from real backend', async () => {
    render(<BrandingPage />, { wrapper: AllProviders });
    
    await waitFor(() => {
      expect(screen.getByText('title')).toBeInTheDocument();
      const colorInputs = document.querySelectorAll('input[type="color"]');
      expect(colorInputs.length).toBeGreaterThan(0);
    }, { timeout: 15000 });
  });

  it('handles logo change', async () => {
    const file = new File(['(⌐□_□)'], 'logo.png', { type: 'image/png' });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    
    render(<BrandingPage />, { wrapper: AllProviders });
    
    await waitFor(() => screen.getByRole('button', { name: /updateBtn/i }), { timeout: 15000 });
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByAltText('Logo Preview')).toHaveAttribute('src', 'blob:mock-url');
    });
  });

  it('handles primary color change', async () => {
    render(<BrandingPage />, { wrapper: AllProviders });
    await waitFor(() => screen.getByRole('button', { name: /updateBtn/i }), { timeout: 15000 });
    
    const colorInputs = document.querySelectorAll('input[type="color"]');
    fireEvent.change(colorInputs[0], { target: { value: '#ff0000' } });
    expect((colorInputs[0] as HTMLInputElement).value).toBe('#ff0000');
  });

  it('handles secondary color change', async () => {
    render(<BrandingPage />, { wrapper: AllProviders });
    await waitFor(() => screen.getByRole('button', { name: /updateBtn/i }), { timeout: 15000 });
    
    const colorInputs = document.querySelectorAll('input[type="color"]');
    if (colorInputs.length > 1) {
      fireEvent.change(colorInputs[1], { target: { value: '#00ff00' } });
      expect((colorInputs[1] as HTMLInputElement).value).toBe('#00ff00');
    }
  });

  it('updates branding colors successfully', async () => {
    render(<BrandingPage />, { wrapper: AllProviders });
    
    await waitFor(() => screen.getByRole('button', { name: /updateBtn/i }), { timeout: 15000 });

    const colorInputs = document.querySelectorAll('input[type="color"]');
    fireEvent.change(colorInputs[0], { target: { value: '#112233' } });

    (apiFetch as any).mockImplementation((endpoint: string, options: any) => {
      if (options?.method === 'PATCH') return Promise.resolve({});
      return realApiFetch.current(endpoint, options);
    });

    const button = screen.getByRole('button', { name: /updateBtn/i });
    fireEvent.click(button);

    await waitFor(() => {
      const patchCall = (apiFetch as any).mock.calls.find((c: any) => c[1]?.method === 'PATCH');
      expect(patchCall).toBeDefined();
    });
  });

  it('shows error toast when update fails', async () => {
    render(<BrandingPage />, { wrapper: AllProviders });
    
    await waitFor(() => screen.getByRole('button', { name: /updateBtn/i }), { timeout: 15000 });

    (apiFetch as any).mockImplementation((endpoint: string, options: any) => {
      if (options?.method === 'PATCH') return Promise.reject(new Error('Update failed'));
      return realApiFetch.current(endpoint, options);
    });

    const button = screen.getByRole('button', { name: /updateBtn/i });
    fireEvent.click(button);

    const { toast } = await import('sonner');
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });
});
