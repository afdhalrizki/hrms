import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApiKeysPage from '@/app/[locale]/settings/api-keys/page';
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

vi.mock('@/components/settings/CreateApiKeyModal', () => ({
  CreateApiKeyModal: ({ onClose }: any) => <div data-testid="create-api-key-modal">CreateApiKeyModal</div>,
}));

describe('ApiKeysPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
  });

  it('shows key list and handles delete + refresh', async () => {
    (apiFetch as any)
      .mockResolvedValueOnce([
        { id: 1, label: 'ERP Sync', key_prefix: 'abcd', expires_at: null, last_used_at: null, is_active: true, created_at: '2025-01-01T00:00:00Z' }
      ])
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce([]);

    render(<ApiKeysPage />);

    await waitFor(() => {
      expect(screen.getByText(/ERP Sync/i)).toBeDefined();
      expect(screen.getByText(/abcd/i)).toBeDefined();
    });

    const card = screen.getByText(/ERP Sync/i).closest('.glass-card');
    expect(card).toBeTruthy();
    const deleteButton = within(card!).getByRole('button');
    expect(deleteButton).toBeTruthy();
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenNthCalledWith(2, '/api-keys/1', { method: 'DELETE' });
      expect(apiFetch).toHaveBeenNthCalledWith(3, '/api-keys');
    });
  });

  it('renders empty state when no keys', async () => {
    (apiFetch as any).mockResolvedValueOnce([]);
    render(<ApiKeysPage />);

    expect(await screen.findByText(/empty/i)).toBeDefined();
  });

  it('opens CreateApiKeyModal when button is clicked', async () => {
    (apiFetch as any).mockResolvedValueOnce([]);
    render(<ApiKeysPage />);

    expect(await screen.findByText(/empty/i)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /newKey/i }));
    expect(screen.getByTestId('create-api-key-modal')).toBeDefined();
  });
});