import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PayrollPage from '../app/[locale]/payroll/page';
import { GeneratePayrollModal } from '@/components/payroll/GeneratePayrollModal';
import { apiFetch, apiDownload } from '@/lib/api';
import { toast } from 'sonner';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  apiDownload: vi.fn(),
  getBaseUrl: vi.fn(() => 'http://localhost:8000/api'),
}));

vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => (key: string) => key),
}));

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
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('PayrollPage', () => {
  const mockPayslips = [
    { 
      id: 1, 
      employee_name: 'John Doe', 
      period_display: 'March 2026', 
      basic_salary: '12000000.00', 
      net_pay: '11500000.00', 
      pph21_tax: '200000.00',
      status: 'PAID',
      details: [
        { id: 10, description: 'Basic', amount: '12000000.00', is_deduction: false },
        { id: 11, description: 'Tax', amount: '500000.00', is_deduction: true }
      ]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (apiFetch as any).mockImplementation((endpoint: string) => {
      if (endpoint === '/payslips') return Promise.resolve(mockPayslips);
      if (endpoint === '/users/me') return Promise.resolve({ role: 'ADMIN', is_staff: false });
      if (endpoint === '/payroll-periods') return Promise.resolve([]);
      return Promise.resolve([]);
    });
  });

  it('renders payroll stats and list', async () => {
    render(<PayrollPage />);
    
    // Wait for the specific data to load
    const empName = await screen.findByText(/John Doe/i);
    expect(empName).toBeDefined();
    
    // Check for Run Payroll button (key basename)
    const runBtn = await screen.findByText(/runPayroll/i);
    expect(runBtn).toBeDefined();
  });

  it('opens detail modal on view button click', async () => {
    render(<PayrollPage />);
    
    const viewBtn = await screen.findByLabelText('view-payslip-1');
    fireEvent.click(viewBtn);
    
    const detailTitle = await screen.findByText(/detailTitle/i);
    expect(detailTitle).toBeDefined();
  });

  it('shows no payslips message when server returns empty data', async () => {
    (apiFetch as any).mockImplementation((endpoint: string) => {
      if (endpoint === '/payslips') return Promise.resolve([]);
      if (endpoint === '/users/me') return Promise.resolve({ role: 'ADMIN', is_staff: true });
      return Promise.resolve([]);
    });

    render(<PayrollPage />);

    const emptyMessage = await screen.findByText(/No payslips found for this period./i);
    expect(emptyMessage).toBeDefined();
  });

  it('calls apiDownload when download button is clicked', async () => {
    render(<PayrollPage />);

    const downloadBtn = await screen.findByLabelText('download-payslip-1');
    fireEvent.click(downloadBtn);

    expect((apiDownload as any)).toHaveBeenCalledWith('/payslips/1/download_pdf', 'Payslip_John_Doe.pdf');
  });

  it('shows toast on initial API fetch failure', async () => {
    (apiFetch as any).mockRejectedValueOnce(new Error('API failure'));

    render(<PayrollPage />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load payroll data');
    });
  });
});

describe('GeneratePayrollModal', () => {
  it('fetches periods and enables the generate button when period is available', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    (apiFetch as any)
      .mockResolvedValueOnce([{ id: 101, month: 4, year: 2026, is_closed: false }])
      .mockResolvedValueOnce({});

    render(<GeneratePayrollModal onClose={onClose} onSuccess={onSuccess} />);

    const generateButton = await screen.findByRole('button', { name: /modal.generateBtn/i });
    expect(generateButton).toBeEnabled();

    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/payslips/generate', {
        method: 'POST',
        body: JSON.stringify({ period_id: 101 }),
      });
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith('Payroll generated successfully');
  });

  it('shows error toast when payroll generation fails', async () => {
    const onClose = vi.fn();
    const onSuccess = vi.fn();

    (apiFetch as any).mockResolvedValueOnce([{ id: 101, month: 4, year: 2026, is_closed: false }]);
    (apiFetch as any).mockRejectedValueOnce(new Error('Generation failed'));

    render(<GeneratePayrollModal onClose={onClose} onSuccess={onSuccess} />);

    const generateButton = await screen.findByRole('button', { name: /modal.generateBtn/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Generation failed');
    });

    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
