import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GlobalAdminsPage from '../app/[locale]/admin/global-admins/page';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import React from 'react';

// Mock dependencies
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../lib/api', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('../components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="dashboard-layout">{children}</div>,
}));

describe('GlobalAdminsPage', () => {
  const mockSuperAdmin = {
    id: 1,
    email: 'super@harikerja.com',
    global_role: 'SUPERADMIN',
  };

  const mockAdminsData = [
    { id: 1, email: 'super@harikerja.com', first_name: 'Super', last_name: 'Admin', global_role: 'SUPERADMIN' },
    { id: 2, email: 'support@harikerja.com', first_name: 'Support', last_name: 'Agent', global_role: 'SUPPORT_AGENT' },
  ];

  let adminsList: any[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    adminsList = [...mockAdminsData];

    (apiFetch as any).mockImplementation((url: string, options?: any) => {
      if (url.includes('/internal/tenants/')) {
        return Promise.resolve([
          { id: 1, name: 'Tenant A', schema_name: 'tenant_a' }
        ]);
      }
      if (url.includes('/internal/global-admins/')) {
        if (options?.method === 'POST') {
          const body = JSON.parse(options.body);
          const newAdmin = { id: 3, ...body };
          adminsList.push(newAdmin);
          return Promise.resolve(newAdmin);
        }
        return Promise.resolve(adminsList);
      }
      return Promise.resolve([]);
    });
  });

  it('renders unauthorized message for non-superadmin users', () => {
    (useAuth as any).mockReturnValue({
      user: { id: 2, email: 'support@harikerja.com', global_role: 'SUPPORT_AGENT' },
      loading: false,
    });

    render(<GlobalAdminsPage />);
    expect(screen.getByText('Unauthorized')).toBeInTheDocument();
    expect(screen.getByText('Only SUPERADMIN can access this page.')).toBeInTheDocument();
  });

  it('fetches and renders global admins for superadmin', async () => {
    (useAuth as any).mockReturnValue({
      user: mockSuperAdmin,
      loading: false,
    });

    render(<GlobalAdminsPage />);

    // Shows loading state initially
    expect(screen.getByText('Loading admins...')).toBeInTheDocument();

    // Waits for data to load
    await waitFor(() => {
      expect(screen.getByText('super@harikerja.com')).toBeInTheDocument();
      expect(screen.getByText('support@harikerja.com')).toBeInTheDocument();
    });

    expect(screen.getByText('Super Admin')).toBeInTheDocument();
    expect(screen.getByText('Support Agent')).toBeInTheDocument();
    expect(apiFetch).toHaveBeenCalledWith('/internal/global-admins/', expect.any(Object));
  });

  it('opens create modal and submits new admin', async () => {
    (useAuth as any).mockReturnValue({
      user: mockSuperAdmin,
      loading: false,
    });

    render(<GlobalAdminsPage />);

    await waitFor(() => expect(screen.getByText('super@harikerja.com')).toBeInTheDocument());

    const addButton = screen.getByRole('button', { name: /Add Admin/i });
    fireEvent.click(addButton);

    expect(screen.getByText('Add Global Admin')).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getAllByRole('textbox')[0], { target: { value: 'New' } }); // First Name
    fireEvent.change(screen.getAllByRole('textbox')[1], { target: { value: 'Admin' } }); // Last Name
    
    const emailInput = document.querySelector('input[type="email"]') || screen.getAllByRole('textbox')[2];
    if (emailInput) fireEvent.change(emailInput, { target: { value: 'new@hr.com' } });
    
    // Instead of deep interaction, let's just find the save button and submit the form
    const saveButton = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/internal/global-admins/', expect.objectContaining({
        method: 'POST'
      }));
    });
  });
});
