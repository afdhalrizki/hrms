import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import EmployeesPage from '../app/[locale]/employees/page';
import { apiFetch } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

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

describe('EmployeesPage', () => {
  const mockEmployees = [
    {
      id: 1,
      nik: "EMP001",
      fullname: "John Doe",
      email: "john@example.com",
      phone: "08123456789",
      status: "PERMANENT",
      department_name: "Engineering",
      role_name: "Developer",
      access_role_name: "Admin",
      golongan_name: "III/A",
      join_date: "2023-01-01"
    },
    {
      id: 2,
      nik: "EMP002",
      fullname: "Jane Smith",
      email: "jane@example.com",
      phone: "08987654321",
      status: "CONTRACT",
      department_name: "Sales",
      role_name: "Executive",
      access_role_name: "User",
      golongan_name: "II/A",
      join_date: "2023-06-01"
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation to handle all dropdown data fetches
    (apiFetch as any).mockImplementation((endpoint: string) => {
      if (endpoint === 'employees') return Promise.resolve(mockEmployees);
      if (endpoint === 'departments') return Promise.resolve([{ id: 1, name: 'Engineering' }]);
      if (endpoint === 'roles') return Promise.resolve([{ id: 1, name: 'Developer' }]);
      if (endpoint === 'golongan') return Promise.resolve([{ id: 1, name: 'III/A' }]);
      if (endpoint === 'access-roles') return Promise.resolve([{ id: 1, name: 'Admin' }]);
      return Promise.resolve([]);
    });

    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('renders loading state initially', () => {
    (apiFetch as any).mockImplementation(() => new Promise(() => {}));
    render(<EmployeesPage />);
    expect(screen.getByText('Loading employee data...')).toBeDefined();
  });

  it('renders employees list successfully', async () => {
    render(<EmployeesPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeDefined();
      expect(screen.getByText('Jane Smith')).toBeDefined();
    });

    expect(screen.getByText('Engineering')).toBeDefined();
    expect(screen.getByText('Sales')).toBeDefined();
    expect(screen.getByText('PERMANENT')).toBeDefined();
    expect(screen.getByText('CONTRACT')).toBeDefined();
  });

  it('handles search filter by name and nik', async () => {
    render(<EmployeesPage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Search by name/i);
    
    // Search by Name
    fireEvent.change(searchInput, { target: { value: 'Jane' } });
    await waitFor(() => {
      expect(screen.queryByText('John Doe')).toBeNull();
      expect(screen.getByText('Jane Smith')).toBeDefined();
    });

    // Search by NIK
    fireEvent.change(searchInput, { target: { value: 'EMP001' } });
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeDefined();
      expect(screen.queryByText('Jane Smith')).toBeNull();
    });
  });

  it('handles empty state', async () => {
    (apiFetch as any).mockImplementation((endpoint: string) => {
      if (endpoint === 'employees') return Promise.resolve([]);
      return Promise.resolve([]);
    });
    
    render(<EmployeesPage />);

    await waitFor(() => {
      expect(screen.getByText('No employees found matching your criteria.')).toBeDefined();
    });
  });

  it('opens add modal, fills form, and submits successfully', async () => {
    render(<EmployeesPage />);

    await waitFor(() => {
      expect(screen.getByText('Add Employee')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Add Employee'));

    await waitFor(() => {
      expect(screen.getByText('Provision New Employee')).toBeDefined();
    });

    // We change input to simulate form
    const fullNameInput = document.querySelector('input[name="fullname"]') as HTMLInputElement;
    fireEvent.change(fullNameInput, { target: { name: 'fullname', value: 'New Guy' } });
    expect(fullNameInput.value).toBe('New Guy');

    // Mocks for POST action
    (apiFetch as any).mockImplementation((endpoint: string, opts: any) => {
      if (endpoint === 'employees' && opts?.method === 'POST') return Promise.resolve({});
      if (endpoint === 'employees' && !opts) return Promise.resolve([...mockEmployees, { id: 3, fullname: 'New Guy', access_role_name: 'Admin' }]);
      return Promise.resolve([{ id: 1, name: 'dummy' }]);
    });

    // Submit form
    const submitBtn = screen.getByText('Provision Employee');
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('employees', expect.objectContaining({ method: 'POST' }));
    });
  });

  it('handles submission error gracefully', async () => {
    render(<EmployeesPage />);

    await waitFor(() => {
      expect(screen.getByText('Add Employee')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Add Employee'));

    await waitFor(() => {
      expect(screen.getByText('Provision New Employee')).toBeDefined();
    });

    (apiFetch as any).mockImplementation((endpoint: string, opts: any) => {
      if (endpoint === 'employees' && opts?.method === 'POST') return Promise.reject(new Error('Validation Failed'));
      if (endpoint === 'employees' && !opts) return Promise.resolve(mockEmployees);
      return Promise.resolve([]);
    });

    const submitBtn = screen.getByText('Provision Employee');
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("Error creating employee. Please check inputs.");
    });
  });

  it('toggles user login and admin privileges', async () => {
    render(<EmployeesPage />);

    await waitFor(() => {
      expect(screen.getByText('Add Employee')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Add Employee'));

    await waitFor(() => {
      expect(screen.getByText('Provision New Employee')).toBeDefined();
    });

    const checkboxUser = document.querySelector('input[name="create_user"]') as HTMLInputElement;
    expect(checkboxUser.checked).toBe(true); // Default true

    // When true, Access Role dropdown exists
    expect(screen.getByText('Assign RBAC Access Role')).toBeDefined();

    // Toggle off
    fireEvent.click(checkboxUser);
    expect(checkboxUser.checked).toBe(false);

    // Dropdown disappears
    expect(screen.queryByText('Assign RBAC Access Role')).toBeNull();
  });

  it('closes modal correctly', async () => {
    render(<EmployeesPage />);
    await waitFor(() => {
      expect(screen.getByText('Add Employee')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Add Employee'));

    await waitFor(() => {
      expect(screen.getByText('Provision New Employee')).toBeDefined();
    });

    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText('Provision New Employee')).toBeNull();
    });
  });

  it('renders PROBATION status color correctly', async () => {
    const probationEmployee = [{ ...mockEmployees[0], status: 'PROBATION' }];
    (apiFetch as any).mockImplementation((endpoint: string) => {
      if (endpoint === 'employees') return Promise.resolve(probationEmployee);
      return Promise.resolve([]);
    });

    render(<EmployeesPage />);
    await waitFor(() => {
      const statusBadge = screen.getByText('PROBATION');
      expect(statusBadge.className).toContain('text-orange-500');
    });
  });

  it('renders default status color for unknown status', async () => {
    const unknownEmployee = [{ ...mockEmployees[0], status: 'OTHER' }];
    (apiFetch as any).mockImplementation((endpoint: string) => {
      if (endpoint === 'employees') return Promise.resolve(unknownEmployee);
      return Promise.resolve([]);
    });

    render(<EmployeesPage />);
    await waitFor(() => {
      const statusBadge = screen.getByText('OTHER');
      expect(statusBadge.className).toContain('text-gray-500');
    });
  });

  it('handles fetchEmployees API error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (apiFetch as any).mockImplementation((endpoint: string) => {
      if (endpoint === 'employees') return Promise.reject(new Error('Fetch failed'));
      return Promise.resolve([]);
    });

    render(<EmployeesPage />);
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Failed to fetch employees:", expect.any(Error));
    });
    consoleSpy.mockRestore();
  });

  it('handles fetchDropdownData API error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (apiFetch as any).mockImplementation((endpoint: string) => {
      if (endpoint === 'employees') return Promise.resolve(mockEmployees);
      if (endpoint === 'departments') return Promise.reject(new Error('Dropdown fetch failed'));
      return Promise.resolve([]);
    });

    render(<EmployeesPage />);
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Failed to fetch dropdowns:", expect.any(Error));
    });
    consoleSpy.mockRestore();
  });

  it('closes modal when clicking backdrop or X button', async () => {
    render(<EmployeesPage />);
    
    // Open modal
    await waitFor(() => fireEvent.click(screen.getByText('Add Employee')));
    expect(screen.getByText('Provision New Employee')).toBeDefined();

    // Click X button (represented by lucide-react X which we mock as a button usually)
    // In our file, it's a button with absolute right-4 top-4
    const closeButton = document.querySelector('button.absolute.right-4.top-4');
    fireEvent.click(closeButton!);
    await waitFor(() => expect(screen.queryByText('Provision New Employee')).toBeNull());

    // Re-open
    await waitFor(() => fireEvent.click(screen.getByText('Add Employee')));
    
    // Click backdrop (the overlay div with onClick)
    const backdrop = document.querySelector('div.absolute.inset-0.bg-black\\/40');
    fireEvent.click(backdrop!);
    await waitFor(() => expect(screen.queryByText('Provision New Employee')).toBeNull());
  });
});
