import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PerformancePage from '../app/[locale]/performance/page';
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

vi.mock('@/components/shared/FeatureGuard', () => ({
  FeatureGuard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/context/TenantContext', () => ({
  useTenant: vi.fn(() => ({
    enabledModules: ['performance', 'core', 'attendance', 'payroll'],
    planType: 'ENTERPRISE',
  })),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/performance/AppraisalReviewModal', () => ({
  AppraisalReviewModal: ({ appraisalId, onClose, onSuccess }: any) => (
    <div data-testid="mock-modal">
      Modal for {appraisalId}
      <button data-testid="modal-close" onClick={onClose}>Close</button>
      <button data-testid="modal-success" onClick={onSuccess}>Success</button>
    </div>
  )
}));

describe('PerformancePage', () => {
  const mockTargets = [
    { id: 1, title: 'Revenue Growth', target_value: '10M', weight: 40, status: 'IN_PROGRESS' }
  ];
  const mockAppraisals = [
    { 
      id: 1, 
      period_name: 'Annual Review 2026', 
      start_date: '2026-01-01', 
      end_date: '2026-12-31', 
      status: 'SUBMITTED', 
      reviews: [] 
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (apiFetch as any).mockImplementation((endpoint: string) => {
      if (endpoint === '/kpi-targets/') return Promise.resolve(mockTargets);
      if (endpoint === '/appraisals/') return Promise.resolve(mockAppraisals);
      return Promise.resolve([]);
    });
  });

  it('renders KPI targets and appraisals', async () => {
    render(<PerformancePage />);
    
    await waitFor(() => {
      expect(screen.getByText('Revenue Growth')).toBeInTheDocument();
      expect(screen.getByText('Annual Review 2026')).toBeInTheDocument();
    });
  });

  it('handles empty states', async () => {
    (apiFetch as any).mockResolvedValue([]);
    render(<PerformancePage />);
    
    await waitFor(() => {
      expect(screen.getByText(/noTargets/i)).toBeInTheDocument();
      expect(screen.getByText(/noAppraisals/i)).toBeInTheDocument();
    });
  });

  it('opens modal on button click', async () => {
    render(<PerformancePage />);
    
    const btn = await screen.findByTestId('submit-review-btn-1');
    fireEvent.click(btn);
    
    await waitFor(() => {
      expect(screen.getByTestId('mock-modal')).toBeInTheDocument();
    });
  });
});
