import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PayrollPage from '../app/[locale]/payroll/page';
import { GeneratePayrollModal } from '@/components/payroll/GeneratePayrollModal';
import { loginAs } from './setup';
import { AuthProvider } from '@/context/AuthContext';
import { TenantProvider } from '@/context/TenantContext';
import { NextIntlClientProvider } from 'next-intl';

// Mock next-intl
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
vi.spyOn(api, 'apiDownload').mockImplementation(() => Promise.resolve());

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
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ 
    user: { 
      id: 1, 
      fullname: 'Admin One', 
      is_staff: true,
      permissions: { manage_hr: true, manage_payroll: true } 
    }, 
    loading: false 
  }),
  AuthProvider: ({ children }: any) => children,
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

describe('Integrated Payroll Tests', () => {
  beforeAll(async () => {
    await loginAs('admin@company1.com');
  }, 20000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PayrollPage', () => {
    it('renders payslips list successfully from real backend', async () => {
      render(<PayrollPage />, { wrapper: AllProviders });
      
      await waitFor(() => {
        expect(screen.getByText('Admin One')).toBeInTheDocument();
      }, { timeout: 30000 });
    });

    it('opens detail modal on view button click', async () => {
      render(<PayrollPage />, { wrapper: AllProviders });
      
      await waitFor(() => screen.getByLabelText(/view-payslip-/i), { timeout: 15000 });
      const viewBtns = screen.getAllByLabelText(/view-payslip-/i);
      fireEvent.click(viewBtns[0]);
      
      await waitFor(() => {
        expect(screen.getByText(/detailTitle/i)).toBeInTheDocument();
      });
    });

    it('shows no payslips message when server returns empty data', async () => {
      vi.mocked(api.apiFetch).mockImplementation((endpoint: string, options: any) => {
        if (endpoint === '/payslips' || endpoint.startsWith('/payslips?')) return Promise.resolve([]);
        return originalApiFetch(endpoint, options);
      });

      render(<PayrollPage />, { wrapper: AllProviders });

      // Wait for loading to finish first
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      }, { timeout: 10000 });

      const emptyMessage = await screen.findByText(/empty/i);
      expect(emptyMessage).toBeInTheDocument();
    });

    it('calls apiDownload when download button is clicked', async () => {
       render(<PayrollPage />, { wrapper: AllProviders });

      await waitFor(() => screen.getByRole('button', { name: /view-payslip-/i }), { timeout: 15000 });
      const downloadBtns = screen.getAllByRole('button', { name: /download-payslip-/i });
      fireEvent.click(downloadBtns[0]);

      await waitFor(() => {
        expect(api.apiDownload).toHaveBeenCalled();
      }, { timeout: 10000 });
    }, 20000);

    it('calls apiDownload when export recap button is clicked', async () => {
      render(<PayrollPage />, { wrapper: AllProviders });

      await waitFor(() => screen.getByText(/export_recap/i), { timeout: 15000 });
      const exportBtn = screen.getByText(/export_recap/i);
      fireEvent.click(exportBtn);

      await waitFor(() => {
        expect(api.apiDownload).toHaveBeenCalledWith(
          expect.stringContaining('/payslips/export_recap_csv/'),
          expect.stringContaining('Payroll_Recap_')
        );
      }, { timeout: 10000 });
    });

    it('handles API fetch error gracefully', async () => {
       vi.mocked(api.apiFetch).mockImplementation((endpoint: string, options: any) => {
        if (endpoint === '/payslips' || endpoint.startsWith('/payslips?')) return Promise.reject(new Error('Fetch failed'));
        return originalApiFetch(endpoint, options);
      });
      
      render(<PayrollPage />, { wrapper: AllProviders });
      
      const { toast } = await import('sonner');
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      }, { timeout: 15000 });
    });
  });

  describe('GeneratePayrollModal', () => {
    it('fetches periods and enables the generate button when period is available', async () => {
      render(<GeneratePayrollModal onClose={() => {}} onSuccess={() => {}} />, { wrapper: AllProviders });

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);
      }, { timeout: 15000 });
    });

    it('shows error toast when payroll generation fails', async () => {
      vi.mocked(api.apiFetch).mockImplementation((endpoint: string, options: any) => {
        if (endpoint === '/payslips/generate') return Promise.reject(new Error('Generation failed'));
        return originalApiFetch(endpoint, options);
      });

      render(<GeneratePayrollModal onClose={() => {}} onSuccess={() => {}} />, { wrapper: AllProviders });

      const generateBtn = await screen.findByRole('button', { name: /modal.generateBtn/i });
      await waitFor(() => expect(generateBtn).not.toBeDisabled(), { timeout: 10000 });
      fireEvent.click(generateBtn);

      const { toast } = await import('sonner');
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      }, { timeout: 15000 });
    });
  });
});
