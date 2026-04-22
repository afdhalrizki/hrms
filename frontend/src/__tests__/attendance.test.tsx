import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AttendancePage from '../app/[locale]/attendance/page';
import { AuthProvider } from '@/context/AuthContext';
import { NextIntlClientProvider } from 'next-intl';

// Hoisted mocks for stable environment and shared state
const { mockToast, mockApiFetch, mockUseTenant } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  mockApiFetch: vi.fn(),
  mockUseTenant: vi.fn(() => ({
    attendancePlatformPolicy: 'BOTH',
    tenantName: 'Company 1',
    isLoading: false,
  })),
}));

vi.mock('sonner', () => ({
  toast: mockToast,
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    apiFetch: mockApiFetch,
    getBaseUrl: vi.fn(() => 'http://localhost:8000/api'),
  };
});

vi.mock('@/context/TenantContext', () => ({
  useTenant: mockUseTenant,
  TenantProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock('next-intl', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    useTranslations: vi.fn(() => (key: string) => key),
  };
});

vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/components/attendance/CorrectionRequestModal', () => ({
  CorrectionRequestModal: ({ isOpen, onClose, attendance }: any) => 
    isOpen ? (
      <div data-testid="correction-modal">
        Modal for {attendance?.employee_name}
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

const AllProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <NextIntlClientProvider locale="en" messages={{}}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </NextIntlClientProvider>
  );
};

describe('AttendancePage (Integrated)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default apiFetch implementation (Environment mock)
    mockApiFetch.mockImplementation(async (endpoint: string) => {
      if (endpoint === '/users/me') return { id: 1, fullname: 'Test User', role: 'EMPLOYEE' };
      if (endpoint === '/attendance') return [];
      return {};
    });

    // Mock geolocation
    const geolocationMock = {
      getCurrentPosition: vi.fn().mockImplementation((success) => {
        success({ coords: { latitude: -6.2, longitude: 106.8 } });
      }),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    };
    Object.defineProperty(window.navigator, 'geolocation', {
      value: geolocationMock,
      configurable: true,
      writable: true,
    });
  });

  it('renders loading state initially', () => {
    mockApiFetch.mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve([]), 100)));
    render(<AttendancePage />, { wrapper: AllProviders });
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it('renders attendance logs and stats successfully from real backend', async () => {
    mockApiFetch.mockResolvedValueOnce([
      {
        id: 1,
        employee_name: 'Employee One',
        date: new Date().toLocaleDateString('en-CA'),
        check_in: '09:00',
        check_out: null,
        status: 'PRESENT',
        liveness_verified: true,
        verification_method: 'LIVENESS'
      }
    ]);

    render(<AttendancePage />, { wrapper: AllProviders });

    await waitFor(() => {
      expect(screen.getAllByText(/Employee One/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('PRESENT')).toBeInTheDocument();
    });
  });

  it('handles empty state successfully', async () => {
    mockApiFetch.mockResolvedValueOnce([]);
    render(<AttendancePage />, { wrapper: AllProviders });
    const btn = await screen.findByTestId('clock-btn', {}, { timeout: 15000 });
    expect(btn).toHaveTextContent('checkIn');
  });

  it('performs Check Out correctly when today log exists', async () => {
    const today = new Date().toLocaleDateString('en-CA');
    mockApiFetch.mockResolvedValueOnce([
      {
        id: 1,
        employee_name: 'Employee One',
        date: today,
        check_in: '09:00',
        check_out: null,
        status: 'PRESENT',
        liveness_verified: true,
        verification_method: 'LIVENESS'
      }
    ]);

    render(<AttendancePage />, { wrapper: AllProviders });

    const btn = await screen.findByText('checkOut');
    fireEvent.click(screen.getByTestId('clock-btn'));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith(expect.stringContaining('/attendance/1'), expect.objectContaining({
        method: 'PATCH'
      }));
    });
  });

  it('performs Check In correctly when no today log exists', async () => {
    mockApiFetch.mockResolvedValueOnce([]);
    render(<AttendancePage />, { wrapper: AllProviders });

    await screen.findByText('checkIn');
    fireEvent.click(screen.getByTestId('clock-btn'));

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/attendance', expect.objectContaining({
        method: 'POST'
      }));
    });
  });

  it('opens correction modal when button is clicked', async () => {
    mockApiFetch.mockResolvedValueOnce([{
        id: 1,
        employee_name: 'Employee One',
        date: '2020-01-01',
        check_in: '09:00',
        check_out: '17:00',
        status: 'PRESENT',
        liveness_verified: true,
        verification_method: 'LIVENESS'
    }]);

    render(<AttendancePage />, { wrapper: AllProviders });

    const correctionBtns = await screen.findAllByText(/Request Correction/i);
    fireEvent.click(correctionBtns[0]);
    
    await screen.findByTestId('correction-modal');

    fireEvent.click(screen.getByText('Close'));
    await waitFor(() => {
      expect(screen.queryByTestId('correction-modal')).not.toBeInTheDocument();
    });
  });

  it('handles fetch error gracefully', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Fetch Error'));
    render(<AttendancePage />, { wrapper: AllProviders });
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('Failed to fetch attendance logs'));
  });

  it('handles clock action error gracefully', async () => {
    render(<AttendancePage />, { wrapper: AllProviders });
    await screen.findByTestId('clock-btn');

    mockApiFetch.mockRejectedValueOnce(new Error('Network Error'));
    fireEvent.click(screen.getByTestId('clock-btn'));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('Network Error'));
  });

  it('handles clock action error with default message', async () => {
    render(<AttendancePage />, { wrapper: AllProviders });
    await screen.findByTestId('clock-btn');

    mockApiFetch.mockRejectedValueOnce({});
    fireEvent.click(screen.getByTestId('clock-btn'));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('Action failed'));
  });

  it('handles biometric verification failure (400 Bad Request)', async () => {
    render(<AttendancePage />, { wrapper: AllProviders });
    await screen.findByTestId('clock-btn');

    mockApiFetch.mockRejectedValueOnce({ message: 'Identity mismatch detected' });
    fireEvent.click(screen.getByTestId('clock-btn'));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('Identity mismatch detected'));
  });

  it('handles geofencing violation (403 Forbidden)', async () => {
    render(<AttendancePage />, { wrapper: AllProviders });
    await screen.findByTestId('clock-btn');

    mockApiFetch.mockRejectedValueOnce({ message: 'Outside work area' });
    fireEvent.click(screen.getByTestId('clock-btn'));

    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith('Outside work area'));
  });

  it('restricts Clock In button when policy is MOBILE', async () => {
    mockUseTenant.mockReturnValue({
      attendancePlatformPolicy: 'MOBILE',
      tenantName: 'Company 1',
      isLoading: false,
    });

    render(<AttendancePage />, { wrapper: AllProviders });

    await waitFor(() => {
      const restrictedBtn = screen.getByText(/Mobile Only/i);
      expect(restrictedBtn).toBeDisabled();
    });
  });
});
