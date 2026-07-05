import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AttendancePage from '../app/[locale]/attendance/page';
import { NextIntlClientProvider } from 'next-intl';
import React from 'react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

// Mock next-intl
vi.mock('next-intl', async (importOriginal) => {
  const actual = (await importOriginal()) as any;
  return {
    ...actual,
    useTranslations: vi.fn(() => (key: string) => key),
  };
});

// Mock DashboardLayout
vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock apiFetch
vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock AuthContext
let mockUser: any = {
  id: 1,
  fullname: 'Admin User',
  is_staff: true,
};

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
  }),
}));

// Mock TenantContext
vi.mock('@/context/TenantContext', () => ({
  useTenant: () => ({
    attendancePlatformPolicy: 'BOTH',
  }),
}));

describe('AttendancePage - Check Absences Unit Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: 1, fullname: 'Admin User', is_staff: true };
    // Default mock implementation for fetching attendance list
    (apiFetch as any).mockImplementation((url: string) => {
      if (url.startsWith('/attendance/')) {
        return Promise.resolve([]);
      }
      return Promise.resolve({});
    });
  });

  it('renders Check Missed Check-ins button for admin', async () => {
    mockUser = { id: 1, fullname: 'Admin User', is_staff: true };

    render(
      <NextIntlClientProvider locale='en' messages={{}}>
        <AttendancePage />
      </NextIntlClientProvider>,
    );

    const btn = screen.queryByText('Check Missed Check-ins');
    expect(btn).toBeInTheDocument();
  });

  it('does not render Check Missed Check-ins button for non-admin', async () => {
    mockUser = { id: 2, fullname: 'Regular Worker', is_staff: false };

    render(
      <NextIntlClientProvider locale='en' messages={{}}>
        <AttendancePage />
      </NextIntlClientProvider>,
    );

    const btn = screen.queryByText('Check Missed Check-ins');
    expect(btn).not.toBeInTheDocument();
  });

  it('triggers handleCheckAbsences API call and triggers toast success on click', async () => {
    mockUser = { id: 1, fullname: 'Admin User', is_staff: true };
    (apiFetch as any).mockImplementation((url: string, options: any) => {
      if (url === '/attendance/check-absences/' && options?.method === 'POST') {
        return Promise.resolve({ status: 'success', result: 'Completed absence checking. Marked 2 records as ABSENT.' });
      }
      return Promise.resolve([]);
    });

    render(
      <NextIntlClientProvider locale='en' messages={{}}>
        <AttendancePage />
      </NextIntlClientProvider>,
    );

    const btn = screen.getByText('Check Missed Check-ins');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/attendance/check-absences/', expect.objectContaining({
        method: 'POST',
        body: expect.any(String),
      }));
      expect(toast.success).toHaveBeenCalledWith('Completed absence checking. Marked 2 records as ABSENT.');
    });
  });
});
