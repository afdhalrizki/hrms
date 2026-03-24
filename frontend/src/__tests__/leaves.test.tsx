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

const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

vi.mock('sonner', () => ({
  toast: mockToast,
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
      if (endpoint.includes('leave-balances')) return Promise.resolve(mockBalances);
      if (endpoint.includes('leave-requests')) return Promise.resolve(mockRequests);
      return Promise.resolve([]);
    });
  });

  it('renders leave balances and history list', async () => {
    render(<LeavesPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('remaining-days-value')).toHaveTextContent('10');
      expect(screen.getByText('Vacation')).toBeDefined(); // History reason
    });
  });

  it('handles empty leave balances and history', async () => {
    (apiFetch as any).mockImplementation((endpoint: string) => {
      if (endpoint === '/leave-balances') return Promise.resolve([]);
      if (endpoint === '/leave-requests') return Promise.resolve([]);
      return Promise.resolve([]);
    });

    render(<LeavesPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/No leave balance records found/i)).toBeInTheDocument();
      expect(screen.getByText(/No leave history found/i)).toBeInTheDocument();
    });
  });

  it('handles API fetch error gracefully', async () => {
    (apiFetch as any).mockRejectedValue(new Error('Network error'));
    render(<LeavesPage />);
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to load leave data');
    });
  });

  it('opens and submits leave request modal', async () => {
    render(<LeavesPage />);
    
    fireEvent.click(screen.getByText('requestLeave'));
    
    const reasonInput = screen.getByLabelText(/form.reason/i);
    fireEvent.change(reasonInput, { target: { value: 'Personal matters' } });

    fireEvent.click(screen.getByText('submit'));
    
    await waitFor(() => {
      const calls = (apiFetch as any).mock.calls;
      console.log('API CALLS:', JSON.stringify(calls.map((c: any) => c[0])));
      const postCall = calls.find((c: any) => c[0] === '/leave-requests' && c[1]?.method === 'POST');
      expect(postCall).toBeDefined();
      const body = JSON.parse(postCall[1].body);
      expect(body.leave_type).toBe('CUTI');
      expect(body.reason).toBe('Personal matters');
    });
  });

  it('handles submission error', async () => {
    (apiFetch as any).mockImplementation((endpoint: string, options: any) => {
      if (options?.method === 'POST') return Promise.reject(new Error('Quota exceeded'));
      if (endpoint === '/leave-balances') return Promise.resolve(mockBalances);
      if (endpoint === '/leave-requests') return Promise.resolve(mockRequests);
      return Promise.resolve([]);
    });

    render(<LeavesPage />);
    
    fireEvent.click(screen.getByText('requestLeave'));
    
    const reasonInput = screen.getByLabelText(/form.reason/i);
    fireEvent.change(reasonInput, { target: { value: 'Personal matters' } }); // Fill reason to enable submission

    fireEvent.click(screen.getByText('submit'));
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Quota exceeded');
    });
  });
});
