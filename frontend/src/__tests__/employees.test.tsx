import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import EmployeesPage from '../app/[locale]/employees/page';
import { loginAs } from './setup';
import { AuthProvider } from '@/context/AuthContext';
import { NextIntlClientProvider } from 'next-intl';

// Mock next-intl but include the provider using the factory argument
vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useTranslations: vi.fn(() => (key: string) => key),
  };
});

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('framer-motion', () => ({
  motion: {
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
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

describe('EmployeesPage (Integrated)', () => {
  beforeAll(async () => {
    // Login as admin@company1.com who has permissions to see and manage employees
    await loginAs('admin@company1.com');
  }, 20000);

  it('renders employees list successfully from real backend', async () => {
    render(<EmployeesPage />, { wrapper: AllProviders });

    // Seeded employees for company1: "Admin One", "Manager One", "Employee One"
    await waitFor(() => {
      expect(screen.getByText(/Admin One/i)).toBeDefined();
      expect(screen.getByText(/Manager One/i)).toBeDefined();
      expect(screen.getByText(/Employee One/i)).toBeDefined();
    }, { timeout: 15000 });

    // Verify departments/roles are loaded from real DB
    expect(screen.getAllByText(/Engineering/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Software Engineer/i).length).toBeGreaterThan(0);
  }, 20000);

  it('handles search filter by name', async () => {
    render(<EmployeesPage />, { wrapper: AllProviders });

    await waitFor(() => {
      expect(screen.getByText(/Manager One/i)).toBeDefined();
    }, { timeout: 15000 });

    const searchInput = screen.getByPlaceholderText(/Search by name/i);

    // Search for Manager
    fireEvent.change(searchInput, { target: { value: 'Manager' } });
    await waitFor(() => {
      expect(screen.queryByText(/Admin One/i)).toBeNull();
      expect(screen.getByText(/Manager One/i)).toBeDefined();
    }, { timeout: 10000 });
  }, 20000);

  it('opens add modal correctly', async () => {
    render(<EmployeesPage />, { wrapper: AllProviders });

    const addBtn = await screen.findByText(/Add Employee/i, {}, { timeout: 15000 });
    fireEvent.click(addBtn);

    const modalTitle = await screen.findByText(/Provision New Employee/i);
    expect(modalTitle).toBeDefined();

    // Verify dropdowns are populated from real backend
    const deptSelect = document.querySelector('select[name="department"]');
    await waitFor(() => {
      expect(deptSelect?.innerHTML).toContain('Engineering');
    }, { timeout: 10000 });
  }, 20000);
});
