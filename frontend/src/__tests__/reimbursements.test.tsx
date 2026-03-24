import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReimbursementsPage from '../app/[locale]/reimbursements/page';
import { apiFetch } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  getBaseUrl: vi.fn(() => 'http://localhost:8000/api'),
}));

vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => (key: string) => key),
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

vi.mock('sonner', () => ({
  toast: mockToast,
}));

describe('ReimbursementsPage', () => {
  const mockCategories = [
    { id: 1, name: 'Transport', max_amount: '500000.00' }
  ];
  const mockClaims = [
    { id: 1, category: { name: 'Transport' }, date: '2026-03-20', amount: '150000.00', status: 'PENDING', description: 'Uber to office' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (apiFetch as any).mockImplementation((endpoint: string, options?: any) => {
      if (endpoint === '/reimbursement-categories') return Promise.resolve(mockCategories);
      if (endpoint === '/reimbursements' && (!options || options.method === 'GET')) return Promise.resolve(mockClaims);
      if (endpoint === '/reimbursements' && options?.method === 'POST') return Promise.resolve({ id: 99 });
      return Promise.resolve([]);
    });
  });

  it('renders reimbursement stats and history', async () => {
    render(<ReimbursementsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Uber to office/i)).toBeInTheDocument();
    });
    
    expect(screen.getAllByText(/IDR/i)).toBeDefined();
  });

  it('handles empty claims and categories', async () => {
    (apiFetch as any).mockImplementation((endpoint: string) => {
       if (endpoint === '/reimbursement-categories') return Promise.resolve([]);
       if (endpoint === '/reimbursements') return Promise.resolve([]);
       return Promise.resolve([]);
    });
    render(<ReimbursementsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/No claims found/i)).toBeInTheDocument();
    });
  });

  it('handles API fetch error', async () => {
    (apiFetch as any).mockRejectedValue(new Error('Fetch failed'));
    render(<ReimbursementsPage />);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled();
    });
  });

  it('submits a new claim with FormData and attachment', async () => {
    const { container } = render(<ReimbursementsPage />);
    
    await waitFor(() => screen.getByText('newClaim'));
    fireEvent.click(screen.getByText('newClaim'));
    
    const categorySelect = await screen.findByLabelText(/form.category/i) as HTMLSelectElement;
    fireEvent.change(categorySelect, { target: { value: '1' } });

    const amountInput = screen.getByLabelText(/form.amount/i);
    fireEvent.change(amountInput, { target: { value: '200000' } });
    
    const descInput = screen.getByLabelText(/form.description/i);
    fireEvent.change(descInput, { target: { value: 'Dinner' } });
    
    const file = new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' });
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Use fireEvent.submit on the form directly
    const form = container.querySelector('form');
    if (form) {
      fireEvent.submit(form);
    } else {
      fireEvent.click(screen.getByText('submit'));
    }
    
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/reimbursements', expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData)
      }));
    });

    const postCall = (apiFetch as any).mock.calls.find((call: any) => call[0] === '/reimbursements' && call[1]?.method === 'POST');
    const sentFormData = postCall[1].body;
    expect(sentFormData.get('amount')).toBe('200000');
  });

  it('handles submission error', async () => {
    (apiFetch as any).mockImplementation((endpoint: string, options: any) => {
      if (endpoint === '/reimbursements' && options?.method === 'POST') return Promise.reject(new Error('Invalid amount'));
      if (endpoint === '/reimbursement-categories') return Promise.resolve(mockCategories);
      if (endpoint === '/reimbursements') return Promise.resolve(mockClaims);
      return Promise.resolve([]);
    });

    const { container } = render(<ReimbursementsPage />);
    
    await waitFor(() => screen.getByText('newClaim'));
    fireEvent.click(screen.getByText('newClaim'));
    
    const categorySelect = await screen.findByLabelText(/form.category/i) as HTMLSelectElement;
    fireEvent.change(categorySelect, { target: { value: '1' } });
    
    const amountInput = screen.getByLabelText(/form.amount/i);
    fireEvent.change(amountInput, { target: { value: '200000' } });

    const form = container.querySelector('form');
    if (form) {
      fireEvent.submit(form);
    } else {
      fireEvent.click(screen.getByText('submit'));
    }
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled();
    });
  });
});
