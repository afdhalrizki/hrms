import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AttendancePage from '../app/[locale]/attendance/page';
import { apiFetch } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
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
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  },
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

describe('AttendancePage', () => {
  const mockDate = new Date().toISOString().split('T')[0];
  
  const mockLogs = [
    {
      id: 1,
      employee_name: 'John Doe',
      date: mockDate,
      check_in: '09:00',
      check_out: null,
      status: 'PRESENT',
      liveness_verified: true,
      verification_method: 'BIOMETRIC'
    },
    {
      id: 2,
      employee_name: 'Jane Smith',
      date: '2023-01-01',
      check_in: '10:00',
      check_out: '18:00',
      status: 'LATE',
      liveness_verified: false,
      verification_method: 'MANUAL'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (apiFetch as any).mockImplementation(() => new Promise(() => {})); 
    render(<AttendancePage />);
    expect(screen.getByText('Loading attendance data...')).toBeDefined();
  });

  it('renders attendance logs and stats successfully', async () => {
    (apiFetch as any).mockResolvedValue(mockLogs);
    render(<AttendancePage />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeDefined();
      expect(screen.getByText('Jane Smith')).toBeDefined();
    });

    // Stats tests
    expect(screen.getByText('50%')).toBeDefined(); // successRate
    expect(screen.getAllByText('1')[0]).toBeDefined(); // lateCheckins
  });

  it('handles empty state', async () => {
    (apiFetch as any).mockResolvedValue([]);
    render(<AttendancePage />);

    await waitFor(() => {
      expect(screen.getByText('No attendance logs found')).toBeDefined();
    });
  });

  it('performs Check Out correctly when today log exists', async () => {
    (apiFetch as any).mockResolvedValue(mockLogs);
    render(<AttendancePage />);

    await waitFor(() => {
      expect(screen.getByText('checkOut')).toBeDefined();
    });

    (apiFetch as any).mockResolvedValueOnce({ ...mockLogs[0], check_out: '17:00' });
    fireEvent.click(screen.getByText('checkOut'));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/attendance/1', expect.objectContaining({
        method: 'PATCH'
      }));
    });
  });

  it('performs Check In correctly when no today log exists', async () => {
    (apiFetch as any).mockResolvedValue([mockLogs[1]]); // Only old log
    render(<AttendancePage />);

    await waitFor(() => {
      expect(screen.getByText('checkIn')).toBeDefined();
    });

    (apiFetch as any).mockResolvedValueOnce({ ...mockLogs[1], id: 3, check_in: '08:00', date: mockDate });
    fireEvent.click(screen.getByText('checkIn'));

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/attendance', expect.objectContaining({
        method: 'POST'
      }));
    });
  });

  it('opens correction modal when button is clicked', async () => {
    (apiFetch as any).mockResolvedValue(mockLogs);
    render(<AttendancePage />);

    await waitFor(() => {
      expect(screen.getAllByText('Request Correction').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getAllByText('Request Correction')[0]);
    
    await waitFor(() => {
      expect(screen.getByTestId('correction-modal')).toBeDefined();
    });

    fireEvent.click(screen.getByText('Close'));
    await waitFor(() => {
      expect(screen.queryByTestId('correction-modal')).toBeNull();
    });
  });

  it('handles fetch error gracefully', async () => {
    (apiFetch as any).mockRejectedValue(new Error('Fetch Error'));
    const { toast } = await import('sonner');
    render(<AttendancePage />);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to fetch attendance logs');
    });
  });

  it('handles clock action error gracefully', async () => {
    (apiFetch as any).mockResolvedValue([]);
    const { toast } = await import('sonner');
    render(<AttendancePage />);
    
    await waitFor(() => {
      expect(screen.getByText('checkIn')).toBeDefined();
    });

    (apiFetch as any).mockRejectedValue(new Error('Network Error'));
    fireEvent.click(screen.getByText('checkIn'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Network Error');
    });
  });

  it('handles clock action error with default message', async () => {
    (apiFetch as any).mockResolvedValue([]);
    const { toast } = await import('sonner');
    render(<AttendancePage />);
    
    await waitFor(() => expect(screen.getByText('checkIn')).toBeDefined());

    // Mock error with no message
    (apiFetch as any).mockImplementationOnce(() => Promise.reject({}));
    fireEvent.click(screen.getByText('checkIn'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Action failed');
    });
  });
});
