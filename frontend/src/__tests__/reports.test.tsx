import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReportsPage from '../app/[locale]/reports/page';
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

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    apiFetch: vi.fn(() => Promise.resolve({
      attendance_percent: 85,
      payroll_summary: { total_net_pay: 500000000, total_overtime: 15000000 },
      total_employees: 50,
      trends: { months: ['Jan'], headcount: [50] },
      department_distribution: []
    })),
    apiDownload: vi.fn(() => Promise.resolve()),
  };
});

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
      <TenantProvider>
        <AuthProvider>{children}</AuthProvider>
      </TenantProvider>
    </NextIntlClientProvider>
  );
};

describe('ReportsPage', () => {
  beforeAll(async () => {
    await loginAs('admin@company1.com');
  }, 20000);

  it('renders report categories successfully', async () => {
    render(<ReportsPage />, { wrapper: AllProviders });
    
    await waitFor(() => {
      expect(screen.getByText(/Attendance Report/i)).toBeInTheDocument();
      expect(screen.getByText(/Payroll Recap/i)).toBeInTheDocument();
      expect(screen.getByText(/Reimbursements/i)).toBeInTheDocument();
      expect(screen.getByText(/Performance Analysis/i)).toBeInTheDocument();
    });
  });

  it('calls apiDownload when XLSX button is clicked', async () => {
    render(<ReportsPage />, { wrapper: AllProviders });

    await waitFor(() => screen.getAllByText(/XLSX Recap/i), { timeout: 15000 });
    const xlsxBtns = screen.getAllByText(/XLSX Recap/i);
    fireEvent.click(xlsxBtns[0]); // Attendance XLSX

    const { apiDownload } = await import('@/lib/api');
    await waitFor(() => {
      expect(apiDownload).toHaveBeenCalledWith(
        expect.stringContaining('/attendance/attendance/export_xlsx/'),
        expect.stringContaining('Attendance_Report.xlsx')
      );
    });
  });
});
