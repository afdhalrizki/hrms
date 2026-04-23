import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import RegistrationsPage from '@/app/[locale]/admin/registrations/page';
import * as api from '@/lib/api';

// Mock Layout because it uses Sidebar and other stuff we don't need for logic test
vi.mock('@/components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  getBaseUrl: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockRequests = [
  {
    id: 1,
    company_name: 'Pending Corp',
    subdomain_prefix: 'pending',
    admin_email: 'admin@pending.com',
    status: 'PENDING',
    created_at: '2026-03-16T00:00:00Z',
  },
  {
    id: 2,
    company_name: 'Approved Inc',
    subdomain_prefix: 'approved',
    admin_email: 'admin@approved.com',
    status: 'APPROVED',
    created_at: '2026-03-16T00:00:00Z',
  }
];

describe('RegistrationsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.apiFetch).mockResolvedValue(mockRequests);
  });

  it('renders registration requests list', async () => {
    render(<RegistrationsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Pending Corp')).toBeDefined();
      expect(screen.getByText('Approved Inc')).toBeDefined();
      expect(screen.getAllByText('PENDING').length).toBeGreaterThan(0);
      expect(screen.getAllByText('APPROVED').length).toBeGreaterThan(0);
    });
  });

  it('calls approval API when Approve button is clicked', async () => {
    render(<RegistrationsPage />);
    
    await waitFor(() => screen.getByText('Approve'));
    
    const approveBtn = screen.getByText('Approve');
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(api.apiFetch).toHaveBeenCalledWith('/internal/registrations/1/approve', {
        method: 'POST',
      });
    });
  });

  it('calls rejection API when Reject button is clicked', async () => {
    render(<RegistrationsPage />);
    
    await waitFor(() => screen.getByText('Reject'));
    
    const rejectBtn = screen.getByText('Reject');
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(api.apiFetch).toHaveBeenCalledWith('/internal/registrations/1/reject', {
        method: 'POST',
      });
    });
  });

  it('updates status in UI after Approve click and refresh', async () => {
    let callCount = 0;
    vi.mocked(api.apiFetch).mockImplementation(async (endpoint: string, opts?: any) => {
      if (endpoint === '/internal/registrations') {
        callCount += 1;
        if (callCount === 1) {
          return mockRequests;
        }
        return [
          { ...mockRequests[0], status: 'APPROVED' },
          mockRequests[1],
        ];
      }
      if (endpoint === '/internal/registrations/1/approve') {
        return {};
      }
      return [];
    });

    render(<RegistrationsPage />);

    await waitFor(() => screen.getByText('Pending Corp'));

    fireEvent.click(screen.getAllByText('Approve')[0]);

    await waitFor(() => {
      expect(api.apiFetch).toHaveBeenCalledWith('/internal/registrations/1/approve', { method: 'POST' });
    });

    await waitFor(() => {
      expect(screen.getAllByText('APPROVED').length).toBeGreaterThanOrEqual(2);
    });
  });
});
