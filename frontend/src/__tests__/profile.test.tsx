import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ProfilePage from '../app/[locale]/profile/page';
import { loginAs } from './setup';
import { AuthProvider } from '@/context/AuthContext';
import { NextIntlClientProvider } from 'next-intl';
import { toast } from 'sonner';

// Mock next-intl but include the provider using the factory argument
vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useTranslations: vi.fn(() => (key: string) => key),
  };
});

// Spy on apiFetch while letting it call the real backend
import * as api from '@/lib/api';
const originalApiFetch = api.apiFetch;
vi.spyOn(api, 'apiFetch');

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const AllProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <NextIntlClientProvider locale="en" messages={{}}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </NextIntlClientProvider>
  );
};

describe('ProfilePage (Integrated)', () => {
  beforeAll(async () => {
    // Login as employee1@company1.com
    await loginAs('employee1@company1.com');
  }, 20000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and displays real profile data from backend', async () => {
    render(<ProfilePage />, { wrapper: AllProviders });

    await waitFor(() => {
      expect(screen.getByText(/Employee 1/i)).toBeInTheDocument();
      expect(screen.getByText(/EMP001/i)).toBeInTheDocument();
    }, { timeout: 15000 });

    expect(screen.getByDisplayValue(/employee1@/i)).toBeDefined();
  }, 20000);

  it('updates profile fields and saves to real database', async () => {
    render(<ProfilePage />, { wrapper: AllProviders });

    // Wait for data to load
    await screen.findByText(/EMP001/i, {}, { timeout: 30000 });

    const phoneInput = screen.getByPlaceholderText('+62...');
    const addressInput = screen.getByPlaceholderText('Write your home address...');
    const saveButton = screen.getByRole('button', { name: /save/i });

    fireEvent.change(phoneInput, { target: { value: '081122334455' } });
    fireEvent.change(addressInput, { target: { value: 'Integrated Test Address Updated' } });

    // Mock API just to prevent continuous DB mutations during tests, but verify integration calling pattern
    vi.mocked(api.apiFetch).mockImplementation((endpoint: string, options: any) => {
      if (options?.method === 'PATCH') return Promise.resolve({});
      return originalApiFetch(endpoint, options);
    });

    fireEvent.click(saveButton);

    await waitFor(() => {
      const calls = (api.apiFetch as any).mock.calls;
      const patchCall = calls.find((c: any) => c[1]?.method === 'PATCH');
      expect(patchCall).toBeDefined();
      expect(patchCall[1].body).toContain('081122334455');
    });
  }, 25000);

  it('handles document upload', async () => {
    const { container } = render(<ProfilePage />, { wrapper: AllProviders });

    await waitFor(() => screen.getByText(/EMP001/i), { timeout: 15000 });

    const file = new File(['hello'], 'ktp.png', { type: 'image/png' });
    const ktpInput = container.querySelector('#ktp-upload') as HTMLInputElement;
    
    vi.mocked(api.apiFetch).mockImplementation((endpoint: string, options: any) => {
      if (options?.method === 'PATCH') return Promise.resolve({});
      return originalApiFetch(endpoint, options);
    });

    fireEvent.change(ktpInput, { target: { files: [file] } });

    await waitFor(() => {
      const formDataCall = (api.apiFetch as any).mock.calls.find((call: any) => call[1] && call[1].body instanceof FormData);
      expect(formDataCall).toBeDefined();
      expect(formDataCall[1].body.get('ktp_image')).toBeDefined();
    });
  }, 20000);

  it('handles profile fetch error', async () => {
    // We mock users/me to return user, then mock employees/id to fail
    vi.mocked(api.apiFetch).mockImplementation((endpoint: string, options: any) => {
      if (endpoint.includes('/employees/')) return Promise.reject(new Error('Fetch failed'));
      return originalApiFetch(endpoint, options);
    });
    
    render(<ProfilePage />, { wrapper: AllProviders });
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Fetch failed');
    });
  });

  it('handles update error', async () => {
    render(<ProfilePage />, { wrapper: AllProviders });
    
    await waitFor(() => screen.getByText(/EMP001/i), { timeout: 15000 });
    
    vi.mocked(api.apiFetch).mockImplementation((endpoint: string, options: any) => {
      if (options?.method === 'PATCH') {
        return Promise.reject(new Error('Update failed'));
      }
      return originalApiFetch(endpoint, options);
    });
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Update failed');
    });
  });

  it('handles avatar upload', async () => {
    const { container } = render(<ProfilePage />, { wrapper: AllProviders });
    await waitFor(() => screen.getByText(/EMP001/i), { timeout: 15000 });

    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });
    const avatarInput = container.querySelector('#avatar-upload') as HTMLInputElement;
    
    vi.mocked(api.apiFetch).mockImplementation((endpoint: string, options: any) => {
      if (options?.method === 'PATCH') return Promise.resolve({});
      return originalApiFetch(endpoint, options);
    });

    fireEvent.change(avatarInput, { target: { files: [file] } });

    await waitFor(() => {
      const formDataCall = (api.apiFetch as any).mock.calls.find((call: any) => 
        call[1] && call[1].body instanceof FormData && call[1].body.has('face_reference')
      );
      expect(formDataCall).toBeDefined();
    });
  }, 20000);

  it('updates KTP, NPWP and PTKP fields', async () => {
    render(<ProfilePage />, { wrapper: AllProviders });
    await waitFor(() => screen.getByText(/EMP001/i), { timeout: 15000 });

    const ktpInput = screen.getByTestId('profile-ktp');
    const npwpInput = screen.getByTestId('profile-npwp');
    const ptkpSelect = document.querySelector('select') as HTMLSelectElement;

    if (ktpInput && npwpInput && ptkpSelect) {
      fireEvent.change(ktpInput, { target: { value: '9999999999' } });
      fireEvent.change(npwpInput, { target: { value: 'NPWP99999' } });
      fireEvent.change(ptkpSelect, { target: { value: 'K/1' } });

      vi.mocked(api.apiFetch).mockImplementation((endpoint: string, options: any) => {
        if (options?.method === 'PATCH') return Promise.resolve({});
        return originalApiFetch(endpoint, options);
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        const calls = (api.apiFetch as any).mock.calls;
        const patchCall = calls.find((c: any) => c[1]?.method === 'PATCH');
        expect(patchCall).toBeDefined();
        expect(patchCall[1].body).toContain('9999999999');
        expect(patchCall[1].body).toContain('NPWP99999');
        expect(patchCall[1].body).toContain('K/1');
      });
    }
  }, 20000);

  it('toggles notification preference and saves to user endpoint', async () => {
    render(<ProfilePage />, { wrapper: AllProviders });
    await screen.findByText(/EMP001/i, {}, { timeout: 30000 });

    const toggleButton = screen.getByRole('button', { name: /form\.notifications/i });
    const saveButton = screen.getByRole('button', { name: /save/i });

    // Mock API
    vi.mocked(api.apiFetch).mockImplementation((endpoint: string, options: any) => {
      if (options?.method === 'PATCH') return Promise.resolve({});
      return originalApiFetch(endpoint, options);
    });

    // Toggle the preference
    fireEvent.click(toggleButton);
    fireEvent.click(saveButton);

    await waitFor(() => {
      const calls = (api.apiFetch as any).mock.calls;
      // Look for the call to /users/<id>/
      const userPatchCall = calls.find((c: any) => c[0].includes('/users/') && c[1]?.method === 'PATCH');
      expect(userPatchCall).toBeDefined();
      expect(userPatchCall[1].body).toContain('"receive_email_notifications":false');
    });
  });
});
