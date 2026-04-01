import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WorkflowsPage from '../app/[locale]/workflows/page';
import { apiFetch } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  getBaseUrl: vi.fn(() => 'http://localhost:8000/api'),
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, layout, animate, initial, exit, transition, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

const mockConfigs = [
  {
    id: 1,
    model_type: 'PAYROLL',
    is_active: true,
    stages: [
      { id: 10, name: 'Initial Review', sequence: 1, approver_type: 'SUPERVISOR' },
      { id: 11, name: 'HR Approval', sequence: 2, approver_type: 'ROLE', approver_role: 2 },
    ]
  },
  {
    id: 2,
    model_type: 'LEAVE',
    is_active: false,
    stages: []
  }
];

const mockRoles = [{ id: 1, name: 'Admin' }, { id: 2, name: 'HR Manager' }];
const mockEmployees = [{ id: 1, fullname: 'John Doe' }];

describe('WorkflowsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (apiFetch as any).mockImplementation((endpoint: string) => {
      if (endpoint === '/workflow-configs') return Promise.resolve(mockConfigs);
      if (endpoint === '/access-roles') return Promise.resolve(mockRoles);
      if (endpoint === '/employees?lite=true') return Promise.resolve(mockEmployees);
      return Promise.resolve([]);
    });
    // Mock window.alert
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('renders loading state initially', async () => {
    (apiFetch as any).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve([]), 50)));
    render(<WorkflowsPage />);
    expect(screen.queryByText('Approval Builder')).toBeDefined();
  });

  it('renders configurations and supporting data', async () => {
    render(<WorkflowsPage />);
    await waitFor(() => {
      expect(screen.getByText('PAYROLL')).toBeDefined();
      expect(screen.getByText('LEAVE')).toBeDefined();
    });
    
    // First config should be selected by default
    // Stage names are in inputs, so use getByDisplayValue
    await waitFor(() => {
      expect(screen.getByDisplayValue('Initial Review')).toBeDefined();
      expect(screen.getByDisplayValue('HR Approval')).toBeDefined();
    });
  });

  it('handles empty configs gracefully', async () => {
    (apiFetch as any).mockImplementation((endpoint: string) => {
      if (endpoint === '/workflow-configs') return Promise.resolve([]);
      if (endpoint === '/access-roles') return Promise.resolve(mockRoles);
      if (endpoint === '/employees?lite=true') return Promise.resolve(mockEmployees);
      return Promise.resolve([]);
    });

    render(<WorkflowsPage />);
    await waitFor(() => {
      expect(screen.getByText('Select a workflow type to begin designing the sequence.')).toBeDefined();
    });
  });

  it('toggles config active status', async () => {
    render(<WorkflowsPage />);
    await waitFor(() => {
      expect(screen.getByText('PAYROLL')).toBeDefined();
    });

    const toggleBtn = screen.getByText('Workflow Status').closest('.glass-card')?.querySelector('button');
    expect(toggleBtn).toBeDefined();
    fireEvent.click(toggleBtn!);
  });

  it('selects a different config', async () => {
    render(<WorkflowsPage />);
    await waitFor(() => {
      expect(screen.getByText('LEAVE')).toBeDefined();
    });

    fireEvent.click(screen.getByText('LEAVE'));

    await waitFor(() => {
      // In LEAVE config, there are no stages initially
      expect(screen.queryByDisplayValue('Initial Review')).toBeNull();
    });
  });

  it('adds, modifies, and removes a stage', async () => {
    const { container } = render(<WorkflowsPage />);
    await waitFor(() => {
      expect(screen.getByText('PAYROLL')).toBeDefined();
    });

    const addBtn = screen.getByText('Add Approval Level');
    fireEvent.click(addBtn);

    // Now there should be 3 stages
    await waitFor(() => {
      expect(screen.getByDisplayValue('Stage 3')).toBeDefined();
    });

    // Modify the new stage name
    const stage3Input = screen.getByDisplayValue('Stage 3');
    fireEvent.change(stage3Input, { target: { value: 'Final CEO Approval' } });
    expect(screen.getByDisplayValue('Final CEO Approval')).toBeDefined();

    // Modify approver type
    const roleBtns = screen.getAllByText('ROLE');
    fireEvent.click(roleBtns[roleBtns.length - 1]);
    
    // Select role
    const selects = container.querySelectorAll('select');
    fireEvent.change(selects[selects.length - 1], { target: { value: '1' } });

    // Change to employee
    const empBtns = screen.getAllByText('EMPLOYEE');
    fireEvent.click(empBtns[empBtns.length - 1]);
    const selectsAgain = container.querySelectorAll('select');
    fireEvent.change(selectsAgain[selectsAgain.length - 1], { target: { value: '1' } });

    // Remove stage
    const deleteBtns = container.querySelectorAll('button:has(svg.lucide-trash2)');
    fireEvent.click(deleteBtns[deleteBtns.length - 1]);

    await waitFor(() => {
      expect(screen.queryByDisplayValue('Final CEO Approval')).toBeNull();
    });
  });

  it('saves the workflow configuration successfully', async () => {
    (apiFetch as any).mockImplementation((endpoint: string) => {
      if (endpoint === '/workflow-configs') return Promise.resolve(mockConfigs);
      if (endpoint === '/access-roles') return Promise.resolve(mockRoles);
      if (endpoint === '/employees?lite=true') return Promise.resolve(mockEmployees);
      return Promise.resolve([]);
    });

    render(<WorkflowsPage />);
    await waitFor(() => {
      expect(screen.getByText('PAYROLL')).toBeDefined();
    });

    // Reset calls before saving
    vi.mocked(apiFetch).mockClear();
    (apiFetch as any).mockResolvedValue({});
    (apiFetch as any).mockResolvedValueOnce({}); // Model PATCH
    (apiFetch as any).mockResolvedValueOnce({}); // Stage 1 PATCH
    (apiFetch as any).mockResolvedValueOnce({}); // Stage 2 PATCH
    (apiFetch as any).mockResolvedValueOnce(mockConfigs); // refresh load

    const saveBtn = screen.getByText('Save Changes');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/workflow-configs/1', expect.objectContaining({ method: 'PATCH' }));
      expect(apiFetch).toHaveBeenCalledWith('/workflow-stages/10', expect.objectContaining({ method: 'PATCH' }));
      expect(window.alert).toHaveBeenCalledWith('Workflow saved successfully!');
    });
  });

  it('handles save error gracefully', async () => {
    render(<WorkflowsPage />);
    await waitFor(() => {
      expect(screen.getByText('PAYROLL')).toBeDefined();
    });

    // Mock a failure for the next call
    (apiFetch as any).mockRejectedValueOnce(new Error('Save Failed'));

    const saveBtn = screen.getByText('Save Changes');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to save workflow.');
    });
  });

  it('saves a newly added stage via POST', async () => {
    render(<WorkflowsPage />);
    await waitFor(() => {
      expect(screen.getByText('PAYROLL')).toBeDefined();
    });

    const addBtn = screen.getByText('Add Approval Level');
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Stage 3')).toBeDefined();
    });

    (apiFetch as any).mockImplementation((endpoint: string, opts?: any) => {
      if (endpoint === '/workflow-stages' && opts?.method === 'POST') return Promise.resolve({});
      if (endpoint === '/workflow-configs') return Promise.resolve(mockConfigs);
      return Promise.resolve([]);
    });
    const saveBtn = screen.getByText('Save Changes');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      // Check for the POST call
      const postCall = vi.mocked(apiFetch).mock.calls.find(c => c[0] === '/workflow-stages' && c[1]?.method === 'POST');
      expect(postCall).toBeDefined();
      if (postCall && postCall[1]) {
        expect(JSON.parse(postCall[1].body as string)).toMatchObject({ name: 'Stage 3', sequence: 3 });
      }
    });
  });

  it('handles initial fetch errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (apiFetch as any).mockRejectedValue(new Error('Initial Load Failed'));
    
    render(<WorkflowsPage />);
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
    });
    consoleSpy.mockRestore();
  });
});
