import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AnalyticsPage from '../app/[locale]/analytics/page';
import { apiFetch, getBaseUrl } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  apiDownload: vi.fn(),
  getBaseUrl: vi.fn(() => 'http://localhost:8000/api'),
}));

vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => (key: string) => key),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ 
    user: { id: 1, fullname: 'Admin', is_staff: true }, 
    loading: false 
  }),
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe('AnalyticsPage', () => {
  const mockStats = {
    total_employees: 150,
    attendance_today: [{ status: 'PRESENT', count: 140 }],
    department_distribution: [
      { name: 'Engineering', employee_count: 50 },
      { name: 'Sales', employee_count: 40 },
    ],
    payroll_summary: {
      total_net_pay: 500000000,
      total_overtime: 15000000,
    },
    trends: {
      months: ['Jan', 'Feb', 'Mar'],
      headcount: [140, 145, 150],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (apiFetch as any).mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<AnalyticsPage />);
    expect(screen.getByText('loading')).toBeDefined();
  });

  it('renders dashboard metrics successfully', async () => {
    (apiFetch as any).mockResolvedValue(mockStats);
    
    render(<AnalyticsPage />);
    
    await waitFor(() => {
      // API call completed
      expect(apiFetch).toHaveBeenCalledWith('/core/dashboard-stats/');
    });

    // KPI validations
    expect(screen.getAllByText('150')[0]).toBeDefined(); // headcount
    expect(screen.getAllByText('Rp 500,000,000')[0]).toBeDefined(); // net pay
    expect(screen.getAllByText('Rp 15,000,000')[0]).toBeDefined(); // overtime pay

    // Chart and distribution
    expect(screen.getByText('Engineering')).toBeDefined();
    expect(screen.getByText('50 staff')).toBeDefined();
    expect(screen.getByText('Jan')).toBeDefined();
  });

  it('handles API error gracefully', async () => {
    (apiFetch as any).mockRejectedValue(new Error('API Down'));
    const { toast } = await import('sonner');
    
    render(<AnalyticsPage />);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load dashboard metrics');
    });
  });

  it('calls export functions correctly', async () => {
    const { apiDownload } = await import('@/lib/api');
    (apiFetch as any).mockResolvedValue(mockStats);
    
    render(<AnalyticsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('exportAttendance')).toBeDefined();
    });

    fireEvent.click(screen.getByText('exportAttendance'));
    await waitFor(() => {
      expect(apiDownload).toHaveBeenCalledWith(
        expect.stringContaining('/attendance/attendance/export_csv/'),
        expect.stringContaining('Attendance_Recap')
      );
    });

    fireEvent.click(screen.getByText('exportPerformance'));
    await waitFor(() => {
      expect(apiDownload).toHaveBeenCalledWith(
        expect.stringContaining('/appraisals/export_csv/'),
        expect.stringContaining('Performance_Recap')
      );
    });
  });
});
