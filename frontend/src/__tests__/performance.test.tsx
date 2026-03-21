import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('PerformancePage (Phase 66)', () => {
  const mockTargets = [
    { id: 1, kpi_name: 'Productivity', target_value: 100, actual_value: 85, period: 'March 2026' }
  ];

  const mockAppraisals = [
    {
      id: 1,
      employee_name: 'John Doe',
      period_name: 'Q1 2026',
      status: 'SUBMITTED',
      start_date: '2026-01-01',
      end_date: '2026-03-31',
      reviews: [
        { id: 10, reviewer_type: 'SELF', ratings: { quality: 4 }, comments: 'Good' }
      ]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (apiFetch as any).mockImplementation((endpoint: string) => {
      if (endpoint === '/performance/kpi-targets/') return Promise.resolve(mockTargets);
      if (endpoint === '/performance/appraisals/') return Promise.resolve(mockAppraisals);
      return Promise.resolve([]);
    });
  });

  it('renders KPI progress and appraisal history', async () => {
    render(<PerformancePage />);
    
    // Use findBy for async robustness
    const kpiName = await screen.findByText(/Productivity/i);
    expect(kpiName).toBeDefined();
    
    const percentage = await screen.findByText(/85%/i);
    expect(percentage).toBeDefined();

    const period = await screen.findByText(/Q1 2026/i);
    expect(period).toBeDefined();
  });

  it('calculates and displays average score', async () => {
    render(<PerformancePage />);
    
    const score = await screen.findByText(/4.0/i);
    expect(score).toBeDefined();
  });
});
