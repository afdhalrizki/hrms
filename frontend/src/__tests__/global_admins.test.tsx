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

  beforeEach(() => {
    vi.clearAllMocks();
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
    (apiFetch as any).mockResolvedValue(mockAdminsData);

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
    (apiFetch as any).mockResolvedValueOnce(mockAdminsData) // Initial load
                     .mockResolvedValueOnce({}) // POST request
                     .mockResolvedValueOnce([...mockAdminsData, { id: 3, email: 'new@hr.com', first_name: 'New', last_name: 'Admin', global_role: 'ONBOARDING_AGENT' }]); // Refresh list

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

    const inputs = screen.getAllByRole('textbox'); // email might not be a textbox depending on test-library version, it might be input type=email
    // Just find by display value or directly simulate submit if we don't need strict DOM interaction for every field.
    
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
