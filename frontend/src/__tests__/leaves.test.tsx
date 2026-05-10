import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LeavesPage from '../app/[locale]/leaves/page';
import { loginAs } from './setup';
import { AuthProvider } from '@/context/AuthContext';
import { NextIntlClientProvider } from 'next-intl';
import { apiFetch } from '@/lib/api';

// Mock next-intl but include the provider using the factory argument
vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useTranslations: vi.fn(() => (key: string) => key),
  };
});

// Mock apiFetch to allow both real requests and mocked responses
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    apiFetch: vi.fn((...args) => actual.apiFetch(...args)),
  };
});

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ 
    user: { 
      id: 1, 
      fullname: 'Employee One', 
      is_staff: false,
      permissions: { manage_hr: false } 
    }, 
    loading: false 
  }),
  AuthProvider: ({ children }: any) => children,
}));

const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

vi.mock('sonner', () => ({
  toast: mockToast,
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

describe('LeavesPage (Integrated)', () => {
  beforeAll(async () => {
    // Login as employee1@company1.com who has seeded leave balances
    await loginAs('employee1@company1.com');
  }, 20000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders leave balances and history list from real backend', async () => {
    render(<LeavesPage />, { wrapper: AllProviders });
    
    // Seeded balance: 12.0 total days
    await waitFor(() => {
      const remainingValue = screen.getByTestId('remaining-days-value');
      expect(remainingValue).toBeDefined();
      expect(parseFloat(remainingValue.textContent || '0')).toBeGreaterThan(0);
    }, { timeout: 15000 });
  }, 20000);

  it('handles empty leave balances and history', async () => {
    (apiFetch as any).mockImplementation((endpoint: string) => {
      if (endpoint.includes('/leave-balances')) return Promise.resolve([]);
      if (endpoint.includes('/leave-requests')) return Promise.resolve([]);
      return Promise.resolve([]);
    });

    render(<LeavesPage />, { wrapper: AllProviders });
    
    await waitFor(() => {
      expect(screen.getByText(/No leave balance records found/i)).toBeInTheDocument();
      expect(screen.getByText(/No leave history found/i)).toBeInTheDocument();
    });
  });

  it('handles API fetch error gracefully', async () => {
    (apiFetch as any).mockRejectedValue(new Error('Network error'));
    render(<LeavesPage />, { wrapper: AllProviders });
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to load leave data');
    }, { timeout: 15000 });
  });

  it('opens and submits leave request modal to real API', async () => {
    render(<LeavesPage />, { wrapper: AllProviders });
    
    const requestBtn = await screen.findByText(/requestLeave/i, {}, { timeout: 15000 });
    fireEvent.click(requestBtn);
    
    const reasonInput = screen.getByLabelText(/form.reason/i);
    fireEvent.change(reasonInput, { target: { value: 'Personal matters integrated test' } });

    // Set dates to future
    const startDateInput = document.getElementById('start_date') as HTMLInputElement;
    const endDateInput = document.getElementById('end_date') as HTMLInputElement;
    fireEvent.change(startDateInput, { target: { value: '2026-12-01' } });
    fireEvent.change(endDateInput, { target: { value: '2026-12-02' } });

    // Mock POST to avoid creating real data continuously, but test the integration points
    (apiFetch as any).mockImplementation((endpoint: string, options: any) => {
      if (endpoint.includes('/leave-requests') && options?.method === 'POST') return Promise.resolve({ id: 100 });
      return Promise.resolve([]);
    });

    const submitBtn = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      const calls = (apiFetch as any).mock.calls;
      const postCall = calls.find((c: any) => c[0].includes('/leave-requests') && c[1]?.method === 'POST');
      expect(postCall).toBeDefined();
    });
  }, 25000);

  it('handles submission error', async () => {
    render(<LeavesPage />, { wrapper: AllProviders });
    
    const requestBtn = await screen.findByText(/requestLeave/i, {}, { timeout: 15000 });
    fireEvent.click(requestBtn);
    
    const reasonInput = screen.getByLabelText(/form.reason/i);
    fireEvent.change(reasonInput, { target: { value: 'Personal matters' } });

    (apiFetch as any).mockImplementation((endpoint: string, options: any) => {
      if (options?.method === 'POST') return Promise.reject(new Error('Quota exceeded'));
      if (endpoint.includes('/leave-balances')) return Promise.resolve([]);
      if (endpoint.includes('/leave-requests')) return Promise.resolve([]);
      return Promise.resolve([]);
    });

    const submitBtn = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Quota exceeded');
    });
  });

  it('handles input change for all form fields', async () => {
    render(<LeavesPage />, { wrapper: AllProviders });
    
    const requestBtn = await screen.findByText(/requestLeave/i, {}, { timeout: 15000 });
    fireEvent.click(requestBtn);

    const typeSelect = await screen.findByLabelText(/form.type/i);
    fireEvent.change(typeSelect, { target: { value: 'SAKIT' } });
    expect((typeSelect as HTMLSelectElement).value).toBe('SAKIT');

    const startDateInput = document.getElementById('start_date') as HTMLInputElement;
    fireEvent.input(startDateInput, { target: { value: '2026-04-01' } });
    fireEvent.change(startDateInput, { target: { value: '2026-04-01' } });
    expect(startDateInput.value).toBe('2026-04-01');

    const endDateInput = document.getElementById('end_date') as HTMLInputElement;
    fireEvent.input(endDateInput, { target: { value: '2026-04-05' } });
    fireEvent.change(endDateInput, { target: { value: '2026-04-05' } });
    expect(endDateInput.value).toBe('2026-04-05');
  });

  it('closes modal when cancel is clicked', async () => {
    render(<LeavesPage />, { wrapper: AllProviders });
    
    const requestBtn = await screen.findByText(/requestLeave/i, {}, { timeout: 15000 });
    fireEvent.click(requestBtn);
    
    await waitFor(() => {
      expect(screen.getByText('form.annual')).toBeDefined();
    });

    fireEvent.click(screen.getByText('cancel'));
    
    await waitFor(() => {
      expect(screen.queryByText('form.annual')).toBeNull();
    });
  });
});
