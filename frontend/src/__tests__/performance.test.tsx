import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PerformancePage from '../app/[locale]/performance/page';
import { loginAs } from './setup';
import { AuthProvider } from '@/context/AuthContext';
import { NextIntlClientProvider } from 'next-intl';
import { TenantProvider } from '@/context/TenantContext';
import { apiFetch } from '@/lib/api';

// Mock next-intl but include the provider using the factory argument
vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useTranslations: vi.fn(() => (key: string) => key),
  };
});

// Mock apiFetch to allow both real requests and mocked responses
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    apiFetch: vi.fn((...args) => actual.apiFetch(...args)),
  };
});

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
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

// Mock TenantContext so we can override it in specific tests without doMock
let mockTenantContextValues: any = null;
vi.mock('@/context/TenantContext', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useTenant: () => {
      if (mockTenantContextValues) return mockTenantContextValues;
      // Fallback to real logic if possible, or just default values suitable for integrated tests
      return {
        enabledModules: ['performance', 'core', 'attendance', 'payroll'],
        planType: 'ENTERPRISE',
      };
    }
  };
});

const AllProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <NextIntlClientProvider locale="en" messages={{}}>
      <TenantProvider>
        <AuthProvider>{children}</AuthProvider>
      </TenantProvider>
    </NextIntlClientProvider>
  );
};

describe('PerformancePage (Integrated)', () => {
  beforeAll(async () => {
    // Login as employee1@company1.com
    await loginAs('employee1@company1.com');
  }, 20000);

  beforeEach(() => {
    vi.clearAllMocks();
    mockTenantContextValues = null;
    // Reset apiFetch to its actual integrated implementation
    (apiFetch as any).mockImplementation(async (...args: any[]) => {
      const actual = await vi.importActual('@/lib/api') as any;
      return actual.apiFetch(...args);
    });
  });

  it('renders KPI targets and appraisals from real backend', async () => {
    render(<PerformancePage />, { wrapper: AllProviders });
    
    await waitFor(() => {
      expect(screen.getByText(/Sales Target/i)).toBeInTheDocument();
      // Use getAllByText because Q1 2026 appears in the header badge AND the table row
      expect(screen.getAllByText(/Q1 2026/i).length).toBeGreaterThanOrEqual(1);
    }, { timeout: 25000 });
  }, 35000);

  it('handles empty states', async () => {
    (apiFetch as any).mockImplementation(() => Promise.resolve([]));
    
    render(<PerformancePage />, { wrapper: AllProviders });
    
    await waitFor(() => {
      expect(screen.getByText(/noTargets/i)).toBeInTheDocument();
      expect(screen.getByText(/noAppraisals/i)).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  it('handles appraisals with no reviews gracefully', async () => {
    (apiFetch as any).mockImplementation((endpoint: string) => {
      if (endpoint === '/appraisals') {
        return Promise.resolve([{
          id: 1, 
          period_name: 'Annual Review 2026', 
          start_date: '2026-01-01', 
          end_date: '2026-12-31', 
          status: 'SUBMITTED', 
          reviews: [] // NO REVIEWS
        }]);
      }
      return Promise.resolve([]);
    });

    render(<PerformancePage />, { wrapper: AllProviders });
    
    await waitFor(() => {
      expect(screen.getByText('No Reviews')).toBeInTheDocument();
    }, { timeout: 15000 });
  }, 20000);

  it('opens modal on button click', async () => {
    // To ensure the button renders quickly without depending on real network latency, 
    // we can mock it here too, but since we want integration, we'll let it use real API.
    render(<PerformancePage />, { wrapper: AllProviders });
    
    const btn = await screen.findByTestId(/submit-review-btn/i, {}, { timeout: 20000 });
    fireEvent.click(btn);
    
    await waitFor(() => {
      expect(screen.getByTestId('mock-modal')).toBeInTheDocument();
    });

    const closeBtn = screen.getByTestId('modal-close');
    fireEvent.click(closeBtn);
    
    await waitFor(() => {
      expect(screen.queryByTestId('mock-modal')).not.toBeInTheDocument();
    });
  }, 30000);

  it('renders nothing if module is disabled', async () => {
    mockTenantContextValues = { enabledModules: [] };
    const res = render(<PerformancePage />, { wrapper: AllProviders });
    expect(res.container.firstChild).toBeNull();
  });

  it('calculates average score correctly', async () => {
    (apiFetch as any).mockImplementation((endpoint: string) => {
      if (endpoint === '/appraisals') {
        return Promise.resolve([{
          id: 1, 
          period_name: 'Annual Review 2026', 
          status: 'SUBMITTED', 
          reviews: [
             { id: 1, reviewer_type: 'SELF', reviewer_name: 'Self', ratings: { kpi1: 4, kpi2: 5 }, comments: 'Good' }
          ]
        }]);
      }
      return Promise.resolve([]);
    });

    render(<PerformancePage />, { wrapper: AllProviders });
    
    await waitFor(() => {
      expect(screen.getByText('4.5')).toBeInTheDocument();
    }, { timeout: 15000 });
  }, 20000);
});
