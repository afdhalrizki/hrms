import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { CorrectionRequestList } from '@/components/attendance/CorrectionRequestList';
import { AttendanceCorrectionRequest } from '@/types/core';

// Use vi.hoisted to ensure mocks are available for hoisted vi.mock calls
const { mockToast, mockApiFetch } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  mockApiFetch: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: mockToast,
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    apiFetch: mockApiFetch,
  };
});

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockRequests: AttendanceCorrectionRequest[] = [
  {
    id: 'req-1',
    attendance: 'att-1',
    attendance_date: '2026-03-20',
    employee: 'emp-1',
    employee_name: 'John Doe',
    requested_check_in: '09:00:00',
    requested_check_out: '18:00:00',
    reason: 'Forgot check-in',
    status: 'PENDING',
    created_at: new Date().toISOString(),
  }
];

describe('CorrectionRequestList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Prompt mock
    vi.stubGlobal('prompt', vi.fn().mockReturnValue('LGTM'));
  });

  it('renders a list of requests correctly', () => {
    render(<CorrectionRequestList requests={mockRequests} />);
    expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
    expect(screen.getByText(/Forgot check-in/i)).toBeInTheDocument();
  });

  it('shows empty state when no requests', () => {
    render(<CorrectionRequestList requests={[]} />);
    expect(screen.getByText(/No correction requests found/i)).toBeInTheDocument();
  });

  it('handles approval action', async () => {
    mockApiFetch.mockResolvedValueOnce({ id: 'req-1', status: 'APPROVED' });
    const onAction = vi.fn();

    render(<CorrectionRequestList requests={mockRequests} isAdmin={true} onAction={onAction} />);

    const approveButton = screen.getByText(/Approve/i);
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalled();
    });

    expect(mockToast.success).toHaveBeenCalled();
    expect(onAction).toHaveBeenCalled();
  });
});
