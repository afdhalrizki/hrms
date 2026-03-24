import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { CorrectionRequestModal } from '@/components/attendance/CorrectionRequestModal';
import { Attendance } from '@/types/core';

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

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockAttendance: Attendance = {
  id: 'att-123',
  employee: 'emp-456',
  employee_name: 'John Doe',
  date: '2026-03-21',
  check_in: '08:00:00',
  check_out: '17:00:00',
  status: 'PRESENT',
  is_out_of_bounds: false,
};

describe('CorrectionRequestModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when open', () => {
    render(
      <CorrectionRequestModal
        isOpen={true}
        onClose={() => {}}
        attendance={mockAttendance}
        onSuccess={() => {}}
      />
    );

    expect(screen.getAllByText(/requestTitle/i)[0]).toBeInTheDocument();
  });

  it('validates that reason is required', async () => {
    const { container } = render(
      <CorrectionRequestModal
        isOpen={true}
        onClose={() => {}}
        attendance={mockAttendance}
        onSuccess={() => {}}
      />
    );

    // Using fireEvent.submit directly on the form
    const form = container.querySelector('form');
    if (!form) throw new Error('Form not found');
    
    fireEvent.submit(form);

    expect(mockToast.error).toHaveBeenCalledWith('reasonRequired');
    expect(mockApiFetch).not.toHaveBeenCalled();
  });

  it('submits form with correct data', async () => {
    mockApiFetch.mockResolvedValueOnce({ id: 'req-1' });
    const onSuccess = vi.fn();

    const { container } = render(
      <CorrectionRequestModal
        isOpen={true}
        onClose={() => {}}
        attendance={mockAttendance}
        onSuccess={onSuccess}
      />
    );

    const reasonInput = screen.getByPlaceholderText(/reasonLabel/i);
    fireEvent.change(reasonInput, { target: { value: 'Forgot to check out yesterday' } });

    const form = container.querySelector('form');
    if (!form) throw new Error('Form not found');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/attendance-correction-requests', expect.anything());
    });

    expect(mockToast.success).toHaveBeenCalledWith('success');
    expect(onSuccess).toHaveBeenCalled();
  });
});
