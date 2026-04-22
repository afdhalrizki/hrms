import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WorkflowsPage from '../app/[locale]/workflows/page';
import { loginAs } from './setup';
import { AuthProvider } from '@/context/AuthContext';
import { TenantProvider } from '@/context/TenantContext';
import { NextIntlClientProvider } from 'next-intl';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

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

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, layout, animate, initial, exit, transition, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
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

describe('WorkflowsPage (Integrated)', () => {
  beforeAll(async () => {
    // Force tenant context for integrated tests
    const url = new URL('http://localhost:3000/?test_tenant=company1');
    Object.defineProperty(window, 'location', {
      value: url,
      writable: true,
    });
    await loginAs('admin@company1.com');
  }, 20000);

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.alert
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('renders loading state initially', async () => {
     (apiFetch as any).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve([]), 100)));
     render(<WorkflowsPage />, { wrapper: AllProviders });
     // Since we are using integrated, it might show something initially
     expect(screen.getByText(/Approval Builder/i)).toBeInTheDocument();
  });

  it('renders configurations from real backend', async () => {
    render(<WorkflowsPage />, { wrapper: AllProviders });
    
    await waitFor(() => {
      expect(screen.getByText('LEAVE')).toBeInTheDocument();
    }, { timeout: 15000 });
  });

  it('handles empty configs gracefully', async () => {
    (apiFetch as any).mockImplementation((endpoint: string, options: any) => {
      if (endpoint === '/workflow-configs') return Promise.resolve([]);
      return vi.importActual('@/lib/api').then((mod: any) => mod.apiFetch(endpoint, options));
    });

    render(<WorkflowsPage />, { wrapper: AllProviders });
    await waitFor(() => {
      expect(screen.getByText('Select a workflow type to begin designing the sequence.')).toBeInTheDocument();
    });
  });

  it('toggles config active status on real backend', async () => {
    render(<WorkflowsPage />, { wrapper: AllProviders });
    await waitFor(() => {
      expect(screen.getByText('LEAVE')).toBeInTheDocument();
    }, { timeout: 15000 });

    const toggleBtn = screen.getByText('Workflow Status').closest('.glass-card')?.querySelector('button');
    expect(toggleBtn).toBeDefined();
    fireEvent.click(toggleBtn!);

    // Click save to trigger API call
    const saveBtn = screen.getByText('Save Changes');
    fireEvent.click(saveBtn);

    await waitFor(() => {
       expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('/workflow-configs/'), expect.objectContaining({
         method: 'PATCH'
       }));
    });
  });

  it('can add a new stage and save', async () => {
    render(<WorkflowsPage />, { wrapper: AllProviders });
    await waitFor(() => {
      expect(screen.getByText('LEAVE')).toBeInTheDocument();
    }, { timeout: 15000 });

    const addBtn = screen.getByText('Add Approval Level');
    fireEvent.click(addBtn);

    // Wait for new stage to appear
    await waitFor(() => {
      const inputs = screen.getAllByDisplayValue(/Stage/i);
      expect(inputs.length).toBeGreaterThan(0);
    });

    const saveBtn = screen.getByText('Save Changes');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/workflow-stages', expect.objectContaining({
        method: 'POST'
      }));
      expect(toast.success).toHaveBeenCalledWith('Workflow updated successfully');
    }, { timeout: 15000 });
  });

  it('can remove a stage', async () => {
    render(<WorkflowsPage />, { wrapper: AllProviders });
    await waitFor(() => {
       expect(screen.getByText('LEAVE')).toBeInTheDocument();
    }, { timeout: 15000 });

    // Add a stage first so we can remove it
    fireEvent.click(screen.getByText('Add Approval Level'));
    
    let stagesBefore = 0;
    await waitFor(() => {
      const stages = screen.getAllByDisplayValue(/Stage/i);
      expect(stages.length).toBeGreaterThan(0);
      stagesBefore = stages.length;
    });

    const deleteBtns = document.querySelectorAll('button svg.lucide-trash2');
    expect(deleteBtns.length).toBeGreaterThan(0);
    fireEvent.click(deleteBtns[deleteBtns.length - 1].parentElement!);

    await waitFor(() => {
      const stagesAfter = screen.queryAllByDisplayValue(/Stage/i).length;
      expect(stagesAfter).toBe(stagesBefore - 1);
    });
  });

  it('handles save error gracefully', async () => {
    render(<WorkflowsPage />, { wrapper: AllProviders });
    await waitFor(() => screen.getByText('LEAVE'), { timeout: 15000 });

    (apiFetch as any).mockImplementation((endpoint: string, options: any) => {
      if (options?.method === 'PATCH' || options?.method === 'POST') return Promise.reject(new Error('Save Failed'));
      return vi.importActual('@/lib/api').then((mod: any) => mod.apiFetch(endpoint, options));
    });

    const saveBtn = screen.getByText('Save Changes');
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Failed to save workflow'));
    });
  });

  it('handles initial fetch errors gracefully', async () => {
    (apiFetch as any).mockImplementation((endpoint: string, options: any) => {
      if (endpoint === '/workflow-configs') return Promise.reject(new Error('Fetch Failed'));
      return vi.importActual('@/lib/api').then((mod: any) => mod.apiFetch(endpoint, options));
    });
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<WorkflowsPage />, { wrapper: AllProviders });
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalled();
    });
    consoleSpy.mockRestore();
  });
});
