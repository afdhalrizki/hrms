import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AttendancePage from '../app/[locale]/attendance/page';
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

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal() as any;
  realApiFetch.current = actual.apiFetch;
  return {
    ...actual,
    apiFetch: vi.fn((...args) => actual.apiFetch(...args)),
    apiDownload: vi.fn(() => Promise.resolve()),
    getBaseUrl: vi.fn(() => 'http://localhost:8000/api'),
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

describe('AttendancePage (Integrated)', () => {
  beforeAll(async () => {
    await loginAs('employee1@company1.com');
  }, 20000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders attendance logs from real backend', async () => {
    render(<AttendancePage />, { wrapper: AllProviders });
    
    await waitFor(() => {
      expect(screen.getAllByText(/Employee 1/i).length).toBeGreaterThanOrEqual(1);
    }, { timeout: 30000 });
  });

  it('calls apiDownload when individual PDF button is clicked', async () => {
    render(<AttendancePage />, { wrapper: AllProviders });

    await waitFor(() => screen.getByText(/PDF Log/i), { timeout: 15000 });
    fireEvent.click(screen.getByText(/PDF Log/i));

    const { apiDownload } = await import('@/lib/api');
    await waitFor(() => {
      expect(apiDownload).toHaveBeenCalledWith(
        expect.stringContaining('/attendance/attendance/download_pdf/'),
        expect.stringContaining('Attendance_Log_')
      );
    });
  });

  it('calls apiDownload when summary PDF button is clicked', async () => {
    render(<AttendancePage />, { wrapper: AllProviders });

    await waitFor(() => screen.getByText(/Summary PDF/i), { timeout: 15000 });
    fireEvent.click(screen.getByText(/Summary PDF/i));

    const { apiDownload } = await import('@/lib/api');
    await waitFor(() => {
      expect(apiDownload).toHaveBeenCalledWith(
        expect.stringContaining('/attendance/attendance/export_summary_pdf/'),
        expect.stringContaining('Attendance_Summary_')
      );
    });
  });

  it('calls apiDownload when excel recap button is clicked', async () => {
    render(<AttendancePage />, { wrapper: AllProviders });

    await waitFor(() => screen.getByText(/Excel Recap/i), { timeout: 15000 });
    fireEvent.click(screen.getByText(/Excel Recap/i));

    const { apiDownload } = await import('@/lib/api');
    await waitFor(() => {
      expect(apiDownload).toHaveBeenCalledWith(
        expect.stringContaining('/attendance/attendance/export_csv/'),
        expect.stringContaining('Attendance_Recap_')
      );
    });
  });
});
