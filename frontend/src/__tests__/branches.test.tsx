import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import BranchesPage from '../app/[locale]/branches/page';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('BranchesPage', () => {
  const mockBranches = [
    {
      id: "1",
      name: "Jakarta HQ",
      address: "Jl. Sudirman No 1",
      latitude: -6.2,
      longitude: 106.8,
      radius_meters: 100,
      timezone: "Asia/Jakarta"
    },
    {
      id: "2",
      name: "Bali Office",
      address: "Jl. Sunset Road",
      latitude: -8.6,
      longitude: 115.2,
      radius_meters: 200,
      timezone: "Asia/Makassar"
    }
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    (apiFetch as any).mockImplementation((endpoint: string) => {
      if (endpoint === '/branches') return Promise.resolve([]);
      return Promise.resolve({});
    });
    // Default confirmation to true for delete
    if (typeof window !== 'undefined' && !window.confirm) {
      window.confirm = vi.fn();
    }
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  it('renders loading state initially', () => {
    (apiFetch as any).mockImplementation(() => new Promise(() => {}));
    render(<BranchesPage />);
    expect(screen.getByText('Loading location data...')).toBeDefined();
  });

  it('renders branches list successfully', async () => {
    (apiFetch as any).mockResolvedValue(mockBranches);
    render(<BranchesPage />);

    await waitFor(() => {
      expect(screen.getByText('Jakarta HQ')).toBeDefined();
      expect(screen.getByText('Bali Office')).toBeDefined();
    });

    expect(screen.getByText('2')).toBeDefined(); // Total Branches count
  });

  it('handles search filter', async () => {
    (apiFetch as any).mockResolvedValue(mockBranches);
    render(<BranchesPage />);

    await waitFor(() => {
      expect(screen.getByText('Jakarta HQ')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Search branches/i);
    fireEvent.change(searchInput, { target: { value: 'Bali' } });

    await waitFor(() => {
      expect(screen.queryByText('Jakarta HQ')).toBeNull();
      expect(screen.getByText('Bali Office')).toBeDefined();
    });
  });

  it('handles empty state', async () => {
    (apiFetch as any).mockResolvedValue([]);
    render(<BranchesPage />);

    await waitFor(() => {
      expect(screen.getByText('No branches found')).toBeDefined();
    });
  });

  it('opens modal to add new branch and submits', async () => {
    (apiFetch as any).mockResolvedValue(mockBranches);
    render(<BranchesPage />);

    await waitFor(() => {
      expect(screen.getByText('Add Branch')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Add Branch'));

    await waitFor(() => {
      expect(screen.getByText('Add New Branch')).toBeDefined();
    });

    // Submit form
    (apiFetch as any).mockResolvedValueOnce({}); // Mocks post response
    (apiFetch as any).mockResolvedValueOnce([...mockBranches, { id: '3', name: 'New Branch', address: '', latitude: 0, longitude: 0, radius_meters: 100, timezone: 'Asia/Jakarta' }]); // Mocks fetchBranches again

    const submitBtn = screen.getByText('Create Branch');
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/branches', expect.objectContaining({ method: 'POST' }));
    });
  });

  it('opens modal to edit branch and submits', async () => {
    (apiFetch as any).mockResolvedValue(mockBranches);
    const { container } = render(<BranchesPage />);

    await waitFor(() => {
      expect(screen.getByText('Jakarta HQ')).toBeDefined();
    });

    const editBtn = container.querySelector('.lucide-pen')?.closest('button');
    expect(editBtn).toBeDefined();
    fireEvent.click(editBtn!);

    await waitFor(() => {
      expect(screen.getByText('Edit Branch')).toBeDefined();
    });

    // Mock API patch and reload
    (apiFetch as any).mockResolvedValueOnce({});
    (apiFetch as any).mockResolvedValueOnce(mockBranches);

    const submitBtn = screen.getByText('Save Changes');
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/branches/1', expect.objectContaining({ method: 'PATCH' }));
    });
  });

  it('deletes a branch after confirmation', async () => {
    (apiFetch as any).mockResolvedValue(mockBranches);
    const { container } = render(<BranchesPage />);

    await waitFor(() => {
      expect(screen.getByText('Jakarta HQ')).toBeDefined();
    });

    const deleteBtn = container.querySelector('.lucide-trash2')?.closest('button');
    expect(deleteBtn).toBeDefined();

    (apiFetch as any).mockResolvedValueOnce({}); // DELETE ok
    (apiFetch as any).mockResolvedValueOnce([mockBranches[1]]); // Reload ok

    fireEvent.click(deleteBtn!);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(apiFetch).toHaveBeenCalledWith('/branches/1', { method: 'DELETE' });
    });
  });

  it('handles fetch error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (apiFetch as any).mockRejectedValueOnce(new Error('Fetch Failed'));
    render(<BranchesPage />);
    await waitFor(() => {
      expect(screen.getByText('Branches')).toBeDefined();
    });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('handles save error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (apiFetch as any).mockResolvedValue(mockBranches); 
    render(<BranchesPage />);
    await screen.findByText('Add Branch');
    fireEvent.click(screen.getByText('Add Branch'));
    
    (apiFetch as any).mockRejectedValueOnce(new Error('Save Failed'));
    fireEvent.submit(screen.getByText('Create Branch').closest('form')!);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to save branch');
      expect(screen.getByText('Add New Branch')).toBeDefined(); // Modal stays open
    });
    consoleSpy.mockRestore();
  });

  it('handles delete error gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (apiFetch as any).mockResolvedValue(mockBranches);
    const { container } = render(<BranchesPage />);
    await screen.findByText('Jakarta HQ');
    
    (apiFetch as any).mockRejectedValueOnce(new Error('Delete Failed'));
    const deleteBtn = container.querySelector('.lucide-trash2')?.closest('button');
    fireEvent.click(deleteBtn!);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to delete branch');
    });
    consoleSpy.mockRestore();
  });

  it('closes modal correctly', async () => {
    render(<BranchesPage />);
    await screen.findByText('Add Branch');
    fireEvent.click(screen.getByText('Add Branch'));
    
    expect(screen.getByText('Add New Branch')).toBeDefined();
    
    // The button is a sibling of the div containing the title
    const closeBtn = screen.getByText('Add New Branch').parentElement?.parentElement?.querySelector('button');
    fireEvent.click(closeBtn!);
    
    await waitFor(() => {
      expect(screen.queryByText('Add New Branch')).toBeNull();
    });
  });

  it('closes modal using background or cancel button', async () => {
    (apiFetch as any).mockResolvedValue(mockBranches);
    const { container } = render(<BranchesPage />);
    await screen.findByText('Add Branch');
    
    // Test background click (line 211)
    fireEvent.click(screen.getByText('Add Branch'));
    const background = container.querySelector('.bg-black\\/60');
    fireEvent.click(background!);
    await waitFor(() => expect(screen.queryByText('Add New Branch')).toBeNull());

    // Test Cancel button (line 309)
    fireEvent.click(screen.getByText('Add Branch'));
    const cancelBtn = screen.getByText('Cancel');
    fireEvent.click(cancelBtn);
    await waitFor(() => expect(screen.queryByText('Add New Branch')).toBeNull());
  });

  it('does not delete branch when confirmation is cancelled', async () => {
    (apiFetch as any).mockResolvedValue(mockBranches);
    const { container } = render(<BranchesPage />);
    await screen.findByText('Jakarta HQ');
    
    // Mock confirmation to return false
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    
    const deleteBtn = container.querySelector('.lucide-trash2')?.closest('button');
    fireEvent.click(deleteBtn!);
    
    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(apiFetch).not.toHaveBeenCalledWith('/branches/1', { method: 'DELETE' });
    });
  });

  it('displays empty state when search matches nothing', async () => {
    (apiFetch as any).mockResolvedValue(mockBranches);
    render(<BranchesPage />);
    await screen.findByText('Jakarta HQ');

    const searchInput = screen.getByPlaceholderText(/Search branches/i);
    fireEvent.change(searchInput, { target: { value: 'Non-existent Branch' } });

    await waitFor(() => {
      expect(screen.queryByText('Jakarta HQ')).toBeNull();
      expect(screen.getByText('No branches found')).toBeDefined();
    });
  });
});
