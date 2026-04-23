import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReimbursementsPage from '../app/[locale]/reimbursements/page';
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

// Spy on apiFetch while letting it call the real backend
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal() as any;
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

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
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

describe('ReimbursementsPage (Integrated)', () => {
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

  it('renders reimbursements list from real backend', async () => {
    render(<ReimbursementsPage />, { wrapper: AllProviders });
    
    await waitFor(() => {
      // Seeded data has 'Taxi to client'
      expect(screen.getByText(/Taxi to client/i)).toBeInTheDocument();
    }, { timeout: 15000 });
  });

  it('handles empty state successfully', async () => {
    (apiFetch as any).mockImplementation((endpoint: string, options: any) => {
      if (endpoint.includes('/reimbursements') && (!options || options.method === 'GET')) return Promise.resolve([]);
      return vi.importActual('@/lib/api').then((mod: any) => mod.apiFetch(endpoint, options));
    });

    render(<ReimbursementsPage />, { wrapper: AllProviders });

    await waitFor(() => {
      expect(screen.getByText(/No claims found/i)).toBeInTheDocument();
    });
  });

  it('handles empty claims and categories', async () => {
    (apiFetch as any).mockImplementation((endpoint: string, options: any) => {
       if (endpoint.includes('/reimbursement-categories')) return Promise.resolve([]);
       if (endpoint.includes('/reimbursements') && (!options || options.method === 'GET')) return Promise.resolve([]);
       return vi.importActual('@/lib/api').then((mod: any) => mod.apiFetch(endpoint, options));
    });
    render(<ReimbursementsPage />, { wrapper: AllProviders });
    
    await waitFor(() => {
      expect(screen.getByText(/No claims found/i)).toBeInTheDocument();
    });
  });

  it('handles API error on fetch', async () => {
    (apiFetch as any).mockImplementation((endpoint: string, options: any) => {
      if (endpoint.includes('/reimbursements') && (!options || options.method === 'GET')) return Promise.reject(new Error('Fetch failed'));
      return vi.importActual('@/lib/api').then((mod: any) => mod.apiFetch(endpoint, options));
    });

    render(<ReimbursementsPage />, { wrapper: AllProviders });

    const { toast } = await import('sonner');
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it('submits a new reimbursement request successfully', async () => {
    const { container } = render(<ReimbursementsPage />, { wrapper: AllProviders });
    
    await waitFor(() => screen.getByText('newClaim'), { timeout: 15000 });
    fireEvent.click(screen.getByText('newClaim'));

    // Wait for modal and select category
    const categorySelect = await screen.findByLabelText(/form.category/i);
    fireEvent.change(categorySelect, { target: { value: '1' } });

    const amountInput = screen.getByLabelText(/form.amount/i);
    fireEvent.change(amountInput, { target: { value: '250000' } });

    const descInput = screen.getByLabelText(/form.description/i);
    fireEvent.change(descInput, { target: { value: 'Team Lunch' } });

    (apiFetch as any).mockImplementation((endpoint: string, options: any) => {
      if (endpoint.includes('/reimbursements') && options?.method === 'POST') return Promise.resolve({ id: 123 });
      return vi.importActual('@/lib/api').then((mod: any) => mod.apiFetch(endpoint, options));
    });

    // Use fireEvent.submit on the form directly if button click is problematic
    const form = container.querySelector('form');
    if (form) {
      fireEvent.submit(form);
    } else {
      const submitBtn = screen.getByText('submit');
      fireEvent.click(submitBtn);
    }

    await waitFor(() => {
      const calls = (apiFetch as any).mock.calls;
      const postCall = calls.find((c: any) => c[0].includes('/reimbursements') && c[1]?.method === 'POST');
      expect(postCall).toBeDefined();
    }, { timeout: 20000 });
  }, 30000);
});
