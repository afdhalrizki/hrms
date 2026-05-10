import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AuditLogsPage from '../app/[locale]/settings/audit-logs/page';
import { loginAs } from './setup';
import { AuthProvider } from '@/context/AuthContext';
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

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ 
    user: { id: 1, fullname: 'Admin', is_staff: true, permissions: { manage_hr: true } }, 
    loading: false 
  }),
  AuthProvider: ({ children }: any) => children,
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

describe('AuditLogsPage (Integrated)', () => {
  beforeAll(async () => {
    await loginAs('admin@company1.com');
  }, 20000);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders audit logs from real backend', async () => {
    render(<AuditLogsPage />, { wrapper: AllProviders });

    // Use findByText to wait for the table header to appear
    const header = await screen.findByText('table.timestamp', {}, { timeout: 20000 });
    expect(header).toBeInTheDocument();
    
    // Verify API was called
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/audit-logs');
    }, { timeout: 15000 });
  }, 40000);
});
