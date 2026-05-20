import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import Home from '@/app/[locale]/page';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { apiFetch } from '@/lib/api';

// Mock dependencies
vi.mock('@/context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/context/TenantContext', () => ({
  useTenant: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: any) => <div data-testid="dashboard-layout">{children}</div>,
}));

vi.mock('@/components/layout/PublicLayout', () => ({
  PublicLayout: ({ children }: any) => <div data-testid="public-layout">{children}</div>,
}));

// Mock dynamic AttendanceChart to prevent chart rendering issues in tests
vi.mock('@/components/dashboard/AttendanceChart', () => ({
  default: () => <div data-testid="attendance-chart">Attendance Chart Mock</div>,
}));

// Mock QuotaUsageCard
vi.mock('@/components/dashboard/QuotaUsageCard', () => ({
  default: () => <div data-testid="quota-usage-card">Quota Usage Card Mock</div>,
}));

// Mock StatCard
vi.mock('@/components/dashboard/StatCard', () => ({
  default: ({ name, value }: any) => (
    <div data-testid="stat-card">
      <span className="stat-name">{name}</span>
      <span className="stat-value">{value}</span>
    </div>
  ),
}));

describe('Overview Dashboard Pages Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Tenant Admin Dashboard when not global admin', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: 1, fullname: 'John Doe', is_staff: false, permissions: { tenant_manage_hr: true } },
      loading: false,
    });
    (useTenant as any).mockReturnValue({
      isPublic: false,
    });
    vi.mocked(apiFetch).mockResolvedValue({
      total_employees: 15,
      attendance_today: { present: 12 },
      pending_leaves: 3,
      new_hires: 2,
      trends: { attendance: [] }
    });

    render(<Home />);

    await waitFor(() => {
      // Should show the welcome message
      expect(screen.getByText(/welcome/i)).toBeInTheDocument();
      // Should render the regular Stat Cards using translation keys/fallbacks
      expect(screen.getByText(/stats.total_employees/i)).toBeInTheDocument();
      expect(screen.getByText(/stats.today_attendance/i)).toBeInTheDocument();
      // Should render Quota Usage card
      expect(screen.getByTestId('quota-usage-card')).toBeInTheDocument();
      // Should NOT render superadmin overview text
      expect(screen.queryByText(/SaaS Platform Overview/i)).toBeNull();
    });
  });

  it('renders SaaS Platform Superadmin Dashboard when is_global_admin_dashboard is true', async () => {
    (useAuth as any).mockReturnValue({
      user: { id: 2, fullname: 'Super Administrator', is_staff: true, global_role: 'SUPERADMIN' },
      loading: false,
    });
    (useTenant as any).mockReturnValue({
      isPublic: true,
    });
    vi.mocked(apiFetch).mockResolvedValue({
      is_global_admin_dashboard: true,
      total_tenants: 12,
      pending_registrations: 4,
      approved_registrations: 25,
      total_global_admins: 3,
      rejected_registrations: 2
    });

    render(<Home />);

    await waitFor(() => {
      // Should show SaaS Platform Overview elements
      expect(screen.getByText('SaaS Platform Overview')).toBeInTheDocument();
      expect(screen.getByText('Platform Overview Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/operational summary/i)).toBeInTheDocument();

      // Should render the Stat Cards with SaaS metrics
      expect(screen.getByText('Total Tenants')).toBeInTheDocument();
      expect(screen.getByText('Pending Registrations')).toBeInTheDocument();
      expect(screen.getByText('Approved Registrations')).toBeInTheDocument();
      expect(screen.getByText('Global Admins')).toBeInTheDocument();

      // Verify the value rendering (use getAllByText as some numbers appear multiple times)
      expect(screen.getAllByText('12').length).toBeGreaterThan(0);
      expect(screen.getAllByText('4').length).toBeGreaterThan(0);
      expect(screen.getAllByText('25').length).toBeGreaterThan(0);
      expect(screen.getAllByText('3').length).toBeGreaterThan(0);

      // Should show status section and quick action links
      expect(screen.getByText('Registration Verification Status')).toBeInTheDocument();
      expect(screen.getByText('Pending Requests')).toBeInTheDocument();
      expect(screen.getByText('Approved Requests')).toBeInTheDocument();
      expect(screen.getByText('Rejected Requests')).toBeInTheDocument();
      expect(screen.getByText('Review Pending Registrations')).toBeInTheDocument();
      expect(screen.getByText('Manage Global Administrators')).toBeInTheDocument();

      // QuotaUsageCard & Attendance trends should NOT be rendered
      expect(screen.queryByTestId('quota-usage-card')).toBeNull();
      expect(screen.queryByText('Attendance Trends')).toBeNull();
    });
  });
});
