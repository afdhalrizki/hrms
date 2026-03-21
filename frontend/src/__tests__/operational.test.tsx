import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AuditLogsPage from '../app/[locale]/settings/audit-logs/page';
import ApiKeysPage from '../app/[locale]/settings/api-keys/page';
import { apiFetch } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn(),
  getBaseUrl: vi.fn(() => 'http://localhost:8000/api'),
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
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('Operational Clarity (Phase 65)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Audit Logs page', async () => {
    (apiFetch as any).mockResolvedValue([
      {
        id: 1,
        action_type: 'UPDATE',
        model_name: 'Employee',
        object_id: '1',
        changed_fields: { salary: { old: '5000', new: '6000' } },
        actor_name: 'Admin',
        ip_address: '127.0.0.1',
        timestamp: new Date().toISOString()
      }
    ]);

    render(<AuditLogsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/Employee/i)).toBeDefined();
      expect(screen.getByText(/UPDATE/i)).toBeDefined();
    });
  });

  it('renders API Keys page', async () => {
    (apiFetch as any).mockResolvedValue([
      {
        id: 1,
        label: 'ERP Sync',
        key_prefix: 'abcd',
        expires_at: null,
        last_used_at: null,
        is_active: true,
        created_at: new Date().toISOString()
      }
    ]);

    render(<ApiKeysPage />);
    
    await waitFor(() => {
      expect(screen.getByText(/ERP Sync/i)).toBeDefined();
      expect(screen.getByText(/abcd/i)).toBeDefined();
    });
  });
});
