import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AttendancePage from '../app/[locale]/attendance/page';
import { loginAs } from './setup';
import { AuthProvider } from '@/context/AuthContext';
import { NextIntlClientProvider } from 'next-intl';
import { apiFetch } from '@/lib/api';
const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

vi.mock('sonner', () => ({
  toast: mockToast,
}));

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
    getBaseUrl: vi.fn(() => 'http://localhost:8000/api'),
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
  beforeAll(async () => {
    // Login as employee1@company1.com who has seeded attendance data
    await loginAs('employee1@company1.com');
  }, 20000);

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset apiFetch to its actual integrated implementation
    (apiFetch as any).mockImplementation(async (...args: any[]) => {
      const actual = await vi.importActual('@/lib/api') as any;
      return actual.apiFetch(...args);
    });
  });

  it('renders loading state initially', () => {
    // We can delay apiFetch to guarantee we see the loading state
    (apiFetch as any).mockImplementationOnce(() => new Promise((resolve) => setTimeout(() => resolve([]), 100)));
    render(<AttendancePage />, { wrapper: AllProviders });
    const loading = screen.queryByText(/Loading attendance data.../i);
    expect(loading).toBeDefined();
  });

  it('renders attendance logs and stats successfully from real backend', async () => {
    render(<AttendancePage />, { wrapper: AllProviders });

    // Seeded data has 'Employee One'
    await waitFor(() => {
      // Use getAllByText because 'Employee One' might appear in multiple rows if seeded multiple times
      expect(screen.getAllByText(/Employee One/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('PRESENT')).toBeInTheDocument();
      expect(screen.getByText('LIVENESS')).toBeInTheDocument();
    }, { timeout: 15000 });
  }, 20000);

  it('handles empty state', async () => {
    // Mock the API specifically for this scenario
    (apiFetch as any).mockResolvedValueOnce([]);
    render(<AttendancePage />, { wrapper: AllProviders });

    await waitFor(() => {
      expect(screen.getByText('No attendance logs found')).toBeInTheDocument();
    });
  });

  it('performs Check Out correctly when today log exists', async () => {
    // employee1 already has a Check In for today (seeded)
    render(<AttendancePage />, { wrapper: AllProviders });

    // Wait for the Check Out button to appear
    const checkOutBtn = await screen.findByText(/checkOut/i, {}, { timeout: 15000 });
    expect(checkOutBtn).toBeInTheDocument();

    fireEvent.click(checkOutBtn);

    // After clicking, verify the API is called
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
        method: 'PATCH'
      }));
    }, { timeout: 15000 });
  }, 20000);

  it('performs Check In correctly when no today log exists', async () => {
    // Since seed_test_db seeds a check-in for today, we must mock the API to return empty for today
    // so the Check In button appears.
    const mockDate = new Date().toISOString().split('T')[0];
    const mockLogs = [{
      id: 99,
      employee_name: 'Employee One',
      date: '2020-01-01', // Old log
      check_in: '10:00',
      check_out: '18:00',
      status: 'LATE',
      liveness_verified: false,
      verification_method: 'MANUAL'
    }];
    
    (apiFetch as any).mockImplementation((endpoint: string, options: any) => {
      if (options?.method === 'POST') return Promise.resolve({ id: 100 });
      return Promise.resolve(mockLogs);
    });

    render(<AttendancePage />, { wrapper: AllProviders });

    await waitFor(() => {
      expect(screen.getByText('checkIn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('checkIn'));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/attendance', expect.objectContaining({
        method: 'POST'
      }));
    });
  });

  it('opens correction modal when button is clicked', async () => {
    render(<AttendancePage />, { wrapper: AllProviders });

    const correctionBtns = await screen.findAllByText(/Request Correction/i, {}, { timeout: 15000 });
    fireEvent.click(correctionBtns[0]);
    
    await waitFor(() => {
      expect(screen.getByTestId('correction-modal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Close'));
    await waitFor(() => {
      expect(screen.queryByTestId('correction-modal')).not.toBeInTheDocument();
    });
  }, 20000);

  it('handles fetch error gracefully', async () => {
    (apiFetch as any).mockRejectedValue(new Error('Fetch Error'));
    render(<AttendancePage />, { wrapper: AllProviders });
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Failed to fetch attendance logs');
    });
  });

  it('handles clock action error gracefully', async () => {
    (apiFetch as any).mockResolvedValueOnce([]);
    render(<AttendancePage />, { wrapper: AllProviders });

    const checkInBtn = await screen.findByText('checkIn', {}, { timeout: 15000 });
    await waitFor(() => {
      expect(screen.getByText('checkIn')).toBeInTheDocument();
    });

    (apiFetch as any).mockRejectedValue(new Error('Network Error'));
    fireEvent.click(screen.getByText('checkIn'));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Network Error');
    });
  });

  it('handles clock action error with default message', async () => {
    (apiFetch as any).mockResolvedValueOnce([]);
    render(<AttendancePage />, { wrapper: AllProviders });
    
    
    await waitFor(() => expect(screen.getByText('checkIn')).toBeInTheDocument());

    // Mock error with no message
    (apiFetch as any).mockImplementationOnce(() => Promise.reject({}));
    fireEvent.click(screen.getByText('checkIn'));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Action failed');
    });
  });

  it('handles biometric verification failure (400 Bad Request)', async () => {
    (apiFetch as any).mockResolvedValueOnce([]); // No today log
    render(<AttendancePage />, { wrapper: AllProviders });
    
    await waitFor(() => expect(screen.getByText('checkIn')).toBeInTheDocument());

    // Mock 400 error from backend for face mismatch
    (apiFetch as any).mockImplementationOnce(() => Promise.reject({ 
      message: 'Face verification failed: Identity mismatch detected' 
    }));
    
    fireEvent.click(screen.getByText('checkIn'));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Face verification failed: Identity mismatch detected');
    });
  });

  it('handles geofencing violation (403 Forbidden)', async () => {
    (apiFetch as any).mockResolvedValueOnce([]); // No today log
    render(<AttendancePage />, { wrapper: AllProviders });
    
    await waitFor(() => expect(screen.getByText('checkIn')).toBeInTheDocument());

    // Mock 403 error for being outside the geofence
    (apiFetch as any).mockImplementationOnce(() => Promise.reject({ 
      message: 'Clock-in blocked: You are outside the designated work area' 
    }));
    
    fireEvent.click(screen.getByText('checkIn'));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Clock-in blocked: You are outside the designated work area');
    });
  });
});
