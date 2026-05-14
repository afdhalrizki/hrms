import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import EmployeesPage from '../app/[locale]/employees/page';
import { apiFetch } from '@/lib/api';
import { AuthProvider } from '@/context/AuthContext';
import { TenantProvider } from '@/context/TenantContext';
import { NextIntlClientProvider } from 'next-intl';

// Mock dependencies
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }: any) => <div>{children}</div>,
  useAuth: () => ({
    user: { email: 'admin@test.com' },
    loading: false,
  }),
}));

vi.mock('@/context/TenantContext', () => ({
  TenantProvider: ({ children }: any) => <div>{children}</div>,
  useTenant: () => ({
    tenant: { name: 'Test Tenant', plan_type: 'PROFESSIONAL' },
    loading: false,
  }),
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockEmployees = [
  {
    id: 1,
    nik: 'EMP001',
    fullname: 'Active User',
    email: 'active@test.com',
    status: 'PERMANENT',
    department_name: 'IT',
    role_name: 'Developer',
    access_role_name: 'Admin',
    grade_name: 'G1',
    join_date: '2023-01-01',
  },
  {
    id: 2,
    nik: 'EMP002',
    fullname: 'Terminated User',
    email: 'terminated@test.com',
    status: 'TERMINATED',
    department_name: 'HR',
    role_name: 'Recruiter',
    access_role_name: 'Staff',
    grade_name: 'G2',
    join_date: '2022-01-01',
  }
];

describe('EmployeesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiFetch as any).mockImplementation((endpoint: string) => {
      if (endpoint.startsWith('employees')) {
        // Simple mock: return all if show_terminated is true, else only non-terminated
        if (endpoint.includes('show_terminated=true')) {
          return Promise.resolve(mockEmployees);
        }
        return Promise.resolve(mockEmployees.filter(e => e.status !== 'TERMINATED'));
      }
      return Promise.resolve([]);
    });
  });

  const renderPage = () => {
    return render(
      <NextIntlClientProvider locale="en" messages={{}}>
        <EmployeesPage />
      </NextIntlClientProvider>
    );
  };

  it('renders employee list and hides terminated staff by default', async () => {
    renderPage();
    
    await waitFor(() => {
      expect(screen.getByText('Active User')).toBeInTheDocument();
    });
    
    expect(screen.queryByText('Terminated User')).not.toBeInTheDocument();
  });

  it('shows terminated staff when toggle is clicked', async () => {
    renderPage();
    
    const toggleBtn = await screen.findByText(/Show Terminated Staff/i);
    fireEvent.click(toggleBtn);
    
    await waitFor(() => {
      expect(screen.getByText('Terminated User')).toBeInTheDocument();
    });
  });

  it('can trigger employee termination', async () => {
    window.confirm = vi.fn().mockReturnValue(true);
    renderPage();
    
    await waitFor(() => screen.getByText('Active User'));
    
    // Open menu
    const menuBtn = screen.getByRole('button', { name: '' }); // MoreVertical icon button
    fireEvent.click(menuBtn);
    
    const terminateBtn = screen.getByText(/Terminate Staff/i);
    fireEvent.click(terminateBtn);
    
    expect(apiFetch).toHaveBeenCalledWith('employees/1/terminate/', expect.objectContaining({
      method: 'POST'
    }));
  });

  it('can trigger permanent deletion', async () => {
    window.confirm = vi.fn().mockReturnValue(true);
    renderPage();
    
    await waitFor(() => screen.getByText('Active User'));
    
    // Open menu
    const menuBtn = screen.getByRole('button', { name: '' });
    fireEvent.click(menuBtn);
    
    const deleteBtn = screen.getByText(/Delete Permanently/i);
    fireEvent.click(deleteBtn);
    
    expect(apiFetch).toHaveBeenCalledWith('employees/1/', expect.objectContaining({
      method: 'DELETE'
    }));
  });
});
