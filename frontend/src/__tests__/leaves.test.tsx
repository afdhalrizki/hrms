import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LeavesPage from '../app/[locale]/leaves/page';
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

describe('LeavesPage', () => {
  const mockBalances = [
    { year: 2026, total_days: '12.0', used_days: '2.0', remaining_days: '10.0' }
  ];
  const mockRequests = [
    { id: 1, leave_type: 'CUTI', start_date: '2026-03-01', end_date: '2026-03-02', reason: 'Vacation', status: 'APPROVED' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (apiFetch as any).mockImplementation((endpoint: string) => {
      if (endpoint === '/leave-balances/') return Promise.resolve(mockBalances);
      if (endpoint === '/leave-requests/') return Promise.resolve(mockRequests);
      return Promise.resolve([]);
    });
  });

  it('renders leave balances and history list', async () => {
    render(<LeavesPage />);
    
    await waitFor(() => {
      expect(screen.getByText('10')).toBeDefined(); // Remaining days
      expect(screen.getByText('Vacation')).toBeDefined(); // History reason
    });
  });

  it('opens and submits leave request modal', async () => {
    render(<LeavesPage />);
    
    const requestBtn = screen.getByText('requestLeave');
    fireEvent.click(requestBtn);
    
    expect(screen.getByText('form.type')).toBeDefined();
    
    const submitBtn = screen.getByText('submit');
    fireEvent.click(submitBtn);
    
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/leave-requests/', expect.objectContaining({
        method: 'POST'
      }));
    });
  });
});
