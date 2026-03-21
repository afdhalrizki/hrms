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

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
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
    (apiFetch as any).mockImplementation((endpoint: string) => {
      if (endpoint === '/reimbursement/reimbursement-categories/') return Promise.resolve(mockCategories);
      if (endpoint === '/reimbursement/reimbursements/') return Promise.resolve(mockClaims);
      return Promise.resolve([]);
    });
  });

  it('renders reimbursement stats and history', async () => {
    render(<ReimbursementsPage />);
    
    // Check for "Uber to office" to ensure data is loaded
    await waitFor(() => {
      expect(screen.getByText(/Uber to office/i)).toBeDefined();
    }, { timeout: 5000 });
    
    // Check for IDR prefix at least
    expect(screen.getAllByText(/IDR/i)).toBeDefined();
  });

  it('submits a new claim with FormData', async () => {
    render(<ReimbursementsPage />);
    
    await waitFor(() => screen.getByText('newClaim'));
    fireEvent.click(screen.getByText('newClaim'));
    
    // Fill form using IDs
    const amountInput = await screen.findByLabelText(/form.amount/i);
    fireEvent.change(amountInput, { target: { value: '200000' } });
    
    const descInput = await screen.findByLabelText(/form.description/i);
    fireEvent.change(descInput, { target: { value: 'Dinner' } });
    
    const submitBtn = screen.getByText('submit');
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/reimbursement/reimbursements/', expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData)
      }));
    });
  });
});
